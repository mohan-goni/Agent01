import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, desc, count } from 'drizzle-orm';
import * as schema from '../db/schema';

// Create the connection
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { schema });

export { db, client }; // Exporting db instance and client for potential direct use if needed

export async function getUserProfile(userId: string) {
  const result = await db.select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, userId))
    .limit(1);
  return result[0];
}

export async function createUserProfile(userId: string, email: string, name?: string) {
  const result = await db.insert(schema.userProfiles)
    .values({ userId, email, name })
    .onConflictDoUpdate({
      target: schema.userProfiles.userId,
      set: {
        email,
        name,
        updatedAt: new Date()
      }
    })
    .returning();
  return result[0];
}

// CRUD functions for Data Sources
export async function getDataSourcesByUserId(userId: string) {
  if (!userId) {
    console.warn("getDataSourcesByUserId called with no userId");
    return [];
  }
  return db.select()
    .from(schema.dataSources)
    .where(eq(schema.dataSources.userId, userId))
    .orderBy(desc(schema.dataSources.createdAt));
}

export async function createDataSource(
  userId: string,
  name: string,
  type: string,
  config: any, // JSONB, so 'any' is appropriate here for the input
  status: string = 'pending',
  isEnabled: boolean = true
) {
  if (!userId) {
    throw new Error("User ID is required to create a Data Source.");
  }
  // Ensure config is an object, default to empty object if not.
  const validConfig = (typeof config === 'object' && config !== null) ? config : {};

  const result = await db.insert(schema.dataSources)
    .values({
      userId,
      name,
      type,
      config: validConfig,
      status,
      isEnabled,
      lastSyncedAt: null, // Explicitly set lastSyncedAt to null on creation
    })
    .returning();
  return result[0];
}

export async function updateDataSource(
  dataSourceId: number,
  userId: string,
  updates: Partial<Omit<typeof schema.dataSources.$inferInsert, 'id' | 'userId' | 'createdAt'>> // Allow updates to most fields
) {
  if (!userId) {
    throw new Error("User ID is required for updating a Data Source.");
  }
  if (Object.keys(updates).length === 0) {
    // Avoid performing an update if there are no changes.
    // Fetch and return the existing record instead.
    const existing = await db.select().from(schema.dataSources).where(eq(schema.dataSources.id, dataSourceId) && eq(schema.dataSources.userId, userId));
    return existing[0];
  }

  const result = await db.update(schema.dataSources)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(schema.dataSources.id, dataSourceId) && eq(schema.dataSources.userId, userId))
    .returning();
  return result[0];
}

export async function deleteDataSourceById(dataSourceId: number, userId: string) {
  if (!userId) {
    throw new Error("User ID is required for deleting a Data Source.");
  }
  const result = await db.delete(schema.dataSources)
    .where(eq(schema.dataSources.id, dataSourceId) && eq(schema.dataSources.userId, userId))
    .returning({ id: schema.dataSources.id });
  return result.length > 0;
}

// Specific update functions for status and isEnabled can be handled by updateDataSource
// e.g., updateDataSource(id, userId, { status: newStatus })
// e.g., updateDataSource(id, userId, { isEnabled: newIsEnabled })
// No need for separate updateDataSourceStatus or updateDataSourceIsEnabled if updateDataSource is flexible.

// Updated 'article' type hint for clarity, though still 'any' as per original task.
export async function saveArticle(article: {
  title: string;
  url: string;
  content?: string;
  source?: string;
  publishedAt?: Date | string | null; // Allow null
  description?: string;
  author?: string;
  category?: string;
  sentimentScore?: string | number | null; // Drizzle handles string to numeric for decimal
  aiSummary?: string;
  keywords?: string[]; // Expecting array of strings for jsonb
}) {
  // Helper to convert publishedAt to Date or null
  const parsePublishedAt = (dateInput: any): Date | null => {
    if (!dateInput) return null;
    const date = new Date(dateInput);
    return isNaN(date.getTime()) ? null : date;
  };

  const valuesToInsert = {
    title: article.title,
    url: article.url,
    description: article.description,
    content: article.content,
    source: article.source,
    author: article.author,
    publishedAt: parsePublishedAt(article.publishedAt),
    category: article.category,
    sentimentScore: article.sentimentScore !== undefined && article.sentimentScore !== null ? String(article.sentimentScore) : null, // Ensure string for Drizzle if not null
    aiSummary: article.aiSummary,
    keywords: article.keywords, // Pass as is, Drizzle/pg handles JSONB
    // createdAt will be set by default by the DB
    // updatedAt should also be set by default by the DB on update, but explicit for insert is fine
    // For onConflictDoUpdate, updatedAt is explicitly set.
  };

  const result = await db.insert(schema.articles)
    .values(valuesToInsert)
    .onConflictDoUpdate({
      target: schema.articles.url,
      set: {
        title: article.title,
        description: article.description,
        content: article.content,
        source: article.source,
        author: article.author,
        publishedAt: parsePublishedAt(article.publishedAt),
        category: article.category,
        sentimentScore: article.sentimentScore !== undefined && article.sentimentScore !== null ? String(article.sentimentScore) : null,
        aiSummary: article.aiSummary,
        keywords: article.keywords,
        updatedAt: new Date() // Explicitly set updatedAt on conflict
      }
    })
    .returning();
  return result[0];
}

export async function getArticles(limit = 20, offset = 0) {
  const result = await db.select()
    .from(schema.articles)
    .orderBy(desc(schema.articles.publishedAt))
    .limit(limit)
    .offset(offset);
  return result;
}

