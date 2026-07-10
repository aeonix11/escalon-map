import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { rssFeeds } from "@/lib/schema";
import { nowIso } from "@/lib/types";
import { pollFeed } from "@/lib/feedService";
import { isSafePublicHttpUrl } from "@/lib/urlSafety";
import { readOnlyResponse, resolveOwnerMapContext } from "@/lib/mapContext";

export async function GET() {
  const ctx = await resolveOwnerMapContext();
  const feeds = await ctx.db
    .select()
    .from(rssFeeds)
    .where(eq(rssFeeds.mapId, ctx.mapId));
  return NextResponse.json(feeds);
}

export async function POST(req: NextRequest) {
  const ctx = await resolveOwnerMapContext();
  if (!ctx.editable) return readOnlyResponse();

  const db = ctx.db;
  let body: {
    action?: string;
    url?: string;
    label?: string;
    pollIntervalMinutes?: number;
    feedId?: string;
    force?: boolean;
  } = {};
  try {
    const text = await req.text();
    if (text.trim()) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action } = body;

  if (action === "add") {
    const { url, label, pollIntervalMinutes } = body;
    if (!url || !label) {
      return NextResponse.json(
        { error: "url and label are required" },
        { status: 400 }
      );
    }
    if (!isSafePublicHttpUrl(url)) {
      return NextResponse.json(
        { error: "Feed URL must be a public http(s) address" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    await db.insert(rssFeeds).values({
      id,
      mapId: ctx.mapId,
      url,
      label,
      pollIntervalMinutes: pollIntervalMinutes ?? 60,
      lastFetched: null,
      createdAt: nowIso(),
    });
    return NextResponse.json({ id });
  }

  if (action === "remove") {
    const { feedId } = body;
    if (!feedId) {
      return NextResponse.json({ error: "feedId required" }, { status: 400 });
    }
    await db.delete(rssFeeds).where(eq(rssFeeds.id, feedId));
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

    if (!feed || feed.mapId !== ctx.mapId) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    const result = await pollFeed(db, feed, force ?? true);
    return NextResponse.json(result);
  }

  if (action === "fetch-all") {
    const force = body.force ?? false;
    const feeds = await db
      .select()
      .from(rssFeeds)
      .where(eq(rssFeeds.mapId, ctx.mapId));
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

    const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
    return NextResponse.json({ totalAdded, results });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
