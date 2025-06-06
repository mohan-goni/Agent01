import { type NextRequest, NextResponse } from "next/server"
import { NewsService } from "@/lib/news-service"
import { AIService } from "@/lib/ai-service"
import { saveArticle, getArticles } from "@/lib/db" // Updated import path

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
      console.log("Fetching fresh articles from APIs for query:", query)
      const freshArticles = await newsService.aggregateNews(query)
      console.log(`Fetched ${freshArticles.length} fresh articles.`)

      // Save and process articles
      const processedArticles = []
      for (const rawArticle of freshArticles) {
        try {
          // Prepare data for initial save. Some fields might be missing from rawArticle.
          // saveArticle function is designed to handle optional fields.
          const articleForInitialSave = {
            title: rawArticle.title,
            url: rawArticle.url,
            content: rawArticle.content,
            source: rawArticle.source,
            publishedAt: rawArticle.publishedAt,
            description: rawArticle.description,
            author: rawArticle.author,
            category: rawArticle.category,
            // sentimentScore, aiSummary, keywords will be populated/updated after AI analysis
          };

          // Initial save. This will either create a new article or update based on URL conflict.
          // If it updates, it might overwrite fields with undefined if not careful.
          // The saveArticle function in lib/db.ts should handle undefined values gracefully,
          // typically by not setting them in the database or using defaults.
          const initialSavedArticle = await saveArticle(articleForInitialSave);

          if (initialSavedArticle && initialSavedArticle.url) { // Check if article was saved and has a URL
            console.log(`Article initially saved/updated: ${initialSavedArticle.url}`);
            // Perform AI analysis on the original raw article content
            // (or initialSavedArticle if it contains all necessary text).
            // Assuming rawArticle.content or rawArticle.description is what AI service needs.
            const analysis = await aiService.analyzeArticle(rawArticle);
            console.log(`AI Analysis for ${initialSavedArticle.url}:`, analysis);

            // Prepare data for updating the article with AI analysis results.
            // Spread initialSavedArticle to retain fields not overwritten by analysis.
            const articleWithAI = {
              ...initialSavedArticle, // Contains all fields from the initial save (including ID if returned)
              // Overwrite/add AI analysis results:
              // Ensure mapping is correct based on what aiService.analyzeArticle returns.
              sentimentScore: analysis.sentimentScore !== undefined ? analysis.sentimentScore : initialSavedArticle.sentimentScore,
              aiSummary: analysis.summary !== undefined ? analysis.summary : initialSavedArticle.aiSummary, // Assuming analysis.summary maps to aiSummary
              keywords: analysis.keywords !== undefined ? analysis.keywords : initialSavedArticle.keywords,
              // Ensure URL is present for the conflict update logic in saveArticle
              url: initialSavedArticle.url,
            };

            // Update the article with AI analysis results.
            // saveArticle uses onConflictDoUpdate based on URL.
            const updatedArticleWithAI = await saveArticle(articleWithAI);

            processedArticles.push(updatedArticleWithAI || initialSavedArticle);
            console.log(`Article updated with AI data: ${updatedArticleWithAI?.url}`);
          } else if (rawArticle) {
             console.warn(`Initial save failed for article: ${rawArticle.url}, adding raw article to list.`);
             processedArticles.push(rawArticle); // Push raw article as fallback if initial save failed
          }
        } catch (error) {
          console.error(`Error processing article (URL: ${rawArticle.url}):`, error);
          // If there's an error, add the original raw article to the list to avoid losing it
          if (rawArticle) {
            processedArticles.push(rawArticle);
          }
        }
      }
      articles = processedArticles
      console.log("Finished processing all fresh articles.");
    } else {
      // Get articles from database
      console.log("Fetching articles from database...");
      articles = await getArticles(50) // getArticles now returns articles with new (possibly null) fields
      console.log(`Fetched ${articles.length} articles from database.`);
    }

    return NextResponse.json({
      success: true,
      articles,
      total: articles.length,
      source: refresh ? "api" : "database",
    })
  } catch (error: any) { // Added :any for error type
    console.error("News API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch news",
        details: error.message, // Added error message
      },
      { status: 500 },
    )
  }
}
[end of app/api/news/route.ts]
