import { supabase } from './supabaseClient';
import type { Database } from '../types/supabase';

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

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error.message);
    return null;
  }
  return data;
}

export async function createUserProfile(profileData: UserProfileInsert): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert(profileData)
    .select()
    .single();

  if (error) {
    console.error('Error creating user profile:', error.message);
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
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching data sources:', error.message);
    return [];
  }
  return data || [];
}

export async function createDataSource(
  userId: string,
  name: string,
  type: string,
  config: any,
  status: string = 'pending',
  isEnabled: boolean = true
): Promise<DataSource | null> {
  const dataSourceData: DataSourceInsert = {
    name,
    description: `${type} data source`,
    url: config.url || null,
  };

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
  dataSourceId: string,
  userId: string,
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
      .single();
    if (existingError) console.error('Error fetching existing data source for no-op update:', existingError.message);
    return existingData;
  }

  const { data, error } = await supabase
    .from('data_sources')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', dataSourceId)
    .select()
    .single();

  if (error) {
    console.error('Error updating data source:', error.message);
    return null;
  }
  return data;
}

export async function deleteDataSourceById(dataSourceId: string, userId: string): Promise<boolean> {
  if (!userId) {
    throw new Error("User ID is required for deleting a Data Source.");
  }
  const { error, count } = await supabase
    .from('data_sources')
    .delete({ count: 'exact' })
    .eq('id', dataSourceId);

  if (error) {
    console.error('Error deleting data source:', error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

export async function saveArticle(article: ArticleInsert): Promise<Article | null> {
  const { data, error } = await supabase
    .from('articles')
    .upsert(article, { onConflict: 'title' })
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
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching articles:', error.message);
    return [];
  }
  return data || [];
}

export async function getUserSavedArticles(userId: string): Promise<Array<Article & { saved_at: string | null }>> {
  const { data: savedJoins, error: savedJoinsError } = await supabase
    .from('user_saved_articles')
    .select('article_id, saved_at')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });

  if (savedJoinsError) {
    console.error('Error fetching user saved article links:', savedJoinsError.message);
    return [];
  }
  if (!savedJoins || savedJoins.length === 0) {
    return [];
  }

  const articleIds = savedJoins.map(j => j.article_id).filter(Boolean);

  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select('*')
    .in('id', articleIds);

  if (articlesError) {
    console.error('Error fetching full saved articles:', articlesError.message);
    return [];
  }

  const result = articles.map(article => {
    const joinInfo = savedJoins.find(j => j.article_id === article.id);
    return { ...article, saved_at: joinInfo?.saved_at || null };
  });

  result.sort((a, b) => {
    if (a.saved_at && b.saved_at) return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime();
    if (a.saved_at) return -1;
    if (b.saved_at) return 1;
    return 0;
  });

  return result;
}

export async function saveMarketInsight(
  title: string,
  content: string,
  insightType?: string,
  confidenceScore?: number
): Promise<MarketInsight | null> {
  const insightData: MarketInsightInsert = {
    title,
    content,
  };

  const { data, error } = await supabase
    .from('market_insights')
    .insert(insightData)
    .select()
    .single();

  if (error) {
    console.error('Error saving market insight:', error.message);
    return null;
  }
  return data;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all user profiles:', error.message);
    return [];
  }
  return data || [];
}

export async function saveUserArticle(userId: string, articleId: string): Promise<UserSavedArticle | null> {
  const insertData: UserSavedArticleInsert = { user_id: userId, article_id: articleId };

  const { data, error } = await supabase
    .from('user_saved_articles')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      console.log('Article already saved for user.');
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

export async function removeUserArticle(userId: string, articleId: string): Promise<boolean> {
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
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching insights:', error.message);
    return [];
  }
  return data || [];
}

export async function getDatabaseStats(): Promise<{ articles: number; insights: number; users: number }> {
  let articlesCount = 0;
  let insightsCount = 0;
  let usersCount = 0;

  const { count: artCount, error: artError } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true });
  if (artError) console.error("Error counting articles:", artError.message);
  else articlesCount = artCount ?? 0;

  const { count: insCount, error: insError } = await supabase
    .from('market_insights')
    .select('*', { count: 'exact', head: true });
  if (insError) console.error("Error counting insights:", insError.message);
  else insightsCount = insCount ?? 0;

  const { count: usrCount, error: usrError } = await supabase
    .from('user_profiles')
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
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching API keys:', error.message);
    return [];
  }
  return data || [];
}

export async function createApiKey(
  userId: string,
  serviceName: string,
  apiKey: string
): Promise<ApiKey | null> {
  const apiKeyData: ApiKeyInsert = {
    user_id: userId,
    api_key: apiKey,
  };

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

export async function deleteApiKeyById(apiKeyId: string, userId: string): Promise<boolean> {
  if (!userId) {
    throw new Error("User ID is required for deletion.");
  }
  const { error, count } = await supabase
    .from('api_keys')
    .delete({ count: 'exact' })
    .eq('id', apiKeyId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting API key:', error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

export async function updateApiKeyStatus(apiKeyId: string, userId: string, status: string): Promise<ApiKey | null> {
  if (!userId) {
    throw new Error("User ID is required for status update.");
  }
  const updates: Partial<ApiKeyUpdate> = { is_active: status === 'verified' };

  const { data, error } = await supabase
    .from('api_keys')
    .update(updates)
    .eq('id', apiKeyId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating API key status:', error.message);
    return null;
  }
  return data;
}