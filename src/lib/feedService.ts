import { eq } from "drizzle-orm";
import type { AppDatabase } from "@/lib/db";
import { aiNewsSignals, rssFeeds, type RssFeed } from "@/lib/schema";
import { nowIso } from "@/lib/types";
import { parseRssXml } from "@/lib/rss";
import { isSafePublicHttpUrl } from "@/lib/urlSafety";

export function isFeedStale(feed: RssFeed, force = false): boolean {
  if (force) return true;
  if (!feed.lastFetched) return true;
  const last = Date.parse(feed.lastFetched);
  if (Number.isNaN(last)) return true;
  const intervalMs = feed.pollIntervalMinutes * 60 * 1000;
  return Date.now() - last >= intervalMs;
}

export async function fetchFeedItems(url: string): Promise<{
  items: ReturnType<typeof parseRssXml>;
  error?: string;
}> {
  if (!isSafePublicHttpUrl(url)) {
    return { items: [], error: "Feed URL must be a public http(s) address" };
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "EscalonMap/1.0 RSS Poller",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { items: [], error: `HTTP ${res.status}` };
    }
    const xml = await res.text();
    return { items: parseRssXml(xml) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fetch failed";
    return { items: [], error: msg };
  }
}

export async function upsertFeedItems(
  db: AppDatabase,
  feed: RssFeed,
  items: ReturnType<typeof parseRssXml>
): Promise<number> {
  let added = 0;
  const now = nowIso();

  for (const item of items) {
    const existing = await db
      .select({ id: aiNewsSignals.id })
      .from(aiNewsSignals)
      .where(eq(aiNewsSignals.url, item.link))
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(aiNewsSignals).values({
      id: crypto.randomUUID(),
      mapId: feed.mapId,
      title: item.title,
      summary: item.description,
      sourceName: feed.label,
      url: item.link,
      publishedAt: item.publishedAt ?? now,
      status: "PENDING",
      feedId: feed.id,
      createdAt: now,
    });
    added += 1;
  }

  await db
    .update(rssFeeds)
    .set({ lastFetched: now })
    .where(eq(rssFeeds.id, feed.id));

  return added;
}

export async function pollFeed(
  db: AppDatabase,
  feed: RssFeed,
  force = false
): Promise<{ added: number; error?: string; skipped?: boolean }> {
  if (!isFeedStale(feed, force)) {
    return { added: 0, skipped: true };
  }

  const { items, error } = await fetchFeedItems(feed.url);
  if (error) {
    return { added: 0, error };
  }

  const added = await upsertFeedItems(db, feed, items);
  return { added };
}
