import { NextResponse } from "next/server";
import type { Map } from "@/lib/schema";
import type { AppDatabase } from "@/lib/db";
import { getDb } from "@/lib/db";
import {
  bootstrapUser,
  getMapByShareSlug,
  getSessionUser,
  requireSessionUser,
} from "@/lib/auth";
import { applySettingsToEnv, readSettings } from "@/lib/settings";

export interface MapContext {
  mapId: string;
  map: Map;
  db: AppDatabase;
  editable: boolean;
  userId: string | null;
}

export async function resolveOwnerMapContext(): Promise<MapContext> {
  applySettingsToEnv(readSettings());
  const user = await requireSessionUser();
  const map = await bootstrapUser(user);
  return {
    mapId: map.id,
    map,
    db: getDb(),
    editable: true,
    userId: user.id,
  };
}

export async function resolvePublicMapContext(
  shareSlug: string
): Promise<MapContext | null> {
  const map = await getMapByShareSlug(shareSlug);
  if (!map || map.visibility !== "public") return null;
  return {
    mapId: map.id,
    map,
    db: getDb(),
    editable: false,
    userId: (await getSessionUser())?.id ?? null,
  };
}

export function readOnlyResponse() {
  return NextResponse.json(
    { error: "This map is view-only." },
    { status: 403 }
  );
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
