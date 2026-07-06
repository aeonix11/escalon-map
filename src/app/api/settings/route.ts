import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getDefaultMapId,
  readRegistry,
  renameMap,
  removeMap,
} from "@/lib/maps";
import {
  applySettingsToEnv,
  maskApiKey,
  readSettings,
  writeSettings,
} from "@/lib/settings";
import { invalidateMapCache } from "@/lib/db";

export async function GET() {
  applySettingsToEnv(readSettings());
  const settings = readSettings();
  const cookieStore = await cookies();
  const activeMapId =
    cookieStore.get("escalon-active-map")?.value ?? settings.activeMapId;

  const registry = readRegistry();
  const activeEntry =
    registry.maps.find((m) => m.id === activeMapId) ?? registry.maps[0];

  return NextResponse.json({
    activeMapId: activeEntry.id,
    maps: registry.maps.map((m) => ({
      id: m.id,
      name: m.name,
      editable: m.editable,
      ownerLabel: m.ownerLabel ?? null,
      kind: m.kind,
    })),
    apiKeys: {
      anthropicConfigured: Boolean(settings.anthropicApiKey),
      voyageConfigured: Boolean(settings.voyageApiKey),
      anthropicMasked: maskApiKey(settings.anthropicApiKey),
      voyageMasked: maskApiKey(settings.voyageApiKey),
    },
    readOnly: !activeEntry.editable,
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const current = readSettings();
  const next = writeSettings({
    activeMapId: body.activeMapId ?? current.activeMapId,
    anthropicApiKey:
      body.anthropicApiKey !== undefined
        ? body.anthropicApiKey
        : current.anthropicApiKey,
    voyageApiKey:
      body.voyageApiKey !== undefined ? body.voyageApiKey : current.voyageApiKey,
  });

  const cookieStore = await cookies();
  const activeMapId = body.activeMapId ?? next.activeMapId ?? getDefaultMapId();
  cookieStore.set("escalon-active-map", activeMapId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  if (body.mapName && body.renameMapId) {
    renameMap(body.renameMapId, body.mapName);
  }

  if (body.removeMapId) {
    const removed = removeMap(body.removeMapId);
    if (removed) invalidateMapCache(body.removeMapId);
  }

  if (body.activeMapId && body.activeMapId !== current.activeMapId) {
    invalidateMapCache(body.activeMapId);
  }

  return GET();
}
