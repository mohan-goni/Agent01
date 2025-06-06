import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from '@/lib/auth'; // Your auth function

// Define allowed base directory within /tmp for security
// On Vercel, writable file system is /tmp. We assume reports are in /tmp/reports1/
const ALLOWED_BASE_DIR = path.resolve('/tmp/reports1');

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.md': return 'text/markdown; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.csv': return 'text/csv; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.log': return 'text/plain; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    console.warn("Download attempt by unauthenticated user.");
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const relativeFilePath = searchParams.get('filePath');

  if (!relativeFilePath) {
    console.warn("Download attempt with missing filePath parameter.");
    return new NextResponse('Missing filePath parameter', { status: 400 });
  }

  // Basic sanitization: remove leading slashes to prevent absolute path interpretation by path.join with /tmp
  // and ensure it's treated as relative to /tmp.
  const sanitizedRelativePath = relativeFilePath.replace(/^[\/\\]+/, '');

  // Construct the absolute path within /tmp
  const requestedFullPath = path.join('/tmp', sanitizedRelativePath);

  // Normalize the path to resolve any '..' components or multiple slashes.
  const normalizedPath = path.normalize(requestedFullPath);

  // Security Check 1: Ensure the normalized path is still within the ALLOWED_BASE_DIR.
  // This check is crucial to prevent directory traversal.
  // path.resolve(ALLOWED_BASE_DIR) is used in case ALLOWED_BASE_DIR itself might be relative in some context (though here it's absolute)
  if (!normalizedPath.startsWith(path.resolve(ALLOWED_BASE_DIR) + path.sep) && normalizedPath !== path.resolve(ALLOWED_BASE_DIR)) {
    // The `+ path.sep` ensures that /tmp/reports1abc is not allowed if /tmp/reports1 is the base.
    // The second condition `normalizedPath !== path.resolve(ALLOWED_BASE_DIR)` allows access to the base dir itself if needed, though unlikely for files.
    console.error(`Access Denied: Path traversal attempt or invalid base directory.
      Requested Relative: ${relativeFilePath}
      Sanitized Relative: ${sanitizedRelativePath}
      Requested Full: ${requestedFullPath}
      Normalized: ${normalizedPath}
      Allowed Base: ${path.resolve(ALLOWED_BASE_DIR)}`);
    return new NextResponse('Invalid file path (outside allowed directory)', { status: 400 });
  }

  // Security Check 2: After normalization, check again for '..' components.
  // This is a redundant check if normalize works perfectly but adds an extra layer.
  // We are checking if '..' is part of any segment of the path *relative to the allowed base*.
  const pathRelativeToAllowedBase = path.relative(path.resolve(ALLOWED_BASE_DIR), normalizedPath);
  if (pathRelativeToAllowedBase.split(path.sep).includes('..')) {
      console.error(`Access Denied: Path still contains '..' relative to allowed base. Relative to base: ${pathRelativeToAllowedBase}`);
      return new NextResponse('Invalid file path (contains ..)', { status: 400 });
  }

  try {
    // Check if file exists and is accessible
    await fs.promises.access(normalizedPath, fs.constants.F_OK | fs.constants.R_OK);

    const stats = await fs.promises.stat(normalizedPath);
    if (!stats.isFile()) {
      console.warn(`Download attempt for a path that is not a file: ${normalizedPath}`);
      return new NextResponse('Path is not a file', { status: 400 });
    }

    const fileContents = await fs.promises.readFile(normalizedPath);
    const filename = path.basename(normalizedPath); // Get the actual filename for Content-Disposition
    const contentType = getContentType(filename);

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', stats.size.toString());

    // For non-image types, or if a 'download' query param is present, force download.
    // Otherwise, for images, let the browser display them inline.
    const downloadQueryParam = searchParams.get('download');
    if (downloadQueryParam === 'true' || !contentType.startsWith('image/')) {
         headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    } else if (contentType.startsWith('image/')) {
        // Allow images to be displayed inline by default
        headers.set('Content-Disposition', `inline; filename="${filename}"`);
    }


    console.info(`Serving file: ${normalizedPath} as Content-Type: ${contentType} with Content-Disposition: ${headers.get('Content-Disposition')}`);
    return new NextResponse(fileContents, { status: 200, headers });

  } catch (error: any) {
    if (error.code === 'ENOENT') {
        console.warn(`File not found at path: ${normalizedPath}`);
        return new NextResponse('File not found', { status: 404 });
    } else if (error.code === 'EACCES') {
        console.error(`Permission denied for path: ${normalizedPath}`);
        return new NextResponse('Access denied', { status: 403 });
    }
    console.error(`File download error for path ${normalizedPath}:`, error);
    return new NextResponse('Internal server error during file access', { status: 500 });
  }
}
