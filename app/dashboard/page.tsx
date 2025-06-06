"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, TrendingUp, BookmarkPlus, RefreshCw, Database, Users, FileText } from "lucide-react"

interface Article {
  id: number
  title: string
  description: string
  url: string
  source: string
  published_at: string
  category: string
  analysis?: {
    sentiment: number
    summary: string
    insights: string
  }
}

interface Insight {
  id: number
  title: string
  content: string
  insight_type: string
  confidence_score: number
  created_at: string
}

interface DatabaseStats {
  success: boolean
  connection?: string
  tables?: string[]
  stats?: {
    articles: number
    users: number
    insights: number
  }
  existingUsers?: any[]
  error?: string
}

export default function Dashboard() {
  const [articles, setArticles] = useState<Article[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [dbStatus, setDbStatus] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const checkDatabase = async () => {
    try {
      const response = await fetch("/api/db/test")
      const data = await response.json()
      setDbStatus(data)
    } catch (error) {
      setDbStatus({
        success: false,
        error: "Failed to connect to database",
      })
    }
  }

  const seedSampleData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/seed", { method: "POST" })
      const data = await response.json()
      if (data.success) {
        // Refresh data after seeding
        fetchNews()
        fetchInsights()
        checkDatabase()
      }
    } catch (error) {
      console.error("Error seeding data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNews = async (query = "market intelligence", refresh = false) => {
    setLoading(true)
    try {
      const url = `/api/news?q=${encodeURIComponent(query)}${refresh ? "&refresh=true" : ""}`
      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setArticles(data.articles)
      }
    } catch (error) {
      console.error("Error fetching news:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInsights = async (generate = false) => {
    try {
      const url = `/api/insights${generate ? "?generate=true" : ""}`
      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        if (generate && data.insight) {
          setInsights((prev) => [
            {
              id: Date.now(),
              title: "Daily Market Analysis",
              content: data.insight,
              insight_type: "daily",
              confidence_score: 0.85,
              created_at: new Date().toISOString(),
            },
            ...prev,
          ])
        } else if (data.insights) {
          setInsights(data.insights)
        }
      }
    } catch (error) {
      console.error("Error fetching insights:", error)
    }
  }

  useEffect(() => {
    checkDatabase()
    fetchNews()
    fetchInsights()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchNews(searchQuery, true)
  }

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.3) return "bg-green-100 text-green-800"
    if (sentiment < -0.3) return "bg-red-100 text-red-800"
    return "bg-yellow-100 text-yellow-800"
  }

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment > 0.3) return "Positive"
    if (sentiment < -0.3) return "Negative"
    return "Neutral"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Market Intelligence Platform</h1>
            <p className="text-lg text-gray-600">AI-powered market analysis and news aggregation</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={seedSampleData} disabled={loading} variant="outline">
              <Database className="h-4 w-4 mr-2" />
              Load Sample Data
            </Button>
            <Button onClick={() => fetchNews("", true)} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Database Status Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database Status</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dbStatus?.success ? (
                  <Badge className="bg-green-100 text-green-800">Connected</Badge>
                ) : (
                  <Badge variant="destructive">Disconnected</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{dbStatus?.tables?.length || 0} tables available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dbStatus?.stats?.users || 0}</div>
              <p className="text-xs text-muted-foreground">Registered users in system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Articles & Insights</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(dbStatus?.stats?.articles || 0) + (dbStatus?.stats?.insights || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {dbStatus?.stats?.articles || 0} articles, {dbStatus?.stats?.insights || 0} insights
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search market intelligence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </form>

        {/* Main Content */}
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Tabs defaultValue="news" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="news">Latest News ({articles.length})</TabsTrigger>
                <TabsTrigger value="insights">AI Insights ({insights.length})</TabsTrigger>
                <TabsTrigger value="saved">Saved Articles</TabsTrigger>
              </TabsList>

              <TabsContent value="news">
                <div className="grid gap-4">
                  {articles.length > 0 ? (
                    articles.map((article) => (
                      <Card key={article.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-lg hover:text-blue-600">
                                <a href={article.url} target="_blank" rel="noopener noreferrer">
                                  {article.title}
                                </a>
                              </CardTitle>
                              <CardDescription className="mt-2">{article.description}</CardDescription>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Badge variant="outline">{article.category}</Badge>
                              <Button variant="outline" size="sm">
                                <BookmarkPlus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span className="font-medium">{article.source}</span>
                            <span>{new Date(article.published_at).toLocaleDateString()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="text-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Articles Yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Click "Load Sample Data" to populate with example articles, or "Refresh" to fetch live news.
                        </p>
                        <Button onClick={seedSampleData} disabled={loading}>
                          Load Sample Data
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="insights">
                <div className="space-y-4">
                  {insights.length > 0 ? (
                    insights.map((insight) => (
                      <Card key={insight.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle className="flex items-center gap-2">
                              <TrendingUp className="h-5 w-5" />
                              {insight.title}
                            </CardTitle>
                            <Badge variant="outline">{Math.round(insight.confidence_score * 100)}% confidence</Badge>
                          </div>
                          <CardDescription>
                            Generated on {new Date(insight.created_at).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="prose max-w-none">
                            <div className="whitespace-pre-wrap text-sm">{insight.content}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="text-center py-12">
                        <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Insights Available</h3>
                        <p className="text-muted-foreground mb-4">
                          Load sample data to see AI-generated market insights.
                        </p>
                        <Button onClick={seedSampleData} disabled={loading}>
                          Load Sample Data
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="saved">
                <Card>
                  <CardContent className="text-center py-12">
                    <BookmarkPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Saved Articles</h3>
                    <p className="text-muted-foreground">
                      Start bookmarking articles from the news feed to see them here.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Database Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Database</span>
                  <Badge variant={dbStatus?.success ? "default" : "destructive"}>
                    {dbStatus?.success ? "Connected" : "Error"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tables</span>
                  <span className="font-medium">{dbStatus?.tables?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Updated</span>
                  <span className="font-medium text-sm">{new Date().toLocaleTimeString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Existing Users */}
            {dbStatus?.existingUsers && dbStatus.existingUsers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dbStatus.existingUsers.slice(0, 3).map((user, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">{user.name || "Anonymous"}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {new Date(user.created_at).toLocaleDateString()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => fetchInsights(true)}
                  disabled={loading}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Generate AI Insights
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={checkDatabase}>
                  <Database className="h-4 w-4 mr-2" />
                  Check Database
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open("/api/db/test", "_blank")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View API Status
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
