import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

const DB_PATH = path.join(process.cwd(), "escalon.db");

let _sqlite: SqlJsDatabase | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _initPromise: Promise<ReturnType<typeof drizzle<typeof schema>>> | null =
  null;

const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS narratives (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    color_hex TEXT NOT NULL DEFAULT '#3b82f6',
    embedding BLOB,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fragments (
    id TEXT PRIMARY KEY,
    source_url TEXT NOT NULL,
    timestamp_seconds INTEGER NOT NULL,
    speaker TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    embedding BLOB,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fragment_narratives (
    fragment_id TEXT NOT NULL REFERENCES fragments(id) ON DELETE CASCADE,
    narrative_id TEXT NOT NULL REFERENCES narratives(id) ON DELETE CASCADE,
    PRIMARY KEY (fragment_id, narrative_id)
  );

  CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    narrative_id TEXT REFERENCES narratives(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_date TEXT NOT NULL,
    is_fuzzy INTEGER NOT NULL DEFAULT 0,
    fuzzy_range_months INTEGER NOT NULL DEFAULT 3,
    hemisphere TEXT NOT NULL,
    linked_fragment_id TEXT REFERENCES fragments(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rss_feeds (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    poll_interval_minutes INTEGER NOT NULL DEFAULT 60,
    last_fetched TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ai_news_signals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    source_name TEXT,
    url TEXT UNIQUE,
    published_at TEXT,
    embedding BLOB,
    status TEXT NOT NULL DEFAULT 'PENDING',
    matched_narrative_id TEXT REFERENCES narratives(id) ON DELETE SET NULL,
    reasoning_note TEXT,
    feed_id TEXT REFERENCES rss_feeds(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );
`;

async function runMigrations(sqlite: SqlJsDatabase) {
  const columns = sqlite.exec("PRAGMA table_info(ai_news_signals)");
  const hasFeedId =
    columns.length > 0 &&
    columns[0].values.some((row) => row[1] === "feed_id");
  if (!hasFeedId) {
    try {
      sqlite.exec(
        "ALTER TABLE ai_news_signals ADD COLUMN feed_id TEXT REFERENCES rss_feeds(id) ON DELETE SET NULL"
      );
    } catch {
      // column may already exist
    }
  }
}

async function createSqlite(): Promise<SqlJsDatabase> {
  const wasmDir = path.join(process.cwd(), "node_modules", "sql.js", "dist");
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(wasmDir, file),
  });

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    return new SQL.Database(fileBuffer);
  }
  return new SQL.Database();
}

export type AppDatabase = Awaited<ReturnType<typeof initDb>>;

export async function initDb() {
  if (_db) return _db;

  if (!_initPromise) {
    _initPromise = (async () => {
      _sqlite = await createSqlite();
      _sqlite.exec(CREATE_TABLES_SQL);
      runMigrations(_sqlite);
      _db = drizzle(_sqlite, { schema });
      return _db;
    })();
  }

  return _initPromise;
}

export function persistDb() {
  if (!_sqlite) return;
  const data = _sqlite.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}
