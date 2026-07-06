import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getDefaultMapId,
  getMapEntry,
  readRegistry,
  type MapEntry,
} from "@/lib/maps";
import { initDb, isMapEditable, persistDb, type AppDatabase } from "@/lib/db";
import { applySettingsToEnv, readSettings } from "@/lib/settings";

export interface MapContext {
  mapId: string;
  entry: MapEntry;
  db: AppDatabase;
  editable: boolean;
}

export async function resolveMapContext(): Promise<MapContext> {
  applySettingsToEnv(readSettings());
  const cookieStore = await cookies();
  const settings = readSettings();
  const mapId =
    cookieStore.get("escalon-active-map")?.value ??
    settings.activeMapId ??
    getDefaultMapId();

  const entry = getMapEntry(mapId) ?? readRegistry().maps[0];
  const db = await initDb(entry.id);
  const editable = isMapEditable(entry.id);

  return { mapId: entry.id, entry, db, editable };
}

export function readOnlyResponse() {
  return NextResponse.json(
    {
      error:
        "This map is view-only. Switch to My Map in Settings to make changes.",
    },
    { status: 403 }
  );
}

export function persistIfEditable(ctx: MapContext) {
  if (ctx.editable) persistDb(ctx.mapId);
}
