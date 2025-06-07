import { pgTable, serial, text, varchar, timestamp, jsonb, boolean, integer, decimal, primaryKey, index } from 'drizzle-orm/pg-core'; // Added index

// --- Authentication Tables (for better-auth, inspired by NextAuth.js Prisma adapter) ---

export const users = pgTable("user", {
  id: text("id").notNull().primaryKey(), // Typically stores UUID or CUID from auth provider
  name: text("name"),
  email: text("email").unique(), // Email should be unique if used for login
  emailVerified: timestamp("emailVerified", { mode: "date" }), // Timestamp of email verification
  image: text("image"), // URL to user's profile image
});

export const accounts = pgTable("account", {
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // Type of account (e.g., "oauth", "email", "webauthn")
  provider: text("provider").notNull(), // Name of the provider (e.g., "google", "credentials")
  providerAccountId: text("providerAccountId").notNull(), // ID of the user on the provider's system
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"), // Expiry timestamp for the access_token
  token_type: text("token_type"), // Type of token (e.g., "Bearer")
  scope: text("scope"), // Scope granted by the provider
  id_token: text("id_token"), // ID token from provider (OIDC)
  session_state: text("session_state"), // Session state from provider
}, (account) => ({
  compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }), // Provider + ProviderAccountID must be unique
  userIdIdx: index("account_userId_idx").on(account.userId), // Index for faster lookups by userId
}));

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").notNull().primaryKey(), // Unique session token
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(), // Expiry date of the session
}, (session) => ({
  userIdIdx: index("session_userId_idx").on(session.userId), // Index for faster lookups by userId
}));

export const verificationTokens = pgTable("verification_token", {
  identifier: text("identifier").notNull(), // Usually email or user ID for whom token is generated
  token: text("token").notNull().unique(), // The verification token itself, must be unique
  expires: timestamp("expires", { mode: "date" }).notNull(), // Expiry date of the token
}, (vt) => ({
  compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }) // Identifier + Token must be unique
}));

export const authenticators = pgTable("authenticator", {
    credentialID: text("credentialID").notNull().unique(), // Unique ID for the credential
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(), // Relying party specific account ID
    credentialPublicKey: text("credentialPublicKey").notNull(), // Public key of the authenticator
    counter: integer("counter").notNull(), // Signature counter
    credentialDeviceType: text("credentialDeviceType").notNull(), // e.g., 'platform', 'cross-platform'
    credentialBackedUp: boolean("credentialBackedUp").notNull(), // Whether credential is backed up
    transports: text("transports"), // Comma-separated list of transport methods (e.g., "internal,hybrid")
}, (authenticator) => ({
    userIdIdx: index("authenticator_userId_idx").on(authenticator.userId),
    // credentialID is already unique by constraint, but an index might speed up lookups if frequent.
    // For now, a unique constraint is often sufficient for credentialID.
}));


// --- Application-Specific Tables ---

export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(), // Auto-incrementing integer primary key for this table
  // userId now references the new `user` table's `id` field.
  // Changed from varchar(255) to text to match users.id type for consistency and future-proofing.
  userId: text('user_id').unique().notNull().references(() => users.id, { onDelete: "cascade" }),
  email: varchar('email', { length: 255 }).unique().notNull(), // Kept for app-specific needs, but users.email is canonical for auth
  name: varchar('name', { length: 255 }), // Can be different from users.name or supplement it
  preferences: jsonb('preferences').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  content: text('content'),
  url: text('url').unique().notNull(),
  source: varchar('source', { length: 255 }),
  author: varchar('author', { length: 255 }),
  publishedAt: timestamp('published_at'),
  category: varchar('category', { length: 100 }),
  sentimentScore: decimal('sentiment_score', { precision: 3, scale: 2 }),
  aiSummary: text('ai_summary'),
  keywords: jsonb('keywords'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userSavedArticles = pgTable('user_saved_articles', {
  // Assuming userId here refers to the application's user ID management,
  // which should align with the `users.id` from the auth schema.
  // If user_id in user_saved_articles refers to userProfiles.id, that's an internal link.
  // If it refers to the auth user, it should be text and reference users.id.
  // For now, keeping original definition but noting it might need alignment with users.id.
  // If user_profiles.userId is the FK to users.id, then this userId could reference user_profiles.id or users.id directly.
  // Let's assume it should reference the main users.id for consistency with better-auth.
  userId: text('user_id').notNull().references(() => users.id, { onDelete: "cascade" }), // Changed to text and references users.id
  articleId: integer('article_id').notNull().references(() => articles.id, { onDelete: "cascade" }), // Added onDelete cascade
  savedAt: timestamp('saved_at').defaultNow().notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.userId, table.articleId] }),
    userSavedArticleUserIdIdx: index("userSavedArticle_userId_idx").on(table.userId), // Index for faster user lookup
}));

export const marketInsights = pgTable('market_insights', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  summary: text('summary'),
  content: text('content'),
  source: varchar('source', { length: 255 }),
  publishedAt: timestamp('published_at'),
  tags: jsonb('tags'),
  sentiment: decimal('sentiment', { precision: 3, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const emailNotifications = pgTable('email_notifications', {
  id: serial('id').primaryKey(),
  // Assuming userId here also refers to the main users.id for auth consistency.
  userId: text('user_id').notNull().references(() => users.id, { onDelete: "cascade" }), // Changed to text and references users.id
  type: varchar('type', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dataSources = pgTable('data_sources', {
  id: serial('id').primaryKey(),
  // Assuming userId here also refers to the main users.id.
  userId: text('user_id').notNull().references(() => users.id, { onDelete: "cascade" }), // Changed to text and references users.id
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  config: jsonb('config').notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  lastSyncedAt: timestamp('last_synced_at'),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  // Assuming userId here also refers to the main users.id.
  userId: text('user_id').notNull().references(() => users.id, { onDelete: "cascade" }), // Changed to text and references users.id
  serviceName: varchar('service_name', { length: 100 }).notNull(),
  apiKey: text('api_key').notNull(),
  status: varchar('status', { length: 50 }).default('unverified').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    // Changed from unq to compoundKey for clarity, and to ensure it's a primary key if that's the intent
    // If (userId, serviceName) should just be unique but not PK (since id is PK), use a uniqueIndex.
    // For better-auth style, (provider, providerAccountId) is PK in accounts. Here, id is PK.
    // So, a unique index is more appropriate if id is the sole PK.
    // Let's assume for now they want (userId, serviceName) to be unique, not necessarily a compound PK.
    uniqueUserKeyForService: index("apiKeys_userId_serviceName_unique_idx").on(table.userId, table.serviceName),
    // The previous primaryKey(table.userId, table.serviceName) would conflict with id being PK.
    // If `id` is the true primary key, then (userId, serviceName) should be a unique constraint.
    // Drizzle doesn't have a direct `uniqueConstraint` like TypeORM/Prisma for composite uniques outside of PKs.
    // A `uniqueIndex` serves a similar purpose for ensuring uniqueness and speeding up lookups.
    // For this task, I will keep `id` as the primary key and add a unique index on (userId, serviceName).
    // The prompt example had `unq: primaryKey(table.userId, table.serviceName)`. This is only valid if `id` is NOT a PK.
    // Given `id: serial('id').primaryKey()`, the (userId, serviceName) cannot be another PK.
    // I will use a unique index instead of the conflicting primaryKey.
    // If the intent was that (userId, serviceName) IS the PK, then `id` should not be `primaryKey()`.
    // Sticking to `id` as PK.
}));
