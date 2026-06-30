/**
 * Standalone RSS poller for Escalon Map.
 * Run via poll.cmd or Windows Task Scheduler.
 */
import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT, "escalon.db");
const WASM_DIR = path.join(ROOT, "node_modules", "sql.js", "dist");

function nowIso() {
  return new Date().toISOString();
}

function decodeXmlEntities(text) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function extractTag(block, tag) {
  const match = block.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i")
  );
  return match ? decodeXmlEntities(match[1]) : null;
}

function normalizeDate(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

function parseRssXml(xml) {
  const items = [];
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link =
      extractTag(block, "link") ?? extractTag(block, "guid") ?? null;
    if (!title || !link) continue;
    const description =
      extractTag(block, "description") ??
      extractTag(block, "content") ??
      extractTag(block, "summary") ??
      null;
    const publishedAt =
      normalizeDate(extractTag(block, "pubDate")) ??
      normalizeDate(extractTag(block, "published")) ??
      normalizeDate(extractTag(block, "updated")) ??
      null;
    items.push({ title, link, description, publishedAt });
  }

  if (items.length === 0) {
    const entryRegex = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = extractTag(block, "title");
      const linkMatch = block.match(/<link[^>]*href=["']([^"']+)["']/i);
      const link = linkMatch?.[1] ?? extractTag(block, "id");
      if (!title || !link) continue;
      const description =
        extractTag(block, "summary") ?? extractTag(block, "content") ?? null;
      const publishedAt =
        normalizeDate(extractTag(block, "published")) ??
        normalizeDate(extractTag(block, "updated")) ??
        null;
      items.push({ title, link, description, publishedAt });
    }
  }

  return items;
}

function isFeedStale(feed, force = false) {
  if (force) return true;
  if (!feed.last_fetched) return true;
  const last = Date.parse(feed.last_fetched);
  if (Number.isNaN(last)) return true;
  const intervalMs = feed.poll_interval_minutes * 60 * 1000;
  return Date.now() - last >= intervalMs;
}

async function fetchFeedItems(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "EscalonMap/1.0 RSS Poller",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  return parseRssXml(xml);
}

function runQuery(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function runExec(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
}

async function main() {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(WASM_DIR, file),
  });

  if (!fs.existsSync(DB_PATH)) {
    console.log("No escalon.db found. Open the app first to initialize.");
    process.exit(0);
  }

  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  // Ensure rss_feeds table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS rss_feeds (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      poll_interval_minutes INTEGER NOT NULL DEFAULT 60,
      last_fetched TEXT,
      created_at TEXT NOT NULL
    );
  `);

  try {
    db.exec(
      "ALTER TABLE ai_news_signals ADD COLUMN feed_id TEXT REFERENCES rss_feeds(id) ON DELETE SET NULL"
    );
  } catch {
    // column may already exist
  }

  const feeds = runQuery(db, "SELECT * FROM rss_feeds");
  if (feeds.length === 0) {
    console.log("No RSS feeds configured.");
    db.close();
    process.exit(0);
  }

  let totalAdded = 0;
  const now = nowIso();

  for (const feed of feeds) {
    if (!isFeedStale(feed)) {
      console.log(`Skip ${feed.label} (not stale)`);
      continue;
    }

    try {
      console.log(`Fetching ${feed.label}...`);
      const items = await fetchFeedItems(feed.url);
      let added = 0;

      for (const item of items) {
        const existing = runQuery(
          db,
          "SELECT id FROM ai_news_signals WHERE url = ? LIMIT 1",
          [item.link]
        );
        if (existing.length > 0) continue;

        const id = crypto.randomUUID();
        runExec(
          db,
          `INSERT INTO ai_news_signals (
            id, title, summary, source_name, url, published_at,
            status, feed_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
          [
            id,
            item.title,
            item.description,
            feed.label,
            item.link,
            item.publishedAt ?? now,
            feed.id,
            now,
          ]
        );
        added += 1;
      }

      runExec(
        db,
        "UPDATE rss_feeds SET last_fetched = ? WHERE id = ?",
        [now, feed.id]
      );

      totalAdded += added;
      console.log(`  +${added} new signal(s)`);
    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();

  console.log(`Done. ${totalAdded} new signal(s) total.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
