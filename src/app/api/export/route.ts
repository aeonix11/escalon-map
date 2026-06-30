import { NextRequest, NextResponse } from "next/server";
import { initDb, persistDb } from "@/lib/db";
import {
  narratives,
  milestones,
  fragments,
  fragmentNarratives,
  aiNewsSignals,
  rssFeeds,
} from "@/lib/schema";
import type { ExportData } from "@/lib/types";
import { nowIso } from "@/lib/types";

export async function GET() {
  const db = await initDb();

  const data: ExportData = {
    version: 1,
    exportedAt: nowIso(),
    narratives: await db.select().from(narratives),
    fragments: await db.select().from(fragments),
    fragmentNarratives: await db.select().from(fragmentNarratives),
    milestones: await db.select().from(milestones),
    aiNewsSignals: await db.select().from(aiNewsSignals),
    rssFeeds: await db.select().from(rssFeeds),
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="escalon-map-${nowIso().slice(0, 10)}.json"`,
    },
  });
}

export async function POST(req: NextRequest) {
  const db = await initDb();
  const body = (await req.json()) as ExportData & { mode?: "replace" | "merge" };
  const mode = body.mode ?? "merge";

  if (mode === "replace") {
    await db.delete(aiNewsSignals);
    await db.delete(milestones);
    await db.delete(fragmentNarratives);
    await db.delete(fragments);
    await db.delete(rssFeeds);
    await db.delete(narratives);
  }

  for (const n of body.narratives ?? []) {
    await db.insert(narratives).values(n).onConflictDoNothing();
  }
  for (const f of body.fragments ?? []) {
    await db.insert(fragments).values(f).onConflictDoNothing();
  }
  for (const fn of body.fragmentNarratives ?? []) {
    await db.insert(fragmentNarratives).values(fn).onConflictDoNothing();
  }
  for (const m of body.milestones ?? []) {
    await db.insert(milestones).values(m).onConflictDoNothing();
  }
  for (const s of body.aiNewsSignals ?? []) {
    await db.insert(aiNewsSignals).values(s).onConflictDoNothing();
  }
  for (const f of body.rssFeeds ?? []) {
    await db.insert(rssFeeds).values(f).onConflictDoNothing();
  }

  persistDb();
  return NextResponse.json({ ok: true, mode });
}
