import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const codeSnippets = sqliteTable('code_snippets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  language: text('language').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type CodeSnippet = typeof codeSnippets.$inferSelect;
export type NewCodeSnippet = typeof codeSnippets.$inferInsert;

