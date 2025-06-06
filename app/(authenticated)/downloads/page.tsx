import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function DownloadsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Downloads</h1>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Coming Soon!</CardTitle>
          <CardDescription>
            Access to Generated Reports and Data Exports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="min-h-[200px] flex flex-col items-center justify-center text-center">
            <p className="text-lg text-muted-foreground mb-2">
              This section is currently under active development.
            </p>
            <p className="text-md text-muted-foreground">
              Soon, you will be able to download generated market reports, competitor analysis summaries,
              and export processed data directly from this page.
            </p>
            {/* <Download className="w-16 h-16 text-gray-300 dark:text-gray-600 mt-4" /> */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
