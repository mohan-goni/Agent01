import { type NextRequest, NextResponse } from "next/server"
import { saveUserArticle, removeUserArticle } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { userId, articleId } = await request.json()

    if (!userId || !articleId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing userId or articleId",
        },
        { status: 400 },
      )
    }

    const result = await saveUserArticle(userId, articleId)

    return NextResponse.json({
      success: true,
      saved: !!result,
    })
  } catch (error) {
    console.error("Save article error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save article",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, articleId } = await request.json()

    if (!userId || !articleId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing userId or articleId",
        },
        { status: 400 },
      )
    }

    const result = await removeUserArticle(userId, articleId)

    return NextResponse.json({
      success: true,
      removed: !!result,
    })
  } catch (error) {
    console.error("Remove article error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to remove article",
      },
      { status: 500 },
    )
  }
}
