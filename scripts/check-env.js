const requiredEnvVars = [
  "DATABASE_URL",
  "gemini_api_key",
  "news_api",
  "mediastack",
  "tavily",
  "Gnews",
  "BETTER_AUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "EMAIL_SERVICE_API_KEY",
  "EMAIL_FROM",
]

function checkEnvironment() {
  console.log("🔍 Checking environment variables...")

  const missing = []
  const present = []

  requiredEnvVars.forEach((envVar) => {
    if (process.env[envVar]) {
      present.push(envVar)
    } else {
      missing.push(envVar)
    }
  })

  console.log(`✅ Found ${present.length} environment variables:`)
  present.forEach((env) => console.log(`   ✓ ${env}`))

  if (missing.length > 0) {
    console.log(`❌ Missing ${missing.length} environment variables:`)
    missing.forEach((env) => console.log(`   ✗ ${env}`))
    console.log("\n💡 Please check your .env.local file and ensure all required variables are set.")
    return false
  }

  console.log("🎉 All environment variables are configured!")
  return true
}

if (require.main === module) {
  checkEnvironment()
}

module.exports = { checkEnvironment }
