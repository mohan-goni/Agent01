import type { Config } from 'drizzle-kit';

// dotenv.config({ path: '.env.local' }); // Load .env.local for local development
// Assuming DATABASE_URL will be provided by the environment if needed,
// or drizzle-kit generate can work without it for schema parsing.

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql', // Specify 'postgresql'
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Ensure this is the Supabase connection string
  },
  verbose: true,
  strict: true,
} satisfies Config;