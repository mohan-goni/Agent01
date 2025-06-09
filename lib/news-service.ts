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
  private newsApiKey = process.env.NEWS_API_KEY!
  private mediastackKey = process.env.MEDIASTACK_API_KEY!
  private gnewsKey = process.env.GNEWS_API_KEY!
  private tavilyKey = process.env.TAVILY_API_KEY!

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

  async fetchFromSerpAPI(query = "market intelligence"): Promise<NewsArticle[]> {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      console.warn("SERPAPI_API_KEY not set. Skipping SerpAPI fetch.");
      return [];
    }
    try {
      // Using a common SerpApi endpoint for Google Search
      const searchParams = new URLSearchParams({
        q: query,
        api_key: apiKey,
        engine: "google",
        num: "10", // Get 10 results
      });
      const response = await fetch(`https://serpapi.com/search.json?${searchParams.toString()}`);
      if (!response.ok) {
        console.error(`SerpAPI request failed with status ${response.status}: ${await response.text()}`);
        return [];
      }
      const data = await response.json();
      return (
        data.organic_results?.map((result: any) => ({
          title: result.title,
          description: result.snippet || result.title, // Use snippet if available
          content: result.snippet || result.title,
          url: result.link,
          source: result.source || new URL(result.link).hostname, // result.source if available
          author: "Unknown",
          publishedAt: result.date || new Date().toISOString(), // result.date if available
          category: "search",
        })) || []
      );
    } catch (error) {
      console.error("SerpAPI error:", error);
      return [];
    }
  }

  async fetchFromFMP(query = "market trends"): Promise<any[]> {
    const apiKey = process.env.FINANCIAL_MODELING_PREP_API_KEY;
    if (!apiKey) {
      console.warn("FINANCIAL_MODELING_PREP_API_KEY not set. Skipping FMP fetch.");
      return [];
    }
    try {
      // Example: Search for company names matching query. FMP has a search endpoint.
      // Or, if query is a symbol, fetch quote. This is a simplified example.
      const searchParams = new URLSearchParams({
        query: query,
        limit: "5",
        apikey: apiKey,
      });
      // Using FMP's general search endpoint as an example
      const response = await fetch(`https://financialmodelingprep.com/api/v3/search-name?${searchParams.toString()}`);
      if (!response.ok) {
        console.error(`FMP request failed with status ${response.status}: ${await response.text()}`);
        return [];
      }
      const data = await response.json();
      // Transform data as needed, structure will depend on the chosen FMP endpoint
      return data.map((item: any) => ({
          source: "FinancialModelingPrep",
          type: "company_search_result", // Example type
          symbol: item.symbol,
          name: item.name,
          data: item, // Include the raw item for now
      }));
    } catch (error) {
      console.error("FMP error:", error);
      return [];
    }
  }

  async fetchFromAlphaVantage(query = "market overview"): Promise<any[]> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      console.warn("ALPHA_VANTAGE_API_KEY not set. Skipping Alpha Vantage fetch.");
      return [];
    }
    try {
      // Example: Use Alpha Vantage's SYMBOL_SEARCH.
      // Or, if query is a symbol, fetch time series. This is a simplified example.
      const searchParams = new URLSearchParams({
        function: "SYMBOL_SEARCH",
        keywords: query,
        apikey: apiKey,
      });
      const response = await fetch(`https://www.alphavantage.co/query?${searchParams.toString()}`);
       if (!response.ok) {
        console.error(`Alpha Vantage request failed with status ${response.status}: ${await response.text()}`);
        return [];
      }
      const data = await response.json();
      // Transform data: AV search results are in 'bestMatches'
      return (data.bestMatches?.map((match: any) => ({
          source: "AlphaVantage",
          type: "symbol_search_result", // Example type
          symbol: match["1. symbol"],
          name: match["2. name"],
          region: match["4. region"],
          data: match, // Include the raw match
      })) || []);
    } catch (error) {
      console.error("Alpha Vantage error:", error);
      return [];
    }
  }

  async aggregateNews(query = "market intelligence"): Promise<NewsArticle[]> {
    const [newsApi, mediaStack, gnews, tavily, serpApi] = await Promise.all([
      this.fetchFromNewsAPI(query),
      this.fetchFromMediaStack(query),
      this.fetchFromGNews(query),
      this.fetchFromTavily(query),
      this.fetchFromSerpAPI(query),
    ])

    return [...newsApi, ...mediaStack, ...gnews, ...tavily, ...serpApi]
  }
}
