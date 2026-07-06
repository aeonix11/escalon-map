import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/lib/seed";
import {
  narratives,
  milestones,
  fragments,
  fragmentNarratives,
  aiNewsSignals,
  rssFeeds,
  notes,
  milestoneSuggestions,
} from "@/lib/schema";
import {
  persistIfEditable,
  resolveMapContext,
} from "@/lib/mapContext";

export async function GET() {
  const ctx = await resolveMapContext();
  if (ctx.editable) {
    await seedIfEmpty(ctx.db);
    persistIfEditable(ctx);
  }

  const [allNarratives, allMilestones, allFragments, allSignals, allFeeds, allNotes, allSuggestions] =
    await Promise.all([
      ctx.db.select().from(narratives),
      ctx.db.select().from(milestones),
      ctx.db.select().from(fragments),
      ctx.db.select().from(aiNewsSignals),
      ctx.db.select().from(rssFeeds),
      ctx.db.select().from(notes),
      ctx.db.select().from(milestoneSuggestions),
    ]);

  return NextResponse.json({
    narratives: allNarratives,
    milestones: allMilestones,
    milestoneSuggestions: allSuggestions,
    fragments: allFragments,
    signals: allSignals,
    feeds: allFeeds,
    notes: allNotes,
    map: {
      id: ctx.mapId,
      name: ctx.entry.name,
      editable: ctx.editable,
      ownerLabel: ctx.entry.ownerLabel ?? null,
    },
  });
}
