"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Database, RefreshCw } from "lucide-react"

interface DatabaseStats {
  success: boolean
  connection?: string
  tables?: string[]
  stats?: {
    articles: number
    users: number
    insights: number
  }
  error?: string
}

export default function DatabaseStatus() {
  const [status, setStatus] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(false)

  const checkDatabase = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/db/test")
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      setStatus({
        success: false,
        error: "Failed to connect to database",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkDatabase()
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>Database Status</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={checkDatabase} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>Connection status and database statistics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status ? (
          <>
            <div className="flex items-center gap-2">
              <Badge variant={status.success ? "default" : "destructive"}>
                {status.success ? "Connected" : "Disconnected"}
              </Badge>
              {status.connection && <span className="text-sm text-muted-foreground">{status.connection}</span>}
            </div>

            {status.success && status.stats && (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{status.stats.articles}</div>
                  <div className="text-sm text-muted-foreground">Articles</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{status.stats.users}</div>
                  <div className="text-sm text-muted-foreground">Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{status.stats.insights}</div>
                  <div className="text-sm text-muted-foreground">Insights</div>
                </div>
              </div>
            )}

            {status.success && status.tables && (
              <div>
                <h4 className="font-medium mb-2">Available Tables:</h4>
                <div className="flex flex-wrap gap-1">
                  {status.tables.map((table) => (
                    <Badge key={table} variant="outline" className="text-xs">
                      {table}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {status.error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">Error: {status.error}</div>}
          </>
        ) : (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Checking database...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
