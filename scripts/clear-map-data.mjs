/**
 * Clears map content (narratives, milestones, fragments) but keeps
 * RSS feeds and signals that came from those feeds (e.g. BBC).
 */
import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT, "escalon.db");
const WASM_DIR = path.join(ROOT, "node_modules", "sql.js", "dist");

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.log("No escalon.db found.");
    process.exit(0);
  }

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(WASM_DIR, file),
  });

  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  const count = (sql) => {
    const r = db.exec(sql);
    return r[0]?.values[0]?.[0] ?? 0;
  };

  db.exec("DELETE FROM milestones");
  db.exec("DELETE FROM fragment_narratives");
  db.exec("DELETE FROM fragments");
  db.exec("DELETE FROM narratives");
  db.exec("DELETE FROM ai_news_signals WHERE feed_id IS NULL");

  const feeds = count("SELECT COUNT(*) FROM rss_feeds");
  const signals = count("SELECT COUNT(*) FROM ai_news_signals");

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();

  console.log("Map data cleared.");
  console.log(`  RSS feeds kept: ${feeds}`);
  console.log(`  Feed signals kept: ${signals}`);
  console.log("Restart the dev server if it is running, then refresh the app.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
