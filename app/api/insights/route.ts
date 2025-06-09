import { type NextRequest, NextResponse } from "next/server"
import { AIService } from "@/lib/ai-service"
import { getArticles, saveMarketInsight, getInsights } from "@/lib/db"

const aiService = new AIService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const generate = searchParams.get("generate") === "true"

    if (generate) {
      // Generate new insight
      const articles = await getArticles(50)
      const insight = await aiService.generateMarketInsight(articles)

      // Save insight to database
      await saveMarketInsight("Daily Market Analysis", insight, "daily", 0.85)

      return NextResponse.json({
        success: true,
        insight,
        basedOnArticles: articles.length,
        generated: true,
      })
    } else {
      // Get existing insights from database
      const insights = await getInsights(5)

      return NextResponse.json({
        success: true,
        insights,
        generated: false,
      })
    }
  } catch (error) {
    console.error("Insights API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate insights",
      },
      { status: 500 },
    )
  }
}
