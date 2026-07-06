import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAPS_DIR = path.join(ROOT, "data", "maps");
const REGISTRY_PATH = path.join(MAPS_DIR, "registry.json");
const MY_MAP_DB = path.join(MAPS_DIR, "my-map.db");
const TEST_OWNER = "import-export-test";
const TEST_ID_PREFIX = "import-export-test";

function fail(msg) {
  console.error("FAIL:", msg);
  process.exit(1);
}

function pass(msg) {
  console.log("PASS:", msg);
}

function query(db, sql) {
  const result = db.exec(sql);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((row) =>
    Object.fromEntries(columns.map((c, i) => [c, row[i]]))
  );
}

function count(db, table) {
  const rows = query(db, `SELECT COUNT(*) AS n FROM ${table}`);
  return rows[0]?.n ?? 0;
}

async function openDb(filePath) {
  const SQL = await initSqlJs({
    locateFile: (f) => path.join(ROOT, "node_modules", "sql.js", "dist", f),
  });
  if (!fs.existsSync(filePath)) fail(`Database not found: ${filePath}`);
  return new SQL.Database(fs.readFileSync(filePath));
}

function buildExportFromDb(db) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    narratives: query(db, "SELECT * FROM narratives"),
    fragments: query(db, "SELECT * FROM fragments"),
    fragmentNarratives: query(db, "SELECT * FROM fragment_narratives"),
    milestones: query(
      db,
      "SELECT * FROM milestones WHERE is_personal = 0 OR is_personal IS NULL"
    ),
    aiNewsSignals: query(db, "SELECT * FROM ai_news_signals"),
    rssFeeds: query(db, "SELECT * FROM rss_feeds"),
    notes: query(
      db,
      "SELECT * FROM notes WHERE is_personal = 0 OR is_personal IS NULL"
    ),
  };
}

function loadExportIntoSqlite(db, data) {
  const tables = [
    "ai_news_signals",
    "notes",
    "milestones",
    "fragment_narratives",
    "fragments",
    "rss_feeds",
    "narratives",
  ];
  for (const table of tables) {
    db.run(`DELETE FROM ${table}`);
  }

  const insert = (table, rows) => {
    if (!rows?.length) return;
    const keys = Object.keys(rows[0]);
    const placeholders = keys.map(() => "?").join(", ");
    const stmt = db.prepare(
      `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`
    );
    for (const row of rows) {
      stmt.run(keys.map((k) => row[k]));
    }
    stmt.free();
  };

  insert(
    "narratives",
    (data.narratives ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      description: n.description ?? null,
      color_hex: n.color_hex ?? n.colorHex,
      embedding: n.embedding ?? null,
      created_at: n.created_at ?? n.createdAt,
    }))
  );
  insert(
    "fragments",
    (data.fragments ?? []).map((f) => ({
      id: f.id,
      source_url: f.source_url ?? f.sourceUrl,
      timestamp_seconds: f.timestamp_seconds ?? f.timestampSeconds,
      speaker: f.speaker,
      raw_text: f.raw_text ?? f.rawText,
      embedding: f.embedding ?? null,
      created_at: f.created_at ?? f.createdAt,
    }))
  );
  insert(
    "fragment_narratives",
    (data.fragmentNarratives ?? []).map((fn) => ({
      fragment_id: fn.fragment_id ?? fn.fragmentId,
      narrative_id: fn.narrative_id ?? fn.narrativeId,
    }))
  );
  insert(
    "milestones",
    (data.milestones ?? []).map((m) => ({
      id: m.id,
      narrative_id: m.narrative_id ?? m.narrativeId ?? null,
      title: m.title,
      description: m.description ?? null,
      target_date: m.target_date ?? m.targetDate,
      is_fuzzy: m.is_fuzzy ?? (m.isFuzzy ? 1 : 0),
      fuzzy_range_months: m.fuzzy_range_months ?? m.fuzzyRangeMonths ?? 3,
      is_personal: m.is_personal ?? (m.isPersonal ? 1 : 0),
      hemisphere: m.hemisphere,
      linked_fragment_id: m.linked_fragment_id ?? m.linkedFragmentId ?? null,
      created_at: m.created_at ?? m.createdAt,
    }))
  );
  insert(
    "ai_news_signals",
    (data.aiNewsSignals ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      summary: s.summary ?? null,
      source_name: s.source_name ?? s.sourceName ?? null,
      url: s.url ?? null,
      published_at: s.published_at ?? s.publishedAt ?? null,
      embedding: s.embedding ?? null,
      status: s.status,
      matched_narrative_id:
        s.matched_narrative_id ?? s.matchedNarrativeId ?? null,
      reasoning_note: s.reasoning_note ?? s.reasoningNote ?? null,
      feed_id: s.feed_id ?? s.feedId ?? null,
      created_at: s.created_at ?? s.createdAt,
    }))
  );
  insert(
    "rss_feeds",
    (data.rssFeeds ?? []).map((f) => ({
      id: f.id,
      url: f.url,
      label: f.label,
      poll_interval_minutes:
        f.poll_interval_minutes ?? f.pollIntervalMinutes ?? 60,
      last_fetched: f.last_fetched ?? f.lastFetched ?? null,
      created_at: f.created_at ?? f.createdAt,
    }))
  );
  insert(
    "notes",
    (data.notes ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      is_personal: n.is_personal ?? (n.isPersonal ? 1 : 0),
      pinned_date: n.pinned_date ?? n.pinnedDate ?? null,
      hemisphere: n.hemisphere ?? null,
      created_at: n.created_at ?? n.createdAt,
      updated_at: n.updated_at ?? n.updatedAt,
    }))
  );
}

