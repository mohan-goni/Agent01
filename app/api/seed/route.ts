import { NextResponse } from "next/server"
import { saveArticle, saveMarketInsight } from "@/lib/database"

const sampleArticles = [
  {
    title: "Global Markets Show Strong Recovery Amid Economic Optimism",
    description:
      "Stock markets worldwide are experiencing significant gains as investors respond positively to recent economic indicators and policy announcements.",
    content:
      "Financial markets across the globe are showing remarkable resilience and growth, with major indices posting substantial gains over the past week. The positive momentum appears to be driven by a combination of factors including strong corporate earnings, favorable economic data, and renewed investor confidence in the global economic outlook.",
    url: "https://example.com/market-recovery-1",
    source: "Financial Times",
    author: "Sarah Johnson",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    category: "markets",
  },
  {
    title: "Tech Sector Leads Innovation Wave with AI Breakthroughs",
    description:
      "Major technology companies are announcing significant advances in artificial intelligence, driving sector-wide growth and investment opportunities.",
    content:
      "The technology sector continues to be at the forefront of innovation, with several major companies unveiling groundbreaking AI technologies that promise to transform various industries. These developments are attracting substantial investment and creating new market opportunities.",
    url: "https://example.com/tech-ai-breakthrough-2",
    source: "TechCrunch",
    author: "Michael Chen",
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    category: "technology",
  },
  {
    title: "Energy Transition Accelerates with Record Renewable Investment",
    description:
      "Renewable energy investments reach new heights as governments and corporations commit to ambitious sustainability goals.",
    content:
      "The global energy landscape is undergoing a dramatic transformation as renewable energy investments hit record levels. This shift is being driven by both environmental concerns and economic opportunities, with solar and wind power becoming increasingly cost-competitive.",
    url: "https://example.com/renewable-energy-3",
    source: "Reuters",
    author: "Emma Rodriguez",
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    category: "energy",
  },
  {
    title: "Cryptocurrency Market Stabilizes After Recent Volatility",
    description:
      "Digital currencies show signs of stabilization following a period of significant price fluctuations, with institutional adoption continuing to grow.",
    content:
      "The cryptocurrency market appears to be finding its footing after experiencing considerable volatility in recent months. Institutional adoption continues to grow, with several major financial institutions announcing new crypto-related services and investment products.",
    url: "https://example.com/crypto-stability-4",
    source: "CoinDesk",
    author: "David Kim",
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    category: "cryptocurrency",
  },
  {
    title: "Supply Chain Resilience Becomes Key Business Priority",
    description:
      "Companies worldwide are investing heavily in supply chain diversification and resilience strategies to mitigate future disruptions.",
    content:
      "In response to recent global disruptions, businesses across industries are prioritizing supply chain resilience. This includes diversifying supplier networks, investing in technology solutions, and developing more flexible operational models.",
    url: "https://example.com/supply-chain-5",
    source: "Wall Street Journal",
    author: "Lisa Thompson",
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    category: "business",
  },
]

export async function POST() {
  try {
    // Seed articles
    const savedArticles = []
    for (const article of sampleArticles) {
      const saved = await saveArticle(article)
      if (saved) {
        savedArticles.push(saved)
      }
    }

    // Seed market insights
    const sampleInsight = `
Market Analysis Summary - ${new Date().toLocaleDateString()}

Key Trends Identified:
• Global markets showing strong recovery momentum with broad-based gains
• Technology sector leading innovation with significant AI developments
• Energy transition accelerating with record renewable investments
• Cryptocurrency market stabilizing after recent volatility
• Supply chain resilience becoming critical business priority

Market Sentiment: Cautiously Optimistic
The overall market sentiment appears cautiously optimistic, with investors balancing growth opportunities against potential risks. The combination of technological innovation, energy transition, and improved supply chain strategies suggests a positive outlook for the medium term.

Recommendations:
1. Monitor tech sector developments, particularly AI-related investments
2. Consider renewable energy exposure as the transition accelerates
3. Evaluate supply chain resilience in portfolio companies
4. Watch for cryptocurrency institutional adoption trends

Risk Factors:
• Geopolitical tensions could impact global trade
• Interest rate changes may affect market valuations
• Supply chain disruptions remain a concern
• Regulatory changes in key sectors
    `

    const savedInsight = await saveMarketInsight("Daily Market Intelligence Report", sampleInsight, "daily", 0.87)

    return NextResponse.json({
      success: true,
      message: "Sample data seeded successfully",
      data: {
        articles: savedArticles.length,
        insights: savedInsight ? 1 : 0,
      },
    })
  } catch (error) {
    console.error("Seeding error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to seed sample data",
      },
      { status: 500 },
    )
  }
}
