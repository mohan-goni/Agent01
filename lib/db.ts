import { supabase } from './supabaseClient'; // Adjusted path
import type { Database } from '../types/supabase'; // Adjusted path

// Define types for easier usage, using Supabase generated types
type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert'];
type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];

type DataSource = Database['public']['Tables']['data_sources']['Row'];
type DataSourceInsert = Database['public']['Tables']['data_sources']['Insert'];
type DataSourceUpdate = Database['public']['Tables']['data_sources']['Update'];

type Article = Database['public']['Tables']['articles']['Row'];
type ArticleInsert = Database['public']['Tables']['articles']['Insert'];

type UserSavedArticle = Database['public']['Tables']['user_saved_articles']['Row'];
type UserSavedArticleInsert = Database['public']['Tables']['user_saved_articles']['Insert'];

type MarketInsight = Database['public']['Tables']['market_insights']['Row'];
type MarketInsightInsert = Database['public']['Tables']['market_insights']['Insert'];

type ApiKey = Database['public']['Tables']['api_keys']['Row'];
type ApiKeyInsert = Database['public']['Tables']['api_keys']['Insert'];
type ApiKeyUpdate = Database['public']['Tables']['api_keys']['Update'];


// Note: The original schema used 'userId' in many places.
// Supabase types might use 'id' for primary keys and 'user_id' for foreign keys to auth.users.id or a local 'users' table's UUID.
// We will assume 'user_id' is the column name in tables that links to the authenticated Supabase user's ID (UUID).
// If user_profiles.id is the Supabase user ID, then other tables should reference that.
// The types/supabase.ts will be the source of truth for column names.
// For this rewrite, I'll assume FKs to the user are named `user_id` and are of UUID type.

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId) // Assuming 'id' in user_profiles IS the Supabase auth user ID (UUID)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error.message);
    return null;
  }
  return data;
}

export async function createUserProfile(profileData: UserProfileInsert): Promise<UserProfile | null> {
  // Ensure `id` in profileData is the Supabase auth user ID.
  // Supabase typically handles user creation in auth.users table.
  // This function likely creates a profile linked to an existing auth user.
  const { data, error } = await supabase
    .from('user_profiles')
    .insert(profileData)
    .select()
    .single();

  if (error) {
    console.error('Error creating user profile:', error.message);
    // Consider upsert if profile might already exist for a user_id
    // const { data: upsertData, error: upsertError } = await supabase
    //   .from('user_profiles')
    //   .upsert(profileData, { onConflict: 'user_id' }) // Assuming user_id is unique constraint for upsert
    //   .select()
    //   .single();
    // if (upsertError) {
    //   console.error('Error upserting user profile:', upsertError.message);
    //   return null;
    // }
    // return upsertData;
    return null;
  }
  return data;
}

export async function getDataSourcesByUserId(userId: string): Promise<DataSource[]> {
  if (!userId) {
    console.warn("getDataSourcesByUserId called with no userId");
    return [];
  }
  const { data, error } = await supabase
    .from('data_sources')
    .select('*')
    .eq('user_id', userId) // Assuming 'user_id' column exists and is the FK to auth user
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching data sources:', error.message);
    return [];
  }
  return data || [];
}

export async function createDataSource(dataSourceData: DataSourceInsert): Promise<DataSource | null> {
  if (!dataSourceData.user_id) {
    throw new Error("User ID is required to create a Data Source.");
  }
  const { data, error } = await supabase
    .from('data_sources')
    .insert(dataSourceData)
    .select()
    .single();

  if (error) {
    console.error('Error creating data source:', error.message);
    return null;
  }
  return data;
}

export async function updateDataSource(
  dataSourceId: number, // Assuming 'id' is the PK of data_sources
  userId: string, // For authorization check
  updates: Partial<DataSourceUpdate>
): Promise<DataSource | null> {
  if (!userId) {
    throw new Error("User ID is required for updating a Data Source.");
  }
  if (Object.keys(updates).length === 0) {
    const { data: existingData, error: existingError } = await supabase
      .from('data_sources')
      .select('*')
      .eq('id', dataSourceId)
      .eq('user_id', userId) // Ensure user owns this data source
      .single();
    if (existingError) console.error('Error fetching existing data source for no-op update:', existingError.message);
    return existingData;
  }

  const { data, error } = await supabase
    .from('data_sources')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', dataSourceId)
    .eq('user_id', userId) // Ensure user owns this data source
    .select()
    .single();

  if (error) {
    console.error('Error updating data source:', error.message);
    return null;
  }
  return data;
}