function addSnapshotMap(displayName, ownerLabel, data) {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  let id = TEST_ID_PREFIX;
  let suffix = 2;
  while (registry.maps.some((m) => m.id === id)) {
    id = `${TEST_ID_PREFIX}-${suffix++}`;
  }
  const file = `${id}.json`;
  const snapshot = {
    ...data,
    ownerLabel,
    displayName,
    importedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(MAPS_DIR, file), JSON.stringify(snapshot, null, 2));
  const entry = {
    id,
    name: displayName,
    kind: "snapshot",
    file,
    editable: false,
    ownerLabel,
    addedAt: new Date().toISOString(),
  };
  registry.maps.push(entry);
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
  return entry;
}

function removeSnapshotMap(mapId) {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  const entry = registry.maps.find((m) => m.id === mapId);
  if (!entry) return;
  if (entry.file) {
    const p = path.join(MAPS_DIR, entry.file);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  registry.maps = registry.maps.filter((m) => m.id !== mapId);
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

async function testFilesystemRoundTrip() {
  console.log("\n=== Filesystem round-trip (export DB -> import snapshot -> reload) ===\n");

  const sourceDb = await openDb(MY_MAP_DB);
  const exportData = buildExportFromDb(sourceDb);

  if (!exportData.narratives.length || !exportData.milestones.length) {
    fail("Source map has no narratives or milestones to export");
  }

  const sourceCounts = {
    narratives: count(sourceDb, "narratives"),
    milestones: exportData.milestones.length,
    fragments: count(sourceDb, "fragments"),
    signals: count(sourceDb, "ai_news_signals"),
    notes: exportData.notes.length,
  };
  sourceDb.close();

  pass(
    `Exported from my-map.db: ${sourceCounts.narratives} narratives, ${sourceCounts.milestones} milestones, ${sourceCounts.fragments} fragments`
  );

  const entry = addSnapshotMap("Test Import Map", TEST_OWNER, exportData);
  pass(`Imported snapshot as registry entry "${entry.id}"`);

  const snapshotPath = path.join(MAPS_DIR, entry.file);
  if (!fs.existsSync(snapshotPath)) fail(`Snapshot file missing: ${snapshotPath}`);
  pass(`Snapshot file written: ${entry.file}`);

  const loaded = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  if (!loaded.narratives?.length || !loaded.milestones?.length) {
    fail("Snapshot JSON missing narratives or milestones");
  }

  const SQL = await initSqlJs({
    locateFile: (f) => path.join(ROOT, "node_modules", "sql.js", "dist", f),
  });
  const importedDb = new SQL.Database();
  importedDb.run(`
    CREATE TABLE narratives (id TEXT PRIMARY KEY, title TEXT, description TEXT, color_hex TEXT, embedding BLOB, created_at TEXT);
    CREATE TABLE fragments (id TEXT PRIMARY KEY, source_url TEXT, timestamp_seconds INTEGER, speaker TEXT, raw_text TEXT, embedding BLOB, created_at TEXT);
    CREATE TABLE fragment_narratives (fragment_id TEXT, narrative_id TEXT);
    CREATE TABLE milestones (id TEXT PRIMARY KEY, narrative_id TEXT, title TEXT, description TEXT, target_date TEXT, is_fuzzy INTEGER, fuzzy_range_months INTEGER, is_personal INTEGER, hemisphere TEXT, linked_fragment_id TEXT, created_at TEXT);
    CREATE TABLE ai_news_signals (id TEXT PRIMARY KEY, title TEXT, summary TEXT, source_name TEXT, url TEXT, published_at TEXT, embedding BLOB, status TEXT, matched_narrative_id TEXT, reasoning_note TEXT, feed_id TEXT, created_at TEXT);
    CREATE TABLE rss_feeds (id TEXT PRIMARY KEY, url TEXT, label TEXT, poll_interval_minutes INTEGER, last_fetched TEXT, created_at TEXT);
    CREATE TABLE notes (id TEXT PRIMARY KEY, title TEXT, content TEXT, is_personal INTEGER, pinned_date TEXT, hemisphere TEXT, created_at TEXT, updated_at TEXT);
  `);
  loadExportIntoSqlite(importedDb, loaded);

  const importedCounts = {
    narratives: count(importedDb, "narratives"),
    milestones: count(importedDb, "milestones"),
    fragments: count(importedDb, "fragments"),
    signals: count(importedDb, "ai_news_signals"),
    notes: count(importedDb, "notes"),
  };
  importedDb.close();

  for (const key of Object.keys(sourceCounts)) {
    if (sourceCounts[key] !== importedCounts[key]) {
      fail(
        `Count mismatch for ${key}: exported ${sourceCounts[key]}, imported ${importedCounts[key]}`
      );
    }
  }
  pass("Imported snapshot counts match exported data");

  const sampleTitle = exportData.milestones[0].title;
  const found = loaded.milestones.some((m) => m.title === sampleTitle);
  if (!found) fail(`Sample milestone "${sampleTitle}" missing from snapshot`);
  pass(`Sample milestone preserved: "${sampleTitle}"`);

  removeSnapshotMap(entry.id);
  if (fs.existsSync(snapshotPath)) fail("Snapshot file not cleaned up");
  pass("Test snapshot removed from registry and disk");

  return sourceCounts;
}

async function testHttpApi() {
  console.log("\n=== HTTP API (/api/export + /api/maps) ===\n");

  const base = "http://localhost:3000";
  let health;
  try {
    health = await fetch(`${base}/api/data`, { signal: AbortSignal.timeout(3000) });
  } catch {
    console.log("SKIP: Dev server not running on localhost:3000");
    return;
  }

  if (!health.ok) fail(`GET /api/data returned ${health.status}`);
  pass("Dev server is reachable");

  const exportRes = await fetch(`${base}/api/export?mapId=my-map`);
  if (!exportRes.ok) fail(`GET /api/export returned ${exportRes.status}`);
  const exported = await exportRes.json();
  if (!exported.narratives?.length || !exported.milestones?.length) {
    fail("HTTP export missing narratives or milestones");
  }
  pass(
    `HTTP export: ${exported.narratives.length} narratives, ${exported.milestones.length} milestones`
  );

  const importRes = await fetch(`${base}/api/maps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...exported,
      displayName: "HTTP Test Import",
      ownerLabel: TEST_OWNER,
    }),
  });
  if (!importRes.ok) {
    const err = await importRes.text();
    fail(`POST /api/maps returned ${importRes.status}: ${err}`);
  }
  const imported = await importRes.json();
  if (!imported.ok || !imported.map?.id) fail("POST /api/maps did not return map id");
  pass(`HTTP import created map "${imported.map.id}" (${imported.map.name})`);

  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  const entry = registry.maps.find((m) => m.id === imported.map.id);
  if (!entry || entry.kind !== "snapshot") {
    fail("Imported map not found in registry as snapshot");
  }
  pass("Imported map registered as read-only snapshot");

  const snapshotFile = path.join(MAPS_DIR, entry.file);
  if (!fs.existsSync(snapshotFile)) fail(`HTTP import snapshot file missing`);
  const snapshot = JSON.parse(fs.readFileSync(snapshotFile, "utf8"));
  if (snapshot.milestones.length !== exported.milestones.length) {
    fail("HTTP import milestone count does not match export");
  }
  pass("HTTP import snapshot matches export milestone count");

  removeSnapshotMap(imported.map.id);
  pass("HTTP test snapshot cleaned up");
}

const counts = await testFilesystemRoundTrip();
await testHttpApi();

console.log("\nAll import/export checks passed.");
console.log(
  `Your map (${counts.milestones} milestones) can be exported and re-imported as a shared snapshot without touching My Map.\n`
);
