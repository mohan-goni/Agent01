"use client";

import type React from "react";
import { useState, useTransition } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // For potentially larger query/question fields
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, FileText, BarChart2, AlertCircle, Info, FileArchive, FileSearch } from "lucide-react"; // Added FileSearch
import { triggerRunAnalysisAction } from "./actions"; // Server action

// Zod schema for the form
const analysisFormSchema = z.object({
  query_str: z.string().min(5, { message: "Query must be at least 5 characters." }).max(200, {message: "Query too long (max 200 chars)."}),
  market_domain_str: z.string().min(3, { message: "Market domain must be at least 3 characters." }).max(100, {message: "Market domain too long (max 100 chars)."}),
  question_str: z.string().max(200, {message: "Question too long (max 200 chars)."}).optional().or(z.literal("")), // Optional, allow empty string
});
export type AnalysisFormValues = z.infer<typeof analysisFormSchema>;

// Define the expected response structure from the server action
interface AgentAnalysisResponse {
  success: boolean;
  state_id?: string | null;
  query_response?: string | null;
  report_dir_relative?: string | null;
  report_filename?: string | null;
  chart_filenames?: string[] | null;
  data_json_filename?: string | null;
  data_csv_filename?: string | null;
  readme_filename?: string | null;
  log_filename?: string | null;
  rag_log_filename?: string | null;
  vector_store_dirname?: string | null;
  error?: string | null;
}

export default function RunAnalysisPage() {
  const [analysisResult, setAnalysisResult] = useState<AgentAnalysisResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<AnalysisFormValues>({
    resolver: zodResolver(analysisFormSchema),
    defaultValues: {
      query_str: "Analyze the impact of AI on the renewable energy sector, focusing on startups.",
      market_domain_str: "AI in Renewable Energy Startups",
      question_str: "",
    },
  });

  const onSubmit: SubmitHandler<AnalysisFormValues> = async (data) => {
    setAnalysisResult(null); // Clear previous results
    startTransition(async () => {
      const result = await triggerRunAnalysisAction({
        ...data,
        question_str: data.question_str || null, // Ensure null if empty string
      });
      setAnalysisResult(result);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Run Full Market Analysis</h1>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Analysis Configuration</CardTitle>
          <CardDescription>
            Specify the parameters for the market analysis report generation.
            The process may take some time to complete.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="query_str"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Analysis Query / Topic</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Impact of AI on the EdTech sector" {...field} rows={3} />
                    </FormControl>
                    <FormDescription>
                      The main topic or query for the market analysis.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="market_domain_str"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market Domain</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., EdTech, Renewable Energy" {...field} />
                    </FormControl>
                    <FormDescription>
                      The specific market domain to focus the analysis on.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="question_str"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specific Question (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., What are the key challenges for new entrants?" {...field} rows={2} />
                    </FormControl>
                    <FormDescription>
                      An optional specific question for the RAG agent to answer based on the generated report and data.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSearch className="mr-2 h-4 w-4" />}
                {isPending ? "Running Analysis..." : "Start Analysis"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isPending && (
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500 mb-4" />
            <p className="text-lg font-medium">Analysis in Progress...</p>
            <p className="text-muted-foreground">This may take several minutes. Please do not navigate away.</p>
          </CardContent>
        </Card>
      )}

      {analysisResult && !isPending && (
        <Card className={analysisResult.success ? "border-green-500/50" : "border-red-500/50"}>
          <CardHeader>
            <CardTitle className={analysisResult.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              Analysis {analysisResult.success ? "Completed" : "Failed"}
            </CardTitle>
            {analysisResult.state_id && <CardDescription>State ID: {analysisResult.state_id}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {analysisResult.error && (
              <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                    <h5 className="font-semibold">Error Details:</h5>
                    <p className="text-sm">{analysisResult.error}</p>
                </div>
              </div>
            )}

            {analysisResult.query_response && (
              <div>
                <h4 className="font-semibold text-lg mb-1">Agent's Answer to Specific Question:</h4>
                <p className="p-3 rounded-md bg-gray-50 dark:bg-gray-700 text-sm whitespace-pre-wrap">
                  {analysisResult.query_response}
                </p>
              </div>
            )}

            {analysisResult.success && analysisResult.report_dir_relative && (
              <div>
                <h4 className="font-semibold text-lg mb-2">Generated Report Artifacts:</h4>
                <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/30 space-y-2 text-sm">
                  <p className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-500" />
                    <span>Output files are saved in the agent's working directory (typically `/tmp/reports1/...` on the server). These files are not directly downloadable from this UI in the current version.</span>
                  </p>
                  <p><strong>Relative Report Directory:</strong> <code>{analysisResult.report_dir_relative}</code></p>
                  {analysisResult.report_filename && <p><FileText className="inline h-4 w-4 mr-1" /><strong>Main Report:</strong> {analysisResult.report_filename}</p>}
                  {analysisResult.readme_filename && <p><FileText className="inline h-4 w-4 mr-1" /><strong>README:</strong> {analysisResult.readme_filename}</p>}
                  {analysisResult.data_json_filename && <p><FileArchive className="inline h-4 w-4 mr-1" /><strong>Data (JSON):</strong> {analysisResult.data_json_filename}</p>}
                  {analysisResult.data_csv_filename && <p><FileArchive className="inline h-4 w-4 mr-1" /><strong>Data (CSV):</strong> {analysisResult.data_csv_filename}</p>}
                  {analysisResult.log_filename && <p><FileText className="inline h-4 w-4 mr-1" /><strong>Run Log:</strong> {analysisResult.log_filename}</p>}
                  {analysisResult.rag_log_filename && <p><FileText className="inline h-4 w-4 mr-1" /><strong>RAG Q&A Log:</strong> {analysisResult.rag_log_filename}</p>}
                  {analysisResult.vector_store_dirname && <p><FileArchive className="inline h-4 w-4 mr-1" /><strong>Vector Store Directory:</strong> {analysisResult.vector_store_dirname}</p>}

                  {analysisResult.chart_filenames && analysisResult.chart_filenames.length > 0 && (
                    <div>
                      <strong>Charts:</strong>
                      <ul className="list-disc list-inside pl-4">
                        {analysisResult.chart_filenames.map(name => <li key={name}><BarChart2 className="inline h-4 w-4 mr-1" />{name}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          {analysisResult.success && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">
                    The full report and associated files have been generated on the server. Future updates may include direct download links.
                </p>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
}
