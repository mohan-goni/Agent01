import { pgTable, serial, text, varchar, timestamp, jsonb, boolean, integer, decimal, primaryKey } from 'drizzle-orm/pg-core'; // Removed textArray as jsonb will be used for keywords

export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
  preferences: jsonb('preferences').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'), // Added
  content: text('content'),
  url: text('url').unique().notNull(), // Changed from varchar(2048) to text
  source: varchar('source', { length: 255 }),
  author: varchar('author', { length: 255 }), // Added
  publishedAt: timestamp('published_at'),
  category: varchar('category', { length: 100 }), // Added
  sentimentScore: decimal('sentiment_score', { precision: 3, scale: 2 }), // Added
  aiSummary: text('ai_summary'), // Added
  keywords: jsonb('keywords'), // Added as jsonb to store an array of strings
  createdAt: timestamp('created_at').defaultNow().notNull(), // Ensured .notNull()
  updatedAt: timestamp('updated_at').defaultNow().notNull(), // Ensured .notNull()
});

export const userSavedArticles = pgTable('user_saved_articles', {
  userId: varchar('user_id', { length: 255 }).notNull(),
  articleId: integer('article_id').notNull().references(() => articles.id),
  savedAt: timestamp('saved_at').defaultNow().notNull(), // Added .notNull() for consistency
  // Define composite primary key
}, (table) => ({
    pk: primaryKey(table.userId, table.articleId)
}));

export const marketInsights = pgTable('market_insights', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  summary: text('summary'),
  content: text('content'),
  source: varchar('source', { length: 255 }),
  publishedAt: timestamp('published_at'),
  tags: jsonb('tags'), // Store tags as a JSON array of strings
  sentiment: decimal('sentiment', { precision: 3, scale: 2 }), // e.g., -1.00 to 1.00
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const emailNotifications = pgTable('email_notifications', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // e.g., 'market_update', 'saved_article_digest'
  status: varchar('status', { length: 50 }).default('pending').notNull(), // Added .notNull()
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dataSources = pgTable('data_sources', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(), // Assuming sources are user-specific
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // e.g., 'api', 'web-scraper'
  config: jsonb('config').notNull(), // Store API keys, URLs, scraper settings etc.
  status: varchar('status', { length: 50 }).default('pending').notNull(), // Added .notNull()
  lastSyncedAt: timestamp('last_synced_at'),
  isEnabled: boolean('is_enabled').default(true).notNull(), // Added .notNull()
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(), // Assuming keys are user-specific
  serviceName: varchar('service_name', { length: 100 }).notNull(),
  apiKey: text('api_key').notNull(), // Consider encryption at application level before storing
  status: varchar('status', { length: 50 }).default('unverified').notNull(), // Added .notNull()
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // Unique constraint for user and service
}, (table) => ({
    unq: primaryKey(table.userId, table.serviceName)
}));
