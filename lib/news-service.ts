interface NewsArticle {
  title: string
  description: string
  content: string
  url: string
  source: string
  author: string
  publishedAt: string
  category: string
}

export class NewsService {
  private newsApiKey = process.env.news_api!
  private mediastackKey = process.env.mediastack!
  private gnewsKey = process.env.Gnews!
  private tavilyKey = process.env.tavily!

  async fetchFromNewsAPI(query = "market intelligence", category = "business"): Promise<NewsArticle[]> {
    try {
      const response = await fetch(
        `https://newsapi.org/v2/top-headlines?category=${category}&q=${query}&apiKey=${this.newsApiKey}`,
      )
      const data = await response.json()

      return (
        data.articles?.map((article: any) => ({
          title: article.title,
          description: article.description,
          content: article.content,
          url: article.url,
          source: article.source?.name || "Unknown",
          author: article.author,
          publishedAt: article.publishedAt,
          category: category,
        })) || []
      )
    } catch (error) {
      console.error("NewsAPI error:", error)
      return []
    }
  }

  async fetchFromMediaStack(query = "market intelligence"): Promise<NewsArticle[]> {
    try {
      const response = await fetch(
        `http://api.mediastack.com/v1/news?access_key=${this.mediastackKey}&keywords=${query}&limit=20`,
      )
      const data = await response.json()

      return (
        data.data?.map((article: any) => ({
          title: article.title,
          description: article.description,
          content: article.description, // MediaStack doesn't provide full content
          url: article.url,
          source: article.source,
          author: article.author,
          publishedAt: article.published_at,
          category: article.category || "general",
        })) || []
      )
    } catch (error) {
      console.error("MediaStack error:", error)
      return []
    }
  }

  async fetchFromGNews(query = "market intelligence"): Promise<NewsArticle[]> {
    try {
      const response = await fetch(`https://gnews.io/api/v4/search?q=${query}&token=${this.gnewsKey}&lang=en&max=20`)
      const data = await response.json()

      return (
        data.articles?.map((article: any) => ({
          title: article.title,
          description: article.description,
          content: article.content,
          url: article.url,
          source: article.source?.name || "Unknown",
          author: article.author,
          publishedAt: article.publishedAt,
          category: "general",
        })) || []
      )
    } catch (error) {
      console.error("GNews error:", error)
      return []
    }
  }

  async fetchFromTavily(query = "market intelligence"): Promise<NewsArticle[]> {
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: this.tavilyKey,
          query: query,
          search_depth: "basic",
          include_answer: false,
          include_images: false,
          include_raw_content: false,
          max_results: 20,
        }),
      })
      const data = await response.json()

      return (
        data.results?.map((result: any) => ({
          title: result.title,
          description: result.content,
          content: result.content,
          url: result.url,
          source: new URL(result.url).hostname,
          author: "Unknown",
          publishedAt: new Date().toISOString(),
          category: "research",
        })) || []
      )
    } catch (error) {
      console.error("Tavily error:", error)
      return []
    }
  }

  async aggregateNews(query = "market intelligence"): Promise<NewsArticle[]> {
    const [newsApi, mediaStack, gnews, tavily] = await Promise.all([
      this.fetchFromNewsAPI(query),
      this.fetchFromMediaStack(query),
      this.fetchFromGNews(query),
      this.fetchFromTavily(query),
    ])

    return [...newsApi, ...mediaStack, ...gnews, ...tavily]
  }
}
