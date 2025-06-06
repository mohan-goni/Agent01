const { spawn } = require("child_process")
const { checkEnvironment } = require("./check-env")

async function startDevServer() {
  console.log("🚀 Starting Market Intelligence Platform...\n")

  // Check environment variables
  if (!checkEnvironment()) {
    console.log("\n❌ Environment check failed. Please fix the issues above before starting the server.")
    process.exit(1)
  }

  console.log("\n🔄 Starting Next.js development server...")

  // Start Next.js dev server
  const nextProcess = spawn("npx", ["next", "dev"], {
    stdio: "inherit",
    shell: true,
  })

  nextProcess.on("error", (error) => {
    console.error("❌ Failed to start development server:", error)
    process.exit(1)
  })

  nextProcess.on("close", (code) => {
    console.log(`\n🛑 Development server stopped with code ${code}`)
  })

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down development server...")
    nextProcess.kill("SIGINT")
  })
}

startDevServer()
