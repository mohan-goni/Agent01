// This page is now a Server Component by default as it's in app router and not marked "use client" at the top level.
// We can fetch data directly here.

import type React from "react";
// "use client" should be added if we need client-side hooks like useState, useEffect, useTransition directly in this component.
// For now, we'll try to make this a server component and offload client interactions to sub-components if needed,
// or convert the main component to client if heavy interactivity is required for the whole page.
// Given the use of useTransition and useState for search/data, this will need to be a client component.
// So, "use client" is necessary.

import ClientDashboardPage from "./client-page"; // Create a new client component
import { getDashboardDataAction } from "./actions";

// Define types here, or import from a shared types file if they grow
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
  sentimentScore?: number | string | null; // Can be string from DB (decimal)
  aiSummary?: string | null;
  keywords?: any | null; // jsonb, can be string[]
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface Insight {
  id: number;
  title: string | null;
  summary?: string | null;
  content: string | null;
  source?: string | null;
  publishedAt?: string | null; // published_at in schema
  tags?: any | null; // jsonb
  sentiment?: string | null; // decimal(3,2) in schema
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
  error?: string; // Optional error message
}

// This is the Server Component part of the page.
// It fetches initial data and passes it to a Client Component.
export default async function DashboardPage() {
  const initialDataResult = await getDashboardDataAction();

  // Construct initialDashboardData carefully, handling potential errors or undefined fields
  const initialDashboardData: DashboardData = {
    articles: (initialDataResult.articles || []) as Article[],
    insights: (initialDataResult.insights || []) as Insight[],
    stats: (initialDataResult.stats || { articles: 0, insights: 0, users: 0 }) as DashboardStats,
    error: initialDataResult.error,
  };

  return <ClientDashboardPage initialData={initialDashboardData} />;
}