export async function deleteDataSourceById(dataSourceId: number, userId: string): Promise<boolean> {
  if (!userId) {
    throw new Error("User ID is required for deleting a Data Source.");
  }
  const { error, count } = await supabase
    .from('data_sources')
    .delete({ count: 'exact' })
    .eq('id', dataSourceId)
    .eq('user_id', userId); // Ensure user owns this data source

  if (error) {
    console.error('Error deleting data source:', error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

export async function saveArticle(article: ArticleInsert): Promise<Article | null> {
  // Supabase client handles date string conversion for timestamp fields
  // Ensure `published_at` is in a format Supabase accepts (ISO 8601 string) if it's a date.
  // JSONB fields like 'keywords' should be passed as JS objects/arrays.

  // Upsert based on unique 'url'
  const { data, error } = await supabase
    .from('articles')
    .upsert(article, { onConflict: 'url' })
    .select()
    .single();

  if (error) {
    console.error('Error saving article (upsert):', error.message);
    return null;
  }
  return data;
}

export async function getArticles(limit = 20, offset = 0): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('published_at', { ascending: false, nullsFirst: false }) // Assuming published_at exists
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching articles:', error.message);
    return [];
  }
  return data || [];
}

export async function getUserSavedArticles(userId: string): Promise<Array<Article & { saved_at: string | null }>> {
  // This requires a join or a view if we want to get full article details along with saved_at.
  // Supabase doesn't do joins in the client library as complex as Drizzle.
  // Option 1: Fetch saved article IDs, then fetch articles. (N+1 problem)
  // Option 2: Create a DB view or function and call it via rpc.
  // Option 3: Fetch from user_saved_articles and then enrich (client-side join or separate queries).

  // For simplicity, let's fetch from user_saved_articles and then get full articles.
  // This is less efficient but direct with basic JS client.
  // A more performant way would be to use an RPC function in Supabase.

  const { data: savedJoins, error: savedJoinsError } = await supabase
    .from('user_saved_articles')
    .select('article_id, saved_at')
    .eq('user_id', userId) // Assuming user_id column on user_saved_articles
    .order('saved_at', { ascending: false });

  if (savedJoinsError) {
    console.error('Error fetching user saved article links:', savedJoinsError.message);
    return [];
  }
  if (!savedJoins || savedJoins.length === 0) {
    return [];
  }

  const articleIds = savedJoins.map(j => j.article_id);

  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select('*')
    .in('id', articleIds);

  if (articlesError) {
    console.error('Error fetching full saved articles:', articlesError.message);
    return [];
  }

  // Combine articles with their saved_at times
  const result = articles.map(article => {
    const joinInfo = savedJoins.find(j => j.article_id === article.id);
    return { ...article, saved_at: joinInfo?.saved_at || null };
  });

  // Re-sort by saved_at because the .in() query doesn't preserve the original order
  result.sort((a, b) => {
    if (a.saved_at && b.saved_at) return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime();
    if (a.saved_at) return -1;
    if (b.saved_at) return 1;
    return 0;
  });

  return result;
}


export async function saveMarketInsight(insightData: MarketInsightInsert): Promise<MarketInsight | null> {
  // Supabase types for market_insights include: id, title, summary, content, source, published_at, tags, sentiment, created_at, updated_at
  // The old function had insightType, confidenceScore. These are not in the Supabase type.
  // We should use the columns defined in `types/supabase.ts` for `MarketInsightInsert`.
  // If `insightType` and `confidenceScore` are needed, the `market_insights` table type definition needs them.
  // For now, assuming they are not part of the current Supabase schema for `market_insights`.
  // If they were, the insert would be:
  // const { data, error } = await supabase.from('market_insights').insert({ title, content, insight_type: insightType, confidence_score: confidenceScore, ...other_valid_fields }).select().single();

  // Sticking to the columns available in MarketInsightInsert from types/supabase.ts
  const { data, error } = await supabase
    .from('market_insights')
    .insert(insightData) // Pass the full object matching the type
    .select()
    .single();

  if (error) {
    console.error('Error saving market insight:', error.message);
    return null;
  }
  return data;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  // Queries user_profiles table, assuming user_profiles.id is the Supabase auth user ID.
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*') // Selects all columns as defined in UserProfile type
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all user profiles:', error.message);
    return [];
  }
  return data || [];
}

