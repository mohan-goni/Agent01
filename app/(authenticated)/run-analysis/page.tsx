"use client";

import type React from "react";
import { useState, useTransition } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Not explicitly used but good for consistency if needed
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, FileText, BarChart2, AlertCircle, Info, FileArchive, FileSearch, Download } from "lucide-react"; // Added Download
import { triggerRunAnalysisAction } from "./actions";
import Link from "next/link"; // For download links

// Zod schema for the form
const analysisFormSchema = z.object({
  query_str: z.string().min(5, { message: "Query must be at least 5 characters." }).max(200, {message: "Query too long (max 200 chars)."}),
  market_domain_str: z.string().min(3, { message: "Market domain must be at least 3 characters." }).max(100, {message: "Market domain too long (max 100 chars)."}),
  question_str: z.string().max(200, {message: "Question too long (max 200 chars)."}).optional().or(z.literal("")),
});
export type AnalysisFormValues = z.infer<typeof analysisFormSchema>;

interface AgentAnalysisResponse {
  success: boolean;
  state_id?: string | null;
  query_response?: string | null;
  report_dir_relative?: string | null; // e.g., "reports1/run_XYZ"
  report_filename?: string | null;     // e.g., "report.md"
  chart_filenames?: string[] | null;   // e.g., ["chart1.png", "chart2.png"]
  data_json_filename?: string | null;
  data_csv_filename?: string | null;
  readme_filename?: string | null;
  log_filename?: string | null;
  rag_log_filename?: string | null;
  vector_store_dirname?: string | null;
  error?: string | null;
}

// Helper function to create download or view URL
const createArtifactUrl = (dir: string | null | undefined, filename: string | null | undefined, download: boolean = false) => {
  if (!dir || !filename) return "#";
  // Ensure no leading/trailing slashes on dir and filename before joining
  const cleanedDir = dir.replace(/^\/+|\/+$/g, '');
  const cleanedFilename = filename.replace(/^\/+|\/+$/g, '');
  const filePath = `${cleanedDir}/${cleanedFilename}`;
  let url = `/api/download-artifact?filePath=${encodeURIComponent(filePath)}`;
  if (download) {
    url += "&download=true";
  }
  return url;
};

