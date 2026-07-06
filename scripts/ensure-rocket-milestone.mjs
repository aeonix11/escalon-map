/**
 * Inspect DB and ensure the rocketships milestone exists.
 * Run: node scripts/ensure-rocket-milestone.mjs
 */
import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT, "escalon.db");
const WASM_DIR = path.join(ROOT, "node_modules", "sql.js", "dist");

const ROCKET_TITLE = "Rocketships Launching Entry";

function nowIso() {
  return new Date().toISOString();
}

function query(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function run(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
}

async function main() {
  const SQL = await initSqlJs({
    locateFile: (f) => path.join(WASM_DIR, f),
  });

  if (!fs.existsSync(DB_PATH)) {
    console.log("No escalon.db — start the app once first.");
    process.exit(1);
  }

  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const all = query(
    db,
    "SELECT id, title, target_date, hemisphere FROM milestones ORDER BY created_at DESC"
  );
  console.log(`Milestones in DB: ${all.length}`);
  for (const row of all) {
    console.log(`  - [${row.hemisphere}] ${row.target_date} | ${row.title}`);
  }

  const existing = query(
    db,
    "SELECT id, title, target_date, hemisphere FROM milestones WHERE lower(title) LIKE '%rocket%' OR lower(title) LIKE '%launch%'"
  );

  if (existing.length > 0) {
    console.log("\nRocket-related milestone(s) already present:");
    for (const row of existing) {
      console.log(`  ✓ [${row.hemisphere}] ${row.target_date} | ${row.title}`);
    }
  } else {
    const id = randomUUID();
    const now = nowIso();
    run(
      db,
      `INSERT INTO milestones (
        id, narrative_id, title, description, target_date,
        is_fuzzy, fuzzy_range_months, hemisphere, linked_fragment_id, created_at
      ) VALUES (?, NULL, ?, ?, ?, 0, 3, 'LOWER_EARTHLY', NULL, ?)`,
      [
        id,
        ROCKET_TITLE,
        "Earthly milestone — rocket launch / space entry event.",
        "2024-11-01",
        now,
      ]
    );
    console.log(`\nAdded missing milestone: "${ROCKET_TITLE}" (LOWER_EARTHLY, 2024-11-01)`);
  }

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();
  console.log("\nDone. Restart the dev server, then refresh the app.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
