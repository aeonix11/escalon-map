import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { maps, profiles } from "@/lib/schema";
import { getDb } from "@/lib/db";
import {
  bootstrapUser,
  requireSessionUser,
} from "@/lib/auth";
import { applySettingsToEnv, maskApiKey, readSettings, writeSettings } from "@/lib/settings";

export async function GET() {
  applySettingsToEnv(readSettings());
  const user = await requireSessionUser();
  const map = await bootstrapUser(user);
  const db = getDb();

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  const settings = readSettings();

  return NextResponse.json({
    activeMapId: map.id,
    maps: [
      {
        id: map.id,
        name: map.name,
        editable: true,
        ownerLabel: null,
        kind: "database" as const,
        visibility: map.visibility,
        shareSlug: map.shareSlug,
      },
    ],
    apiKeys: {
      anthropicConfigured: Boolean(
        settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY
      ),
      voyageConfigured: Boolean(
        settings.voyageApiKey || process.env.VOYAGE_API_KEY
      ),
      anthropicMasked: maskApiKey(settings.anthropicApiKey),
      voyageMasked: maskApiKey(settings.voyageApiKey),
    },
    readOnly: false,
    user: {
      id: user.id,
      email: user.email,
      displayName: profile?.displayName ?? user.email?.split("@")[0],
    },
    narrativeFocusMode: profile?.narrativeFocusMode ?? "fade",
  });
}

export async function PUT(req: NextRequest) {
  const user = await requireSessionUser();
  const map = await bootstrapUser(user);
  const db = getDb();
  const body = await req.json();
  const current = readSettings();

  if (body.anthropicApiKey !== undefined || body.voyageApiKey !== undefined) {
    writeSettings({
      activeMapId: map.id,
      anthropicApiKey:
        body.anthropicApiKey !== undefined
          ? body.anthropicApiKey
          : current.anthropicApiKey,
      voyageApiKey:
        body.voyageApiKey !== undefined
          ? body.voyageApiKey
          : current.voyageApiKey,
      deepAnalysisQuickPrompt: current.deepAnalysisQuickPrompt,
      deepAnalysisDeepPrompt: current.deepAnalysisDeepPrompt,
    });
  }

  const mapUpdates: Partial<{
    name: string;
    visibility: "private" | "public";
  }> = {};

  if (body.mapName) {
    mapUpdates.name = body.mapName.trim();
  }
  if (body.visibility === "private" || body.visibility === "public") {
    mapUpdates.visibility = body.visibility;
  }

  if (Object.keys(mapUpdates).length > 0) {
    await db
      .update(maps)
      .set({ ...mapUpdates, updatedAt: new Date().toISOString() })
      .where(eq(maps.id, map.id));
  }

  if (body.narrativeFocusMode === "fade" || body.narrativeFocusMode === "hide") {
    await db
      .update(profiles)
      .set({ narrativeFocusMode: body.narrativeFocusMode })
      .where(eq(profiles.id, user.id));
  }

  if (body.displayName?.trim()) {
    await db
      .update(profiles)
      .set({ displayName: body.displayName.trim() })
      .where(eq(profiles.id, user.id));
  }

  return GET();
}
