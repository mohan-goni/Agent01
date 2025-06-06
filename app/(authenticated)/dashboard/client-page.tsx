"use client"

// This is the Client Component that receives initial data from the Server Component parent.
// It handles all client-side interactivity, state management (beyond initial data), and calls to server actions.

import type React from "react"
import { useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, TrendingUp, BookmarkPlus, RefreshCw, Database, Users, FileText, BarChart, LineChart, Share2, AlertCircle } from "lucide-react"
import { getDashboardDataAction, refreshDashboardDataAction, seedSampleDataAction } from "./actions"

// Re-define types or import from a shared location
interface Article {
  id: number;
  title: string;
  description?: string | null;
  content?: string | null;
  url: string;
  source?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  category?: string | null;
  sentimentScore?: number | string | null; // decimal from DB can be string
  aiSummary?: string | null;
  keywords?: any | null; // jsonb from DB
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface Insight {
  id: number;
  title: string | null;
  summary?: string | null;
  content: string | null;
  source?: string | null;
  publishedAt?: string | null;
  tags?: any | null; // jsonb
  sentiment?: string | null; // decimal
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  articles: number;
  insights: number;
  users: number;
}

interface DashboardData {
  articles: Article[];
  insights: Insight[];
  stats: DashboardStats;
  error?: string;
}

// Initial empty state for data if initialData prop is not sufficient or for resets
const initialEmptyData: DashboardData = {
  articles: [],
  insights: [],
  stats: { articles: 0, insights: 0, users: 0 },
};

export default function ClientDashboardPage({ initialData }: { initialData: DashboardData }) {
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialData || initialEmptyData);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(initialData.error || null);

  useEffect(() => {
    // If initial data had an error, set it.
    if (initialData.error) {
        setActionError(initialData.error);
    }
    // Update state if initialData prop changes (e.g., due to parent re-fetch, though less common with server actions)
    setDashboardData(initialData);
  }, [initialData]);


  const handleSeedData = () => {
    setActionError(null);
    startTransition(async () => {
      const result = await seedSampleDataAction();
      if (result.success) {
        const data = await getDashboardDataAction(); // Re-fetch all data
        if (data.success) {
          setDashboardData({
            articles: data.articles as Article[],
            insights: data.insights as Insight[],
            stats: data.stats as DashboardStats,
          });
        } else {
          setActionError(data.error || "Failed to refresh data after seeding.");
        }
        // alert(result.message || "Sample data seeded!"); // Replace with toast later
      } else {
        setActionError(result.error || "Failed to seed data.");
      }
    });
  };

  const handleRefreshData = (query?: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await refreshDashboardDataAction(query || "market intelligence");
      if (result.success) {
        setDashboardData({
          articles: result.articles as Article[],
          insights: result.insights as Insight[],
          stats: result.stats as DashboardStats,
        });
      } else {
        setActionError(result.error || "Failed to refresh data.");
      }
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleRefreshData(searchQuery);
  };

  const getSentimentColor = (article: Article) => {
    const sentimentValue = typeof article.sentimentScore === 'string' ? parseFloat(article.sentimentScore) : article.sentimentScore;
    if (sentimentValue === undefined || sentimentValue === null || isNaN(sentimentValue)) return "bg-gray-100 text-gray-800";
    if (sentimentValue > 0.3) return "bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100";
    if (sentimentValue < -0.3) return "bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100";
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100";
  };

  const getSentimentLabel = (article: Article) => {
    const sentimentValue = typeof article.sentimentScore === 'string' ? parseFloat(article.sentimentScore) : article.sentimentScore;
    if (sentimentValue === undefined || sentimentValue === null || isNaN(sentimentValue)) return "N/A";
    if (sentimentValue > 0.3) return "Positive";
    if (sentimentValue < -0.3) return "Negative";
    return "Neutral";
  };

