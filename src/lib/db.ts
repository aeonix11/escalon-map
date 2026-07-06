import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import fs from "fs";
import path from "path";
import * as schema from "./schema";
import {
  getDbPathForMap,
  getMapEntry,
  getDefaultMapId,
  readSnapshotExport,
} from "./maps";
import { MY_MAP_ID } from "./paths";
import { loadExportIntoSqlite } from "./loadExportIntoDb";

interface DbCacheEntry {
  sqlite: SqlJsDatabase;
  db: ReturnType<typeof drizzle<typeof schema>>;
  diskMtimeMs: number | null;
  editable: boolean;
}

const DB_CACHE = new Map<string, DbCacheEntry>();

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
    is_personal INTEGER NOT NULL DEFAULT 0,
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

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'Untitled',
    content TEXT NOT NULL DEFAULT '',
    is_personal INTEGER NOT NULL DEFAULT 0,
    pinned_date TEXT,
    hemisphere TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS milestone_suggestions (
    id TEXT PRIMARY KEY,
    narrative_id TEXT REFERENCES narratives(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_date TEXT NOT NULL,
    is_fuzzy INTEGER NOT NULL DEFAULT 0,
    fuzzy_range_months INTEGER NOT NULL DEFAULT 3,
    hemisphere TEXT NOT NULL,
    reasoning TEXT,
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

function getDiskMtime(dbPath: string): number {
  if (!fs.existsSync(dbPath)) return 0;
  return fs.statSync(dbPath).mtimeMs;
}

async function createSqliteFromFile(dbPath: string): Promise<SqlJsDatabase> {
  const wasmDir = path.join(process.cwd(), "node_modules", "sql.js", "dist");
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(wasmDir, file),
  });

  let sqlite: SqlJsDatabase;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlite = new SQL.Database(fileBuffer);
  } else {
    sqlite = new SQL.Database();
  }
  sqlite.exec("PRAGMA foreign_keys = ON;");
  return sqlite;
}

async function createEmptySqlite(): Promise<SqlJsDatabase> {
  const wasmDir = path.join(process.cwd(), "node_modules", "sql.js", "dist");
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(wasmDir, file),
  });
  const sqlite = new SQL.Database();
  sqlite.exec("PRAGMA foreign_keys = ON;");
  return sqlite;
}

function runMigrations(sqlite: SqlJsDatabase) {
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

  const milestoneColumns = sqlite.exec("PRAGMA table_info(milestones)");
  const hasIsPersonal =
    milestoneColumns.length > 0 &&
    milestoneColumns[0].values.some((row) => row[1] === "is_personal");
  if (!hasIsPersonal) {
    try {
      sqlite.exec(
        "ALTER TABLE milestones ADD COLUMN is_personal INTEGER NOT NULL DEFAULT 0"
      );
    } catch {
      // column may already exist
    }
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS milestone_suggestions (
      id TEXT PRIMARY KEY,
      narrative_id TEXT REFERENCES narratives(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_date TEXT NOT NULL,
      is_fuzzy INTEGER NOT NULL DEFAULT 0,
      fuzzy_range_months INTEGER NOT NULL DEFAULT 3,
      hemisphere TEXT NOT NULL,
      reasoning TEXT,
      created_at TEXT NOT NULL
    );
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled',
      content TEXT NOT NULL DEFAULT '',
      is_personal INTEGER NOT NULL DEFAULT 0,
      pinned_date TEXT,
      hemisphere TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

async function loadDatabaseMap(mapId: string): Promise<DbCacheEntry> {
  const entry = getMapEntry(mapId);
  if (!entry || entry.kind !== "database") {
    throw new Error(`Map ${mapId} is not a database map`);
  }

  const dbPath = getDbPathForMap(entry);
  const diskMtime = getDiskMtime(dbPath);
  const cached = DB_CACHE.get(mapId);
  if (cached && cached.diskMtimeMs === diskMtime) return cached;

  const sqlite = await createSqliteFromFile(dbPath);
  sqlite.exec(CREATE_TABLES_SQL);
  runMigrations(sqlite);
  const db = drizzle(sqlite, { schema });

  const next: DbCacheEntry = {
    sqlite,
    db,
    diskMtimeMs: diskMtime,
    editable: entry.editable,
  };
  DB_CACHE.set(mapId, next);
  return next;
}

async function loadSnapshotMap(mapId: string): Promise<DbCacheEntry> {
  const cached = DB_CACHE.get(mapId);
  if (cached) return cached;

  const entry = getMapEntry(mapId);
  if (!entry || entry.kind !== "snapshot") {
    throw new Error(`Map ${mapId} is not a snapshot map`);
  }

  const sqlite = await createEmptySqlite();
  sqlite.exec(CREATE_TABLES_SQL);
  runMigrations(sqlite);
  loadExportIntoSqlite(sqlite, readSnapshotExport(entry));
  const db = drizzle(sqlite, { schema });

  const next: DbCacheEntry = {
    sqlite,
    db,
    diskMtimeMs: null,
    editable: false,
  };
  DB_CACHE.set(mapId, next);
  return next;
}

export type AppDatabase = ReturnType<typeof drizzle<typeof schema>>;

export function isMapEditable(mapId: string): boolean {
  const entry = getMapEntry(mapId);
  return entry?.editable ?? mapId === MY_MAP_ID;
}

export async function initDb(mapId?: string) {
  const id = mapId ?? getDefaultMapId();
  const entry = getMapEntry(id);
  if (!entry) {
    return (await loadDatabaseMap(getDefaultMapId())).db;
  }
  if (entry.kind === "snapshot") {
    return (await loadSnapshotMap(id)).db;
  }
  return (await loadDatabaseMap(id)).db;
}

export function persistDb(mapId?: string) {
  const id = mapId ?? getDefaultMapId();
  if (!isMapEditable(id)) return;

  const cached = DB_CACHE.get(id);
  if (!cached?.sqlite) return;

  const entry = getMapEntry(id);
  if (!entry || entry.kind !== "database") return;

  const dbPath = getDbPathForMap(entry);
  const data = cached.sqlite.export();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(data));
  cached.diskMtimeMs = getDiskMtime(dbPath);
}

export function invalidateMapCache(mapId: string) {
  const cached = DB_CACHE.get(mapId);
  cached?.sqlite.close();
  DB_CACHE.delete(mapId);
}
