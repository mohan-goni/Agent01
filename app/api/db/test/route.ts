import { NextResponse } from "next/server"
import { db, getAllUsers } from "@/lib/db" // Import db and new getAllUsers
import { articles, marketInsights } from "@/db/schema" // Import table schemas
import { count } from "drizzle-orm"

export async function GET() {
  try {
    // Test basic connection by trying a simple query
    // The original testConnection and initializeTables are removed as per instructions.
    // A simple query can act as a connection test.
    await db.select({ count: count() }).from(articles).limit(1)

    // Get users from the userProfiles table (via getAllUsers in lib/db.ts)
    const users = await getAllUsers()

    // Get counts from our tables using Drizzle
    const articleCountResult = await db.select({ count: count() }).from(articles)
    const insightCountResult = await db.select({ count: count() }).from(marketInsights)

    // The schema information query is removed as it's complex to replicate with ORM
    // and not essential for this test route's core functionality of checking counts and users.

    return NextResponse.json({
      success: true,
      connection: "Database connection appears successful (checked via simple query)",
      // tables: "Schema information query removed for brevity in refactoring.", // Removed tables list
      stats: {
        users: users.length,
        articles: articleCountResult[0]?.count || 0,
        insights: insightCountResult[0]?.count || 0,
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
