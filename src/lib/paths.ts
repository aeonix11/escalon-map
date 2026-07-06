import fs from "fs";
import path from "path";

export const DATA_DIR = path.join(process.cwd(), "data");
export const MAPS_DIR = path.join(DATA_DIR, "maps");
export const SETTINGS_PATH = path.join(DATA_DIR, "settings.json");
export const REGISTRY_PATH = path.join(MAPS_DIR, "registry.json");
export const MY_MAP_ID = "my-map";
export const MY_MAP_DB_PATH = path.join(MAPS_DIR, "my-map.db");
export const LEGACY_DB_PATH = path.join(process.cwd(), "escalon.db");

export function ensureDataDirs() {
  fs.mkdirSync(MAPS_DIR, { recursive: true });
}
