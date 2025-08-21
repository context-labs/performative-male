import { integer, pgTable, serial, text, timestamp, boolean as pgBool } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users_table', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  age: integer('age').notNull(),
  email: text('email').notNull().unique(),
});

export const postsTable = pgTable('posts_table', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .$onUpdate(() => new Date()),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;
export type InsertPost = typeof postsTable.$inferInsert;
export type SelectPost = typeof postsTable.$inferSelect;

// Leaderboard schema for performativity scoring
export const entriesTable = pgTable('entries', {
  id: serial('id').primaryKey(),
  // optional nickname if we later add
  name: text('name'),
  // base64 image (data URL). For Neon Postgres text is fine for demo purposes
  imageDataUrl: text('image_data_url').notNull(),
  // content hash (sha256) of decoded image bytes for deduplication
  imageHash: text('image_hash').unique(),
  // raw JSON result from annotator
  resultJson: text('result_json').notNull(),
  // computed score 0-10
  score: integer('score').notNull(),
  matchedKeywords: text('matched_keywords').notNull(), // comma-separated
  // optional social link and platform (limited to twitter/instagram/tiktok)
  socialPlatform: text('social_platform'),
  socialUrl: text('social_url'),
  // whether user opts into showing on podium
  podiumOptIn: pgBool('podium_opt_in').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type InsertEntry = typeof entriesTable.$inferInsert;
export type SelectEntry = typeof entriesTable.$inferSelect;

