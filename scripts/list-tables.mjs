import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SQL = await initSqlJs({
  locateFile: (f) => path.join(ROOT, "node_modules", "sql.js", "dist", f),
});

for (const rel of ["data/maps/my-map.db", "escalon.db"]) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) {
    console.log(rel, "MISSING");
    continue;
  }
  const db = new SQL.Database(fs.readFileSync(p));
  const tables = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log(rel, tables[0]?.values.map((r) => r[0]).join(", "));
  const pragma = db.exec("PRAGMA table_info(milestones)");
  console.log(
    "  milestones cols:",
    pragma[0]?.values.map((r) => r[1]).join(", ")
  );
  db.close();
}
