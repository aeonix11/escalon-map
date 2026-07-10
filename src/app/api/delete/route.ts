import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  narratives,
  milestones,
  fragments,
  fragmentNarratives,
  milestoneNarratives,
  aiNewsSignals,
  rssFeeds,
  notes,
  milestoneSuggestions,
} from "@/lib/schema";
import { readOnlyResponse, resolveOwnerMapContext } from "@/lib/mapContext";

export async function POST(req: NextRequest) {
  const ctx = await resolveOwnerMapContext();
  if (!ctx.editable) return readOnlyResponse();

  const db = ctx.db;
  const body = await req.json();
  const { type, id } = body;

  if (!type || !id) {
    return NextResponse.json(
      { error: "type and id are required" },
      { status: 400 }
    );
  }

  if (type === "milestone") {
    const [existing] = await db
      .select()
      .from(milestones)
      .where(eq(milestones.id, id))
      .limit(1);
    if (!existing || existing.mapId !== ctx.mapId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await db.delete(milestoneNarratives).where(eq(milestoneNarratives.milestoneId, id));
    await db.delete(milestones).where(eq(milestones.id, id));
    return NextResponse.json({ ok: true });
  }

  if (type === "narrative") {
    await db
      .update(aiNewsSignals)
      .set({ matchedNarrativeId: null })
      .where(eq(aiNewsSignals.matchedNarrativeId, id));
    await db
      .update(milestoneSuggestions)
      .set({ narrativeId: null })
      .where(eq(milestoneSuggestions.narrativeId, id));
    await db.delete(milestoneNarratives).where(eq(milestoneNarratives.narrativeId, id));
    await db.delete(fragmentNarratives).where(eq(fragmentNarratives.narrativeId, id));
    await db.delete(narratives).where(eq(narratives.id, id));
    return NextResponse.json({ ok: true });
  }

  if (type === "fragment") {
    await db.delete(fragmentNarratives).where(eq(fragmentNarratives.fragmentId, id));
    await db.delete(fragments).where(eq(fragments.id, id));
    return NextResponse.json({ ok: true });
  }

  if (type === "signal") {
    await db.delete(aiNewsSignals).where(eq(aiNewsSignals.id, id));
    return NextResponse.json({ ok: true });
  }

  if (type === "feed") {
    await db.delete(rssFeeds).where(eq(rssFeeds.id, id));
    return NextResponse.json({ ok: true });
  }

  if (type === "note") {
    await db.delete(notes).where(eq(notes.id, id));
    return NextResponse.json({ ok: true });
  }

  if (type === "milestone_suggestion") {
    await db.delete(milestoneSuggestions).where(eq(milestoneSuggestions.id, id));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