export async function getUserSavedArticles(userId: string) {
  const result = await db.select({
      id: schema.articles.id,
      title: schema.articles.title,
      url: schema.articles.url,
      content: schema.articles.content,
      source: schema.articles.source,
      publishedAt: schema.articles.publishedAt,
      // Add new fields from articles table
      description: schema.articles.description,
      author: schema.articles.author,
      category: schema.articles.category,
      sentimentScore: schema.articles.sentimentScore,
      aiSummary: schema.articles.aiSummary,
      keywords: schema.articles.keywords,
      createdAt: schema.articles.createdAt, // from articles table
      updatedAt: schema.articles.updatedAt, // from articles table
      savedAt: schema.userSavedArticles.savedAt // from user_saved_articles table
    })
    .from(schema.articles)
    .innerJoin(schema.userSavedArticles, eq(schema.articles.id, schema.userSavedArticles.articleId))
    .where(eq(schema.userSavedArticles.userId, userId))
    .orderBy(desc(schema.userSavedArticles.savedAt));
  return result;
}

// TODO: Add basic CRUD functions for:
// - market_insights
// - data_sources
// - api_keys
// For now, focusing on refactoring existing functions.

export async function saveMarketInsight(
  title: string,
  content: string,
  insightType: string = "daily", // Default value for insightType
  confidenceScore: number = 0.85 // Default value for confidenceScore
) {
  const result = await db.insert(schema.marketInsights)
    .values({
      title,
      content,
      insightType,
      confidenceScore: String(confidenceScore), // Assuming schema might expect string for decimal
      // createdAt will be set by default by the DB
    })
    .returning();
  return result[0];
}

export async function getAllUsers() {
  // This function will replace the one from lib/database.ts that queried neon_auth.users_sync.
  // It should now query the userProfiles table (or users table if that's the final name).
  // Assuming userProfiles is the correct table as per other functions in this file.
  const result = await db.select({
    id: schema.userProfiles.userId, // Assuming userId is the primary identifier
    email: schema.userProfiles.email,
    name: schema.userProfiles.name,
    createdAt: schema.userProfiles.createdAt,
    // Add any other fields that were previously returned by getAllUsers from neon_auth.users_sync if needed.
  })
  .from(schema.userProfiles)
  .orderBy(desc(schema.userProfiles.createdAt));
  return result;
}

export async function saveUserArticle(userId: string, articleId: number) {
  const result = await db.insert(schema.userSavedArticles)
    .values({ userId, articleId })
    .onConflictDoNothing() // Or .onConflictDoUpdate if we need to update savedAt, for now, do nothing if already saved
    .returning({ savedAt: schema.userSavedArticles.savedAt });
  return result[0];
}

export async function removeUserArticle(userId: string, articleId: number) {
  const result = await db.delete(schema.userSavedArticles)
    .where(eq(schema.userSavedArticles.userId, userId) && eq(schema.userSavedArticles.articleId, articleId))
    .returning();
  return result.length > 0; // Return true if a row was deleted
}

export async function getInsights(limit = 10, offset = 0) {
  // Assuming marketInsights schema has createdAt. If not, order by 'id' or another appropriate field.
  return db.select()
    .from(schema.marketInsights)
    .orderBy(desc(schema.marketInsights.createdAt)) // Ensure createdAt exists and is appropriate for ordering
    .limit(limit)
    .offset(offset);
}

export async function getDatabaseStats() {
  const articlesCountResult = await db.select({ count: count() }).from(schema.articles);
  const insightsCountResult = await db.select({ count: count() }).from(schema.marketInsights);
  const usersCountResult = await db.select({ count: count() }).from(schema.userProfiles);

  return {
    articles: articlesCountResult[0]?.count || 0,
    insights: insightsCountResult[0]?.count || 0,
    users: usersCountResult[0]?.count || 0,
    // TODO: Add other stats if needed, e.g., saved articles, data sources
  };
}

// CRUD functions for API Keys
export async function getApiKeysByUserId(userId: string) {
  if (!userId) {
    // Handle cases where userId might be undefined or null early, though session check should prevent this.
    console.warn("getApiKeysByUserId called with no userId");
    return [];
  }
  return db.select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.userId, userId))
    .orderBy(desc(schema.apiKeys.createdAt));
}

export async function createApiKey(userId: string, serviceName: string, apiKey: string) {
  if (!userId) {
    throw new Error("User ID is required to create an API key.");
  }
  const result = await db.insert(schema.apiKeys)
    .values({
      userId,
      serviceName,
      apiKey, // Remember this should ideally be encrypted before this step
      status: 'unverified', // Default status
    })
    .returning();
  return result[0];
}

export async function deleteApiKeyById(apiKeyId: number, userId: string) {
  if (!userId) {
    // Important for security: ensure we are scoped to the user
    throw new Error("User ID is required for deletion.");
  }
  const result = await db.delete(schema.apiKeys)
    .where(eq(schema.apiKeys.id, apiKeyId) && eq(schema.apiKeys.userId, userId))
    .returning({ id: schema.apiKeys.id });
  return result.length > 0;
}

export async function updateApiKeyStatus(apiKeyId: number, userId: string, status: string) {
  if (!userId) {
    throw new Error("User ID is required for status update.");
  }
  const result = await db.update(schema.apiKeys)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.apiKeys.id, apiKeyId) && eq(schema.apiKeys.userId, userId))
    .returning();
  return result[0];
}