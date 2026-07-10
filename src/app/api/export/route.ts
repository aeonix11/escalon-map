import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nowIso } from "@/lib/types";
import type { ExportData } from "@/lib/types";
import { fetchMapPayload } from "@/lib/mapData";
import { resolveOwnerMapContext } from "@/lib/mapContext";

export async function GET(req: NextRequest) {
  const ctx = await resolveOwnerMapContext();
  const includePersonal =
    req.nextUrl.searchParams.get("includePersonal") === "true";

  const payload = await fetchMapPayload(ctx.mapId);

  const allMilestones = includePersonal
    ? payload.milestones
    : payload.milestones.filter((m) => !m.isPersonal);

  const allNotes = includePersonal
    ? payload.notes
    : payload.notes.filter((n) => !n.isPersonal);

  const milestoneNarratives = allMilestones.flatMap((m) =>
    m.narrativeIds.map((narrativeId) => ({
      milestoneId: m.id,
      narrativeId,
    }))
  );

  const data: ExportData = {
    version: 2,
    exportedAt: nowIso(),
    narratives: payload.narratives,
    fragments: payload.fragments,
    fragmentNarratives: payload.fragmentNarratives,
    milestoneNarratives,
    milestones: allMilestones.map(({ narrativeIds: _n, ...m }) => m),
    milestoneSuggestions: payload.milestoneSuggestions,
    aiNewsSignals: payload.signals,
    rssFeeds: payload.feeds,
    notes: allNotes,
  };

  const safeName = ctx.map.name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="escalon-map-${safeName}-${nowIso().slice(0, 10)}.json"`,
    },
  });
}
