import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Load .env.local for local development

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql', // Specify 'postgresql'
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Ensure this is the Neon connection string
  },
  verbose: true,
  strict: true,
} satisfies Config;
