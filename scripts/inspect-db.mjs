import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT, "escalon.db");
const OUT_PATH = path.join(ROOT, "db-inspect.json");

const SQL = await initSqlJs({
  locateFile: (f) => path.join(ROOT, "node_modules", "sql.js", "dist", f),
});

if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(OUT_PATH, JSON.stringify({ error: "no db" }, null, 2));
  process.exit(0);
}

const db = new SQL.Database(fs.readFileSync(DB_PATH));

function query(sql) {
  const result = db.exec(sql);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((row) =>
    Object.fromEntries(columns.map((c, i) => [c, row[i]]))
  );
}

const out = {
  milestones: query(
    "SELECT id, title, target_date, hemisphere, narrative_id, is_fuzzy, created_at FROM milestones ORDER BY created_at DESC"
  ),
  rocketSearch: query(
    "SELECT id, title, target_date, hemisphere FROM milestones WHERE title LIKE '%rocket%' OR title LIKE '%Rocket%'"
  ),
  counts: {
    milestones: query("SELECT COUNT(*) AS n FROM milestones")[0]?.n,
    narratives: query("SELECT COUNT(*) AS n FROM narratives")[0]?.n,
    fragments: query("SELECT COUNT(*) AS n FROM fragments")[0]?.n,
    signals: query("SELECT COUNT(*) AS n FROM ai_news_signals")[0]?.n,
  },
};

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
db.close();
