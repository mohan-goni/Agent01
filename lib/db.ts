import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export { sql }

export async function getUserProfile(userId: string) {
  const result = await sql`
    SELECT * FROM user_profiles WHERE user_id = ${userId}
  `
  return result[0]
}

export async function createUserProfile(userId: string, email: string, name?: string) {
  const result = await sql`
    INSERT INTO user_profiles (user_id, email, name)
    VALUES (${userId}, ${email}, ${name})
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `
  return result[0]
}

export async function saveArticle(article: any) {
  const result = await sql`
    INSERT INTO articles (title, description, content, url, source, author, published_at, category)
    VALUES (${article.title}, ${article.description}, ${article.content}, ${article.url}, 
            ${article.source}, ${article.author}, ${article.publishedAt}, ${article.category})
    ON CONFLICT (url) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      content = EXCLUDED.content
    RETURNING *
  `
  return result[0]
}

export async function getArticles(limit = 20, offset = 0) {
  const result = await sql`
    SELECT * FROM articles 
    ORDER BY published_at DESC 
    LIMIT ${limit} OFFSET ${offset}
  `
  return result
}

export async function getUserSavedArticles(userId: string) {
  const result = await sql`
    SELECT a.* FROM articles a
    JOIN user_saved_articles usa ON a.id = usa.article_id
    WHERE usa.user_id = ${userId}
    ORDER BY usa.saved_at DESC
  `
  return result
}