  const PlaceholderChart = ({ title, icon }: { title: string, icon?: React.ReactNode }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon || <BarChart className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="h-60 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-md">
          <p className="text-muted-foreground">Chart Placeholder</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
        {actionError && (
          <Card className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">
                <strong>Error:</strong> {actionError}
              </p>
            </CardContent>
          </Card>
        )}
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Market Growth</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+12.5%</div>
              <p className="text-xs text-muted-foreground">vs last quarter</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Competitor Activity</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3 New Entrants</div>
              <p className="text-xs text-muted-foreground">in the last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consumer Sentiment</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Positive (0.65)</div>
              <p className="text-xs text-muted-foreground">Average score</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Market Share</CardTitle>
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">27%</div>
              <p className="text-xs text-muted-foreground">Estimated</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Action Buttons */}
        <div className="flex flex-col md:flex-row gap-2 items-center">
            <form onSubmit={handleSearch} className="flex-grow flex gap-2 w-full md:w-auto">
                <Input
                placeholder="Search articles by keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-grow"
                />
                <Button type="submit" disabled={isPending && !!searchQuery}> {/* Disable only if searching */}
                <Search className="h-4 w-4 mr-2" />
                {isPending && !!searchQuery ? 'Searching...' : 'Search'}
                </Button>
            </form>
            <div className="flex gap-2 mt-2 md:mt-0 flex-wrap">
                <Button onClick={() => handleRefreshData()} disabled={isPending && !searchQuery} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${isPending && !searchQuery ? "animate-spin" : ""}`} />
                    {isPending && !searchQuery ? 'Refreshing...' : 'Refresh All News'}
                </Button>
                <Button onClick={handleSeedData} disabled={isPending} variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    {isPending ? 'Seeding...' : 'Load Sample Data'}
                </Button>
            </div>
        </div>

        {/* Main Content Tabs */}
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Tabs defaultValue="news" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="news">Latest News ({dashboardData.articles?.length || 0})</TabsTrigger>
                <TabsTrigger value="insights">AI Insights ({dashboardData.insights?.length || 0})</TabsTrigger>
                <TabsTrigger value="saved">Saved Articles (0)</TabsTrigger>
              </TabsList>

              <TabsContent value="news">
                <div className="grid gap-4">
                  {isPending && dashboardData.articles.length === 0 && <Card><CardContent className="p-4 text-center">Loading articles...</CardContent></Card>}
                  {!isPending && dashboardData.articles.length === 0 && (
                     <Card>
                        <CardContent className="text-center py-12">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Articles Found</h3>
                            <p className="text-muted-foreground mb-4">
                            Try a different search, refresh all news, or load sample data.
                            </p>
                        </CardContent>
                    </Card>
                  )}
                  {dashboardData.articles.map((article) => (
                      <Card key={article.id} className="hover:shadow-lg transition-shadow dark:border-gray-700">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0"> {/* Added min-w-0 for better wrapping with flex */}
                              <CardTitle className="text-lg hover:text-blue-600 dark:hover:text-blue-400">
                                <a href={article.url} target="_blank" rel="noopener noreferrer" title={article.title}>
                                  {article.title}
                                </a>
                              </CardTitle>
                              {article.description && <CardDescription className="mt-2 text-sm">{article.description}</CardDescription>}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 ml-2 sm:ml-4 items-end sm:items-center flex-shrink-0">
                                {article.category && <Badge variant="outline" className="text-xs whitespace-nowrap">{article.category}</Badge>}
                                <Badge className={`${getSentimentColor(article)} text-xs whitespace-nowrap`}>
                                    {getSentimentLabel(article)}
                                </Badge>
                                <Button variant="outline" size="sm" title="Save article" className="mt-2 sm:mt-0">
                                    <BookmarkPlus className="h-4 w-4" />
                                </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                            <span className="font-medium truncate" title={article.source || undefined}>{article.source || 'N/A'}</span>
                            <span>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'N/A'}</span>
                          </div>
                          {article.author && <p className="text-xs text-muted-foreground">Author: {article.author}</p>}
                          {Array.isArray(article.keywords) && article.keywords.length > 0 && (
                            <div className="mt-2">
                              {article.keywords.map((kw: any) => <Badge key={String(kw)} variant="secondary" className="mr-1 mb-1 text-xs">{String(kw)}</Badge>)}
                            </div>
                          )}
                          {article.aiSummary && <p className="text-sm mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md border border-blue-100 dark:border-blue-800">{article.aiSummary}</p>}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="insights">
                <div className="space-y-4">
                    {isPending && dashboardData.insights.length === 0 && <Card><CardContent className="p-4 text-center">Loading insights...</CardContent></Card>}
                    {!isPending && dashboardData.insights.length === 0 && (
                        <Card>
                            <CardContent className="text-center py-12">
                                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">No Insights Available</h3>
                                <p className="text-muted-foreground mb-4">
                                Insights are typically generated from market data or can be seeded.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                    {dashboardData.insights.map((insight) => (
                      <Card key={insight.id} className="dark:border-gray-700">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <TrendingUp className="h-5 w-5" />
                              {insight.title || "Market Insight"}
                            </CardTitle>
                            {insight.sentiment && <Badge variant="outline">{Math.round(parseFloat(insight.sentiment) * 100)}% confidence</Badge>}
                          </div>
                          <CardDescription>
                            Generated on {new Date(insight.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {insight.summary && <p className="mb-2 italic text-muted-foreground text-sm">{insight.summary}</p>}
                          <div className="prose dark:prose-invert max-w-none">
                            <div className="whitespace-pre-wrap text-sm">{insight.content}</div>
                          </div>
                           {Array.isArray(insight.tags) && insight.tags.length > 0 && (
                                <div className="mt-2">
                                    {insight.tags.map((tag: any, index: number) => (
                                        <Badge key={index} variant="secondary" className="mr-1 mb-1 text-xs">{String(tag)}</Badge>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="saved">
                <Card className="dark:border-gray-700">
                  <CardContent className="text-center py-12">
                    <BookmarkPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Saved Articles</h3>
                    <p className="text-muted-foreground">
                      This feature is coming soon!
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar for Charts & Stats */}
          <div className="lg:col-span-1 space-y-6">
            <PlaceholderChart title="Market Trends" icon={<LineChart className="h-4 w-4 text-muted-foreground" />} />
            <PlaceholderChart title="Competitor Analysis" icon={<BarChart className="h-4 w-4 text-muted-foreground" />} />
            <Card className="dark:border-gray-700">
                <CardHeader>
                    <CardTitle className="text-lg">Database Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Total Articles:</span> <strong className="font-mono">{dashboardData.stats.articles}</strong></div>
                    <div className="flex justify-between"><span>Total Insights:</span> <strong className="font-mono">{dashboardData.stats.insights}</strong></div>
                    <div className="flex justify-between"><span>Total Users:</span> <strong className="font-mono">{dashboardData.stats.users}</strong></div>
                </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
}
