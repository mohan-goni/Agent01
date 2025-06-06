import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.gemini_api_key!)

export class AIService {
  private model = genAI.getGenerativeModel({ model: "gemini-pro" })

  async analyzeArticle(article: any) {
    try {
      const prompt = `
        Analyze this news article and provide:
        1. Sentiment score (-1 to 1)
        2. Key insights
        3. Market implications
        4. Summary (max 200 words)
        
        Article: ${article.title}
        Content: ${article.description}
        
        Respond in JSON format with: sentiment, insights, implications, summary
      `

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      try {
        return JSON.parse(text)
      } catch {
        return {
          sentiment: 0,
          insights: "Analysis unavailable",
          implications: "No implications identified",
          summary: article.description?.substring(0, 200) || "No summary available",
        }
      }
    } catch (error) {
      console.error("AI analysis error:", error)
      return null
    }
  }

  async generateMarketInsight(articles: any[]) {
    try {
      const articlesText = articles.map((a) => `${a.title}: ${a.description}`).join("\n\n")

      const prompt = `
        Based on these recent news articles, generate a comprehensive market intelligence insight:
        
        ${articlesText}
        
        Provide:
        1. Overall market sentiment
        2. Key trends identified
        3. Potential opportunities
        4. Risk factors
        5. Actionable recommendations
        
        Format as a professional market intelligence report.
      `

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } catch (error) {
      console.error("Market insight generation error:", error)
      return "Unable to generate market insight at this time."
    }
  }
}
