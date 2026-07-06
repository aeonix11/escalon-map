import fs from "fs";
import path from "path";
import type { ExportData } from "./types";
import { nowIso } from "./types";
import {
  ensureDataDirs,
  LEGACY_DB_PATH,
  MAPS_DIR,
  MY_MAP_DB_PATH,
  MY_MAP_ID,
  REGISTRY_PATH,
} from "./paths";

export interface MapEntry {
  id: string;
  name: string;
  kind: "database" | "snapshot";
  file?: string;
  editable: boolean;
  ownerLabel?: string;
  addedAt?: string;
}

interface MapRegistry {
  maps: MapEntry[];
}

const DEFAULT_REGISTRY: MapRegistry = {
  maps: [
    {
      id: MY_MAP_ID,
      name: "My Map",
      kind: "database",
      editable: true,
    },
  ],
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function migrateLegacyDatabase() {
  ensureDataDirs();
  if (fs.existsSync(LEGACY_DB_PATH) && !fs.existsSync(MY_MAP_DB_PATH)) {
    fs.copyFileSync(LEGACY_DB_PATH, MY_MAP_DB_PATH);
  }
}

export function readRegistry(): MapRegistry {
  ensureDataDirs();
  migrateLegacyDatabase();

  if (!fs.existsSync(REGISTRY_PATH)) {
    writeRegistry(DEFAULT_REGISTRY);
    return DEFAULT_REGISTRY;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8")) as MapRegistry;
    if (!parsed.maps?.some((m) => m.id === MY_MAP_ID)) {
      parsed.maps = [DEFAULT_REGISTRY.maps[0], ...parsed.maps];
    }
    return parsed;
  } catch {
    writeRegistry(DEFAULT_REGISTRY);
    return DEFAULT_REGISTRY;
  }
}

export function writeRegistry(registry: MapRegistry) {
  ensureDataDirs();
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

export function getMapEntry(mapId: string): MapEntry | undefined {
  return readRegistry().maps.find((m) => m.id === mapId);
}

export function getDefaultMapId(): string {
  return MY_MAP_ID;
}

export function getDbPathForMap(entry: MapEntry): string {
  if (entry.id === MY_MAP_ID) return MY_MAP_DB_PATH;
  return path.join(MAPS_DIR, `${entry.id}.db`);
}

export function getSnapshotPath(entry: MapEntry): string {
  if (!entry.file) {
    throw new Error(`Snapshot map ${entry.id} is missing a file reference`);
  }
  return path.join(MAPS_DIR, entry.file);
}

export function addSnapshotMap(
  displayName: string,
  ownerLabel: string,
  data: ExportData
): MapEntry {
  const registry = readRegistry();
  const baseId = slugify(ownerLabel || displayName) || "shared-map";
  let id = baseId;
  let suffix = 2;
  while (registry.maps.some((m) => m.id === id)) {
    id = `${baseId}-${suffix++}`;
  }

  const file = `${id}.json`;
  fs.writeFileSync(
    path.join(MAPS_DIR, file),
    JSON.stringify(
      {
        ...data,
        ownerLabel,
        displayName,
        importedAt: nowIso(),
      },
      null,
      2
    )
  );

  const entry: MapEntry = {
    id,
    name: displayName,
    kind: "snapshot",
    file,
    editable: false,
    ownerLabel,
    addedAt: nowIso(),
  };

  registry.maps.push(entry);
  writeRegistry(registry);
  return entry;
}

export function renameMap(mapId: string, name: string): MapEntry | null {
  if (!name.trim()) return null;
  const registry = readRegistry();
  const entry = registry.maps.find((m) => m.id === mapId);
  if (!entry) return null;
  entry.name = name.trim();
  writeRegistry(registry);
  return entry;
}

export function removeMap(mapId: string): boolean {
  if (mapId === MY_MAP_ID) return false;

  const registry = readRegistry();
  const entry = registry.maps.find((m) => m.id === mapId);
  if (!entry) return false;

  if (entry.kind === "snapshot" && entry.file) {
    const snapshotPath = path.join(MAPS_DIR, entry.file);
    if (fs.existsSync(snapshotPath)) fs.unlinkSync(snapshotPath);
  } else {
    const dbPath = getDbPathForMap(entry);
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  }

  registry.maps = registry.maps.filter((m) => m.id !== mapId);
  writeRegistry(registry);
  return true;
}

export function readSnapshotExport(entry: MapEntry): ExportData {
  const raw = JSON.parse(fs.readFileSync(getSnapshotPath(entry), "utf8")) as ExportData;
  return raw;
}