export default function RunAnalysisPage() {
  const [analysisResult, setAnalysisResult] = useState<AgentAnalysisResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<AnalysisFormValues>({
    resolver: zodResolver(analysisFormSchema),
    defaultValues: {
      query_str: "Analyze the impact of AI on the renewable energy sector, focusing on startups.",
      market_domain_str: "AI in Renewable Energy Startups",
      question_str: "What are the key challenges for new entrants in this domain based on recent news?",
    },
  });

  const onSubmit: SubmitHandler<AnalysisFormValues> = async (data) => {
    setAnalysisResult(null);
    startTransition(async () => {
      const result = await triggerRunAnalysisAction({
        ...data,
        question_str: data.question_str || null,
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
            The process may take some time to complete (potentially several minutes).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* FormFields remain the same as before */}
              <FormField control={form.control} name="query_str" render={({ field }) => ( <FormItem> <FormLabel>Analysis Query / Topic</FormLabel> <FormControl><Textarea placeholder="e.g., Impact of AI on the EdTech sector" {...field} rows={3} /></FormControl> <FormDescription>The main topic or query for the market analysis.</FormDescription> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="market_domain_str" render={({ field }) => ( <FormItem> <FormLabel>Market Domain</FormLabel> <FormControl><Input placeholder="e.g., EdTech, Renewable Energy" {...field} /></FormControl> <FormDescription>The specific market domain to focus the analysis on.</FormDescription> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="question_str" render={({ field }) => ( <FormItem> <FormLabel>Specific Question (Optional)</FormLabel> <FormControl><Textarea placeholder="e.g., What are the key challenges for new entrants?" {...field} rows={2} /></FormControl> <FormDescription>An optional specific question for the RAG agent to answer.</FormDescription> <FormMessage /> </FormItem> )} />
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSearch className="mr-2 h-4 w-4" />}
                {isPending ? "Running Analysis..." : "Start Analysis"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isPending && ( /* Loading state UI */ <Card><CardContent className="p-6 text-center"><Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500 mb-4" /><p className="text-lg font-medium">Analysis in Progress...</p><p className="text-muted-foreground">This may take several minutes. Please do not navigate away.</p></CardContent></Card> )}

      {analysisResult && !isPending && (
        <Card className={analysisResult.success ? "border-green-500/50 dark:border-green-700" : "border-red-500/50 dark:border-red-700"}>
          <CardHeader>
            <CardTitle className={analysisResult.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              Analysis {analysisResult.success ? "Completed" : "Failed"}
            </CardTitle>
            {analysisResult.state_id && <CardDescription>State ID: {analysisResult.state_id}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {analysisResult.error && ( /* Error display */ <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex items-start gap-2"><AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" /><div><h5 className="font-semibold">Error Details:</h5><p className="text-sm">{analysisResult.error}</p></div></div> )}

            {analysisResult.query_response && ( /* RAG Query Response */ <div><h4 className="font-semibold text-lg mb-1">Agent's Answer to Specific Question:</h4><p className="p-3 rounded-md bg-gray-100 dark:bg-gray-700 text-sm whitespace-pre-wrap">{analysisResult.query_response}</p></div> )}

            {analysisResult.success && analysisResult.report_dir_relative && (
              <div>
                <h4 className="font-semibold text-lg mb-2">Generated Report Artifacts</h4>
                <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-700/50 border dark:border-gray-600 space-y-3 text-sm">
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-blue-500" />
                    <span>
                      Output files are generated on the server. Use the links below to view or download them.
                      Report directory: <code>{analysisResult.report_dir_relative}</code>
                    </span>
                  </p>

                  <ul className="space-y-2">
                    {analysisResult.report_filename && (<li><FileText className="inline h-4 w-4 mr-2 text-muted-foreground" /><Link href={createArtifactUrl(analysisResult.report_dir_relative, analysisResult.report_filename, true)} className="text-blue-600 hover:underline dark:text-blue-400" target="_blank">Download Report ({analysisResult.report_filename})</Link></li>)}
                    {analysisResult.readme_filename && (<li><FileText className="inline h-4 w-4 mr-2 text-muted-foreground" /><Link href={createArtifactUrl(analysisResult.report_dir_relative, analysisResult.readme_filename, true)} className="text-blue-600 hover:underline dark:text-blue-400" target="_blank">Download README ({analysisResult.readme_filename})</Link></li>)}
                    {analysisResult.data_json_filename && (<li><FileArchive className="inline h-4 w-4 mr-2 text-muted-foreground" /><Link href={createArtifactUrl(analysisResult.report_dir_relative, analysisResult.data_json_filename, true)} className="text-blue-600 hover:underline dark:text-blue-400" target="_blank">Download Data JSON ({analysisResult.data_json_filename})</Link></li>)}
                    {analysisResult.data_csv_filename && (<li><FileArchive className="inline h-4 w-4 mr-2 text-muted-foreground" /><Link href={createArtifactUrl(analysisResult.report_dir_relative, analysisResult.data_csv_filename, true)} className="text-blue-600 hover:underline dark:text-blue-400" target="_blank">Download Data CSV ({analysisResult.data_csv_filename})</Link></li>)}
                    {analysisResult.log_filename && (<li><FileText className="inline h-4 w-4 mr-2 text-muted-foreground" /><Link href={createArtifactUrl(analysisResult.report_dir_relative, analysisResult.log_filename, true)} className="text-blue-600 hover:underline dark:text-blue-400" target="_blank">Download Run Log ({analysisResult.log_filename})</Link></li>)}
                    {analysisResult.rag_log_filename && (<li><FileText className="inline h-4 w-4 mr-2 text-muted-foreground" /><Link href={createArtifactUrl(analysisResult.report_dir_relative, analysisResult.rag_log_filename, true)} className="text-blue-600 hover:underline dark:text-blue-400" target="_blank">Download RAG Log ({analysisResult.rag_log_filename})</Link></li>)}
                    {/* Vector store is a directory, not directly downloadable as a single file here.
                        {analysisResult.vector_store_dirname && <p><FileArchive className="inline h-4 w-4 mr-1" /><strong>Vector Store Directory:</strong> {analysisResult.vector_store_dirname}</p>}
                    */}
                  </ul>

                  {analysisResult.chart_filenames && analysisResult.chart_filenames.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-semibold mb-2">Generated Charts:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analysisResult.chart_filenames.map(name => (
                          <div key={name} className="p-2 border rounded-md dark:border-gray-600">
                            <img
                              src={createArtifactUrl(analysisResult.report_dir_relative, name, false)}
                              alt={`Chart: ${name}`}
                              className="max-w-full h-auto rounded"
                            />
                            <p className="text-xs text-center mt-1 text-muted-foreground">{name}</p>
                            <Button variant="outline" size="sm" asChild className="mt-1 w-full">
                                <Link href={createArtifactUrl(analysisResult.report_dir_relative, name, true)} target="_blank">
                                    <Download className="h-3 w-3 mr-1.5"/> Download Chart
                                </Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          {analysisResult.success && ( /* Footer for success message */ <CardFooter><p className="text-xs text-muted-foreground">The full report and associated files have been generated on the server.</p></CardFooter> )}
        </Card>
      )}
    </div>
  );
}
