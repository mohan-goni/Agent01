import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Brain, Mail, Shield } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Market Intelligence Platform</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Stay ahead of market trends with AI-powered news aggregation, sentiment analysis, and personalized insights
            delivered to your inbox.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/dashboard">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Real-time News</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Aggregate news from multiple sources including NewsAPI, MediaStack, and GNews
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Brain className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle>AI Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Powered by Google Gemini AI for sentiment analysis and market insights</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Mail className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle>Daily Digest</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Receive personalized market intelligence reports via email</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-red-600 mb-2" />
              <CardTitle>Secure Access</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Google OAuth integration with secure user authentication</CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Transform Your Market Intelligence?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of professionals who rely on our platform for market insights.
          </p>
          <Button asChild size="lg">
            <Link href="/auth/login">Start Your Free Trial</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
