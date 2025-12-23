import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { join } from 'path';

// Use a file in the project root for the SQLite database
const dbPath = join(process.cwd(), 'interview-ide.db');
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });

// Export schema for use in other files
export * from './schema';

