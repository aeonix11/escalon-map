import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  narratives,
  milestones,
  fragments,
  fragmentNarratives,
  aiNewsSignals,
  rssFeeds,
  notes,
} from "@/lib/schema";
import type { ExportData } from "@/lib/types";
import { nowIso } from "@/lib/types";
import { getMapEntry } from "@/lib/maps";
import { initDb } from "@/lib/db";
import { resolveMapContext } from "@/lib/mapContext";

export async function GET(req: NextRequest) {
  const forcedMapId = req.nextUrl.searchParams.get("mapId");
  const ctx = forcedMapId ? null : await resolveMapContext();
  const mapId = forcedMapId ?? ctx!.mapId;
  const entry = getMapEntry(mapId) ?? ctx!.entry;
  const db = await initDb(mapId);

  const includePersonal =
    req.nextUrl.searchParams.get("includePersonal") === "true";

  const allMilestones = includePersonal
    ? await db.select().from(milestones)
    : await db
        .select()
        .from(milestones)
        .where(eq(milestones.isPersonal, false));

  const allNotes = includePersonal
    ? await db.select().from(notes)
    : await db.select().from(notes).where(eq(notes.isPersonal, false));

  const data: ExportData = {
    version: 1,
    exportedAt: nowIso(),
    narratives: await db.select().from(narratives),
    fragments: await db.select().from(fragments),
    fragmentNarratives: await db.select().from(fragmentNarratives),
    milestones: allMilestones,
    aiNewsSignals: await db.select().from(aiNewsSignals),
    rssFeeds: await db.select().from(rssFeeds),
    notes: allNotes,
  };

  const safeName = entry.name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="escalon-map-${safeName}-${nowIso().slice(0, 10)}.json"`,
    },
  });
}
