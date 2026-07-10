import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
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
  type MilestoneWithNarratives,
} from "@/lib/schema";

export async function setMilestoneNarratives(
  milestoneId: string,
  narrativeIds: string[]
) {
  const db = getDb();
  await db
    .delete(milestoneNarratives)
    .where(eq(milestoneNarratives.milestoneId, milestoneId));
  if (narrativeIds.length === 0) return;
  await db.insert(milestoneNarratives).values(
    narrativeIds.map((narrativeId) => ({ milestoneId, narrativeId }))
  );
}

export async function fetchMapPayload(mapId: string) {
  const db = getDb();

  const [
    allNarratives,
    rawMilestones,
    allFragments,
    allSignals,
    allFeeds,
    allNotes,
    allSuggestions,
  ] = await Promise.all([
    db.select().from(narratives).where(eq(narratives.mapId, mapId)),
    db.select().from(milestones).where(eq(milestones.mapId, mapId)),
    db.select().from(fragments).where(eq(fragments.mapId, mapId)),
    db.select().from(aiNewsSignals).where(eq(aiNewsSignals.mapId, mapId)),
    db.select().from(rssFeeds).where(eq(rssFeeds.mapId, mapId)),
    db.select().from(notes).where(eq(notes.mapId, mapId)),
    db
      .select()
      .from(milestoneSuggestions)
      .where(eq(milestoneSuggestions.mapId, mapId)),
  ]);

  const milestoneIds = rawMilestones.map((m) => m.id);
  const fragmentIds = allFragments.map((f) => f.id);

  const [allMilestoneNarratives, allFragmentNarratives] = await Promise.all([
    milestoneIds.length > 0
      ? db
          .select()
          .from(milestoneNarratives)
          .where(inArray(milestoneNarratives.milestoneId, milestoneIds))
      : Promise.resolve([]),
    fragmentIds.length > 0
      ? db
          .select()
          .from(fragmentNarratives)
          .where(inArray(fragmentNarratives.fragmentId, fragmentIds))
      : Promise.resolve([]),
  ]);

  const narrativeIdsByMilestone = new Map<string, string[]>();
  for (const link of allMilestoneNarratives) {
    const arr = narrativeIdsByMilestone.get(link.milestoneId) ?? [];
    arr.push(link.narrativeId);
    narrativeIdsByMilestone.set(link.milestoneId, arr);
  }

  const milestonesWithNarratives: MilestoneWithNarratives[] = rawMilestones.map(
    (m) => ({
      ...m,
      narrativeIds: narrativeIdsByMilestone.get(m.id) ?? [],
    })
  );

  return {
    narratives: allNarratives,
    milestones: milestonesWithNarratives,
    milestoneSuggestions: allSuggestions,
    fragments: allFragments,
    fragmentNarratives: allFragmentNarratives,
    signals: allSignals,
    feeds: allFeeds,
    notes: allNotes,
  };
}
