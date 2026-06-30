import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { initDb, persistDb } from "@/lib/db";
import {
  narratives,
  milestones,
  fragments,
  fragmentNarratives,
  aiNewsSignals,
  rssFeeds,
} from "@/lib/schema";

export async function POST(req: NextRequest) {
  const db = await initDb();
  const body = await req.json();
  const { type, id } = body;

  if (!type || !id) {
    return NextResponse.json(
      { error: "type and id are required" },
      { status: 400 }
    );
  }

  if (type === "milestone") {
    await db.delete(milestones).where(eq(milestones.id, id));
    persistDb();
    return NextResponse.json({ ok: true });
  }

  if (type === "narrative") {
    await db.delete(fragmentNarratives).where(eq(fragmentNarratives.narrativeId, id));
    await db.delete(narratives).where(eq(narratives.id, id));
    persistDb();
    return NextResponse.json({ ok: true });
  }

  if (type === "fragment") {
    await db.delete(fragmentNarratives).where(eq(fragmentNarratives.fragmentId, id));
    await db.delete(fragments).where(eq(fragments.id, id));
    persistDb();
    return NextResponse.json({ ok: true });
  }

  if (type === "signal") {
    await db.delete(aiNewsSignals).where(eq(aiNewsSignals.id, id));
    persistDb();
    return NextResponse.json({ ok: true });
  }

  if (type === "feed") {
    await db.delete(rssFeeds).where(eq(rssFeeds.id, id));
    persistDb();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
