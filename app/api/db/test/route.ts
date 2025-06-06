import { NextResponse } from "next/server"
import { testConnection, sql, initializeTables, getAllUsers } from "@/lib/database"

export async function GET() {
  try {
    // Test basic connection
    const isConnected = await testConnection()

    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: "Database connection failed",
        },
        { status: 500 },
      )
    }

    // Initialize our custom tables
    await initializeTables()

    // Get existing schema info
    const tables = await sql`
      SELECT table_name, table_schema
      FROM information_schema.tables 
      WHERE table_schema IN ('public', 'neon_auth')
      ORDER BY table_schema, table_name
    `

    // Get users from existing auth table
    const users = await getAllUsers()

    // Get counts from our tables
    const articleCount = await sql`
      SELECT COUNT(*) as count FROM articles
    `.catch(() => [{ count: 0 }])

    const insightCount = await sql`
      SELECT COUNT(*) as count FROM market_insights  
    `.catch(() => [{ count: 0 }])

    return NextResponse.json({
      success: true,
      connection: "Database connected successfully",
      tables: tables.map((t) => `${t.table_schema}.${t.table_name}`),
      stats: {
        users: users.length,
        articles: articleCount[0]?.count || 0,
        insights: insightCount[0]?.count || 0,
      },
      existingUsers: users.slice(0, 5), // Show first 5 users
    })
  } catch (error) {
    console.error("Database test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown database error",
      },
      { status: 500 },
    )
  }
}
