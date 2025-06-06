import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function CustomerInsightsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Customer Insights</h1>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Coming Soon!</CardTitle>
          <CardDescription>
            Understanding Customer Feedback and Sentiment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="min-h-[200px] flex flex-col items-center justify-center text-center">
            <p className="text-lg text-muted-foreground mb-2">
              This section is currently under active development.
            </p>
            <p className="text-md text-muted-foreground">
              We are developing tools to help you aggregate customer feedback, analyze sentiment at scale,
              and identify key themes to improve your products and services.
            </p>
            {/* <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mt-4" /> */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
