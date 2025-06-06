const { neon } = require("@neondatabase/serverless")

async function setupDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is not set")
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    console.log("🔄 Setting up database tables...")

    // Create articles table
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

    console.log("✅ Database tables created successfully!")

    // Test connection
    const result = await sql`SELECT NOW() as current_time`
    console.log("✅ Database connection test successful:", result[0].current_time)

    console.log("🎉 Database setup complete!")
  } catch (error) {
    console.error("❌ Database setup failed:", error)
    process.exit(1)
  }
}

setupDatabase()
