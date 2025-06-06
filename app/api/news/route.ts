import { type NextRequest, NextResponse } from "next/server"
import { NewsService } from "@/lib/news-service"
import { AIService } from "@/lib/ai-service"
import { saveArticle, getArticles } from "@/lib/database"

const newsService = new NewsService()
const aiService = new AIService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || "market intelligence"
    const refresh = searchParams.get("refresh") === "true"

    let articles

    if (refresh) {
      // Fetch fresh articles from APIs
      console.log("Fetching fresh articles from APIs...")
      const freshArticles = await newsService.aggregateNews(query)

      // Save and process articles
      const processedArticles = []
      for (const article of freshArticles) {
        try {
          const savedArticle = await saveArticle(article)
          if (savedArticle) {
            const analysis = await aiService.analyzeArticle(article)
            processedArticles.push({
              ...savedArticle,
              analysis,
            })
          }
        } catch (error) {
          console.error("Error processing article:", error)
          processedArticles.push(article)
        }
      }
      articles = processedArticles
    } else {
      // Get articles from database
      articles = await getArticles(50)
    }

    return NextResponse.json({
      success: true,
      articles,
      total: articles.length,
      source: refresh ? "api" : "database",
    })
  } catch (error) {
    console.error("News API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch news",
      },
      { status: 500 },
    )
  }
}