export async function saveUserArticle(userId: string, articleId: number): Promise<UserSavedArticle | null> {
  const insertData: UserSavedArticleInsert = { user_id: userId, article_id: articleId };
  // Supabase client handles default for saved_at if DB schema is set up for it.
  // Or provide it: insertData.saved_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('user_saved_articles')
    .insert(insertData)
    .select()
    .single(); // Assuming onConflictDoNothing is handled by DB policy or trigger, or we expect unique constraint failure
               // For explicit onConflictDoNothing, Supabase requires an upsert with ignoreDuplicates: true
               // const { data, error } = await supabase.from('user_saved_articles').upsert(insertData, { onConflict: 'user_id,article_id', ignoreDuplicates: true }).select().single();
               // This depends on 'user_id,article_id' being the primary key or a unique constraint.
               // types/supabase.ts implies user_saved_articles has (user_id, article_id) as PK implicitly by structure.

  if (error) {
    // If it's a unique constraint violation (23505), it means it's already saved.
    if (error.code === '23505') {
      console.log('Article already saved for user.');
      // Optionally, fetch the existing record if needed, or just return null/special object
      const { data: existingData, error: existingError } = await supabase
        .from('user_saved_articles')
        .select('*')
        .eq('user_id', userId)
        .eq('article_id', articleId)
        .single();
      if (existingError) {
        console.error('Error fetching existing saved article:', existingError.message);
        return null;
      }
      return existingData;
    }
    console.error('Error saving user article:', error.message);
    return null;
  }
  return data;
}

export async function removeUserArticle(userId: string, articleId: number): Promise<boolean> {
  const { error, count } = await supabase
    .from('user_saved_articles')
    .delete({ count: 'exact' })
    .eq('user_id', userId)
    .eq('article_id', articleId);

  if (error) {
    console.error('Error removing user article:', error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

export async function getInsights(limit = 10, offset = 0): Promise<MarketInsight[]> {
  const { data, error } = await supabase
    .from('market_insights')
    .select('*')
    .order('created_at', { ascending: false }) // Assuming created_at exists
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching insights:', error.message);
    return [];
  }
  return data || [];
}

export async function getDatabaseStats(): Promise<{ articles: number; insights: number; users: number }> {
  // Note: count() in Supabase can be done with { count: 'exact' } on select
  // For multiple counts, it's often multiple queries or an RPC.

  let articlesCount = 0;
  let insightsCount = 0;
  let usersCount = 0;

  const { count: artCount, error: artError } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true }); // head:true makes it not return data
  if (artError) console.error("Error counting articles:", artError.message);
  else articlesCount = artCount ?? 0;

  const { count: insCount, error: insError } = await supabase
    .from('market_insights')
    .select('*', { count: 'exact', head: true });
  if (insError) console.error("Error counting insights:", insError.message);
  else insightsCount = insCount ?? 0;

  const { count: usrCount, error: usrError } = await supabase
    .from('user_profiles') // Assuming user_profiles represents users for stats
    .select('*', { count: 'exact', head: true });
  if (usrError) console.error("Error counting users:", usrError.message);
  else usersCount = usrCount ?? 0;

  return {
    articles: articlesCount,
    insights: insightsCount,
    users: usersCount,
  };
}

export async function getApiKeysByUserId(userId: string): Promise<ApiKey[]> {
  if (!userId) {
    console.warn("getApiKeysByUserId called with no userId");
    return [];
  }
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', userId) // Assuming user_id column
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching API keys:', error.message);
    return [];
  }
  return data || [];
}

export async function createApiKey(apiKeyData: ApiKeyInsert): Promise<ApiKey | null> {
  if (!apiKeyData.user_id) {
    throw new Error("User ID is required to create an API key.");
  }
  // apiKeyData.api_key should ideally be encrypted by the caller before storing if sensitive
  const { data, error } = await supabase
    .from('api_keys')
    .insert(apiKeyData)
    .select()
    .single();

  if (error) {
    console.error('Error creating API key:', error.message);
    return null;
  }
  return data;
}

export async function deleteApiKeyById(apiKeyId: number, userId: string): Promise<boolean> {
  if (!userId) {
    throw new Error("User ID is required for deletion.");
  }
  const { error, count } = await supabase
    .from('api_keys')
    .delete({ count: 'exact' })
    .eq('id', apiKeyId) // Assuming 'id' is the PK of api_keys
    .eq('user_id', userId); // Ensure user owns this key

  if (error) {
    console.error('Error deleting API key:', error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

export async function updateApiKeyStatus(apiKeyId: number, userId: string, status: string): Promise<ApiKey | null> {
  if (!userId) {
    throw new Error("User ID is required for status update.");
  }
  const updates: Partial<ApiKeyUpdate> = { status, updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from('api_keys')
    .update(updates)
    .eq('id', apiKeyId)
    .eq('user_id', userId) // Ensure user owns this key
    .select()
    .single();

  if (error) {
    console.error('Error updating API key status:', error.message);
    return null;
  }
  return data;
}