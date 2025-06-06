import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

const sql = neon(process.env.DATABASE_URL)

// Test database connection
export async function testConnection() {
  try {
    const result = await sql`SELECT NOW() as current_time`
    console.log("Database connected successfully:", result[0])
    return true
  } catch (error) {
    console.error("Database connection failed:", error)
    return false
  }
}

// Check if our custom tables exist, if not create them
export async function initializeTables() {
  try {
    // Create articles table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT,
        url TEXT UNIQUE NOT NULL,
        source VARCHAR(255),
        author VARCHAR(255),
        published_at TIMESTAMP,
        category VARCHAR(100),
        sentiment_score DECIMAL(3,2),
        ai_summary TEXT,
        keywords TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create user saved articles table
    await sql`
      CREATE TABLE IF NOT EXISTS user_saved_articles (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        article_id INTEGER REFERENCES articles(id),
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, article_id)
      )
    `

    // Create market insights table
    await sql`
      CREATE TABLE IF NOT EXISTS market_insights (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        insight_type VARCHAR(50),
        confidence_score DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create email notifications table
    await sql`
      CREATE TABLE IF NOT EXISTS email_notifications (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        content TEXT,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'sent'
      )
    `

    console.log("Tables initialized successfully")
    return true
  } catch (error) {
    console.error("Error initializing tables:", error)
    return false
  }
}

// User operations using existing neon_auth.users_sync table
export async function getUser(userId: string) {
  try {
    const result = await sql`
      SELECT * FROM neon_auth.users_sync WHERE id = ${userId} AND deleted_at IS NULL
    `
    return result[0] || null
  } catch (error) {
    console.error("Error fetching user:", error)
    return null
  }
}

export async function getAllUsers() {
  try {
    const result = await sql`
      SELECT id, email, name, created_at FROM neon_auth.users_sync 
      WHERE deleted_at IS NULL 
      ORDER BY created_at DESC
    `
    return result
  } catch (error) {
    console.error("Error fetching users:", error)
    return []
  }
}

// Article operations
export async function saveArticle(article: {
  title: string
  description: string
  content: string
  url: string
  source: string
  author?: string
  publishedAt: string
  category: string
}) {
  try {
    const result = await sql`
      INSERT INTO articles (title, description, content, url, source, author, published_at, category)
      VALUES (
        ${article.title}, 
        ${article.description}, 
        ${article.content}, 
        ${article.url}, 
        ${article.source}, 
        ${article.author || "Unknown"}, 
        ${article.publishedAt}, 
        ${article.category}
      )
      ON CONFLICT (url) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        content = EXCLUDED.content
      RETURNING *
    `
    return result[0]
  } catch (error) {
    console.error("Error saving article:", error)
    return null
  }
}

export async function getArticles(limit = 20, offset = 0, category?: string) {
  try {
    let query
    if (category) {
      query = sql`
        SELECT * FROM articles 
        WHERE category = ${category}
        ORDER BY published_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      query = sql`
        SELECT * FROM articles 
        ORDER BY published_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `
    }
    return await query
  } catch (error) {
    console.error("Error fetching articles:", error)
    return []
  }
}

export async function getUserSavedArticles(userId: string) {
  try {
    const result = await sql`
      SELECT a.*, usa.saved_at FROM articles a
      JOIN user_saved_articles usa ON a.id = usa.article_id
      WHERE usa.user_id = ${userId}
      ORDER BY usa.saved_at DESC
    `
    return result
  } catch (error) {
    console.error("Error fetching saved articles:", error)
    return []
  }
}

export async function saveUserArticle(userId: string, articleId: number) {
  try {
    const result = await sql`
      INSERT INTO user_saved_articles (user_id, article_id)
      VALUES (${userId}, ${articleId})
      ON CONFLICT (user_id, article_id) DO NOTHING
      RETURNING *
    `
    return result[0]
  } catch (error) {
    console.error("Error saving user article:", error)
    return null
  }
}

// Market insights operations
export async function saveMarketInsight(title: string, content: string, insightType = "daily", confidenceScore = 0.85) {
  try {
    const result = await sql`
      INSERT INTO market_insights (title, content, insight_type, confidence_score)
      VALUES (${title}, ${content}, ${insightType}, ${confidenceScore})
      RETURNING *
    `
    return result[0]
  } catch (error) {
    console.error("Error saving market insight:", error)
    return null
  }
}

export async function getMarketInsights(limit = 10) {
  try {
    const result = await sql`
      SELECT * FROM market_insights 
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `
    return result
  } catch (error) {
    console.error("Error fetching market insights:", error)
    return []
  }
}

export { sql }
