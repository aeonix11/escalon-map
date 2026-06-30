import { NextResponse } from "next/server";
import { initDb, persistDb } from "@/lib/db";
import {
  narratives,
  milestones,
  fragments,
  fragmentNarratives,
  aiNewsSignals,
  rssFeeds,
} from "@/lib/schema";
import { seedIfEmpty } from "@/lib/seed";

export async function GET() {
  const db = await initDb();
  await seedIfEmpty(db);
  persistDb();

  const [allNarratives, allMilestones, allFragments, allSignals, allFeeds] =
    await Promise.all([
      db.select().from(narratives),
      db.select().from(milestones),
      db.select().from(fragments),
      db.select().from(aiNewsSignals),
      db.select().from(rssFeeds),
    ]);

  return NextResponse.json({
    narratives: allNarratives,
    milestones: allMilestones,
    fragments: allFragments,
    signals: allSignals,
    feeds: allFeeds,
  });
}
