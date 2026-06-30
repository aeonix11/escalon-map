import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { initDb, persistDb } from "@/lib/db";
import { rssFeeds } from "@/lib/schema";
import { nowIso } from "@/lib/types";
import { pollFeed } from "@/lib/feedService";

export async function GET() {
  const db = await initDb();
  const feeds = await db.select().from(rssFeeds);
  return NextResponse.json(feeds);
}

export async function POST(req: NextRequest) {
  const db = await initDb();
  const body = await req.json();
  const { action } = body;

  if (action === "add") {
    const { url, label, pollIntervalMinutes } = body;
    if (!url || !label) {
      return NextResponse.json(
        { error: "url and label are required" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    await db.insert(rssFeeds).values({
      id,
      url,
      label,
      pollIntervalMinutes: pollIntervalMinutes ?? 60,
      lastFetched: null,
      createdAt: nowIso(),
    });
    persistDb();
    return NextResponse.json({ id });
  }

  if (action === "remove") {
    const { feedId } = body;
    if (!feedId) {
      return NextResponse.json({ error: "feedId required" }, { status: 400 });
    }
    await db.delete(rssFeeds).where(eq(rssFeeds.id, feedId));
    persistDb();
    return NextResponse.json({ ok: true });
  }

  if (action === "fetch-one") {
    const { feedId, force } = body;
    if (!feedId) {
      return NextResponse.json({ error: "feedId required" }, { status: 400 });
    }

    const [feed] = await db
      .select()
      .from(rssFeeds)
      .where(eq(rssFeeds.id, feedId))
      .limit(1);

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    const result = await pollFeed(db, feed, force ?? true);
    persistDb();
    return NextResponse.json(result);
  }

  if (action === "fetch-all") {
    const force = body.force ?? false;
    const feeds = await db.select().from(rssFeeds);
    const results: Array<{
      feedId: string;
      label: string;
      added: number;
      error?: string;
      skipped?: boolean;
    }> = [];

    for (const feed of feeds) {
      const result = await pollFeed(db, feed, force);
      results.push({
        feedId: feed.id,
        label: feed.label,
        added: result.added,
        error: result.error,
        skipped: result.skipped,
      });
    }

    persistDb();
    const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
    return NextResponse.json({ totalAdded, results });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
