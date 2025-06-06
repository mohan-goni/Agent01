"use server";

import { getArticles, getInsights, getDatabaseStats, saveArticle } from "@/lib/db";
import { NewsService } from "@/lib/news-service";
import { AIService } from "@/lib/ai-service";
// Import sample data and functions for seeding if they are not directly in this file
// For seedSampleDataAction, we'll replicate the logic from the /api/seed route.

const newsService = new NewsService();
const aiService = new AIService();

export async function getDashboardDataAction() {
  try {
    const articles = await getArticles(20); // Get latest 20 articles
    const insights = await getInsights(5);  // Get latest 5 insights
    const stats = await getDatabaseStats();
    return { success: true, articles, insights, stats };
  } catch (error) {
    console.error("Error in getDashboardDataAction:", error);
    return { success: false, error: "Failed to fetch dashboard data.", articles: [], insights: [], stats: {articles: 0, insights: 0, users: 0} };
  }
}

export async function refreshDashboardDataAction(query = "market intelligence") {
  console.log("Server Action: Refreshing dashboard data for query:", query);
  try {
    // 1. Fetch fresh articles from external APIs
    const freshArticles = await newsService.aggregateNews(query);
    console.log(`Fetched ${freshArticles.length} fresh articles from NewsService.`);

    // 2. Save and process articles (including AI analysis)
    for (const rawArticle of freshArticles) {
      try {
        const articleForInitialSave = {
          title: rawArticle.title,
          url: rawArticle.url,
          content: rawArticle.content,
          source: rawArticle.source,
          publishedAt: rawArticle.publishedAt,
          description: rawArticle.description,
          author: rawArticle.author,
          category: rawArticle.category,
        };
        const initialSavedArticle = await saveArticle(articleForInitialSave);

        if (initialSavedArticle && initialSavedArticle.url) {
          const analysis = await aiService.analyzeArticle(rawArticle);
          const articleWithAI = {
            ...initialSavedArticle,
            sentimentScore: analysis.sentimentScore !== undefined ? analysis.sentimentScore : initialSavedArticle.sentimentScore,
            aiSummary: analysis.summary !== undefined ? analysis.summary : initialSavedArticle.aiSummary,
            keywords: analysis.keywords !== undefined ? analysis.keywords : initialSavedArticle.keywords,
            url: initialSavedArticle.url, // Ensure URL is passed for conflict update
          };
          await saveArticle(articleWithAI);
          console.log(`Processed and saved article with AI analysis: ${articleWithAI.url}`);
        } else {
          console.warn(`Skipped AI processing for article due to failed initial save: ${rawArticle.url}`);
        }
      } catch (articleError) {
        console.error(`Error processing individual article (URL: ${rawArticle.url}):`, articleError);
      }
    }
    console.log("Finished processing fresh articles.");

    // 3. Re-fetch data from DB to return the latest state
    return await getDashboardDataAction();
  } catch (error) {
    console.error("Error in refreshDashboardDataAction:", error);
    return { success: false, error: "Failed to refresh dashboard data.", articles: [], insights: [], stats: {articles: 0, insights: 0, users: 0} };
  }
}


// Replicating logic from app/api/seed/route.ts
const sampleArticlesData = [
    {
      title: "Global Markets Show Strong Recovery Amid Economic Optimism",
      description: "Stock markets worldwide are experiencing significant gains as investors respond positively to recent economic indicators and policy announcements.",
      content: "Financial markets across the globe are showing remarkable resilience and growth...",
      url: "https://example.com/market-recovery-seed-1", // Unique URL for seed
      source: "Financial Times", author: "Sarah Johnson",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), category: "markets",
      sentimentScore: 0.75, aiSummary: "Global stock markets rallying.", keywords: ["market recovery", "optimism"],
    },
    {
      title: "Tech Sector Leads Innovation Wave with AI Breakthroughs",
      description: "Major technology companies are announcing significant advances in artificial intelligence...",
      content: "The technology sector continues to be at the forefront of innovation...",
      url: "https://example.com/tech-ai-breakthrough-seed-2", // Unique URL for seed
      source: "TechCrunch", author: "Michael Chen",
      publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), category: "technology",
      sentimentScore: 0.85, aiSummary: "AI advancements fueling tech sector.", keywords: ["AI", "tech innovation"],
    },
     {
      title: "Energy Transition Accelerates with Record Renewable Investment",
      description: "Renewable energy investments reach new heights as governments and corporations commit to ambitious sustainability goals.",
      content: "The global energy landscape is undergoing a dramatic transformation...",
      url: "https://example.com/renewable-energy-seed-3", // Unique URL
      source: "Reuters", author: "Emma Rodriguez",
      publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), category: "energy",
      sentimentScore: 0.60, aiSummary: "Renewable energy investment surging.", keywords: ["renewable energy", "sustainability"],
    },
];

export async function seedSampleDataAction() {
  console.log("Server Action: Seeding sample data...");
  let savedCount = 0;
  try {
    for (const article of sampleArticlesData) {
      await saveArticle(article);
      savedCount++;
    }
    console.log(`Successfully seeded ${savedCount} sample articles.`);
    // Note: Market Insights seeding is omitted as saveMarketInsight is not yet in lib/db.ts
    return { success: true, message: `Successfully seeded ${savedCount} sample articles.` };
  } catch (error) {
    console.error("Error in seedSampleDataAction:", error);
    return { success: false, error: "Failed to seed sample data." };
  }
}
