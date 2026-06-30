import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { initDb, persistDb } from "@/lib/db";
import {
  narratives,
  milestones,
  aiNewsSignals,
} from "@/lib/schema";
import {
  streamSignalScan,
  parseScanResults,
} from "@/lib/anthropic";

export async function POST() {
  const db = await initDb();

  const allNarratives = await db.select().from(narratives);
  const allMilestones = await db.select().from(milestones);
  const pendingSignals = await db
    .select()
    .from(aiNewsSignals)
    .where(eq(aiNewsSignals.status, "PENDING"))
    .limit(50);

  if (pendingSignals.length === 0) {
    return NextResponse.json(
      { error: "No pending signals to scan" },
      { status: 400 }
    );
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    let fullText = "";
    try {
      const textStream = await streamSignalScan(
        allNarratives.map((n) => ({
          id: n.id,
          title: n.title,
          description: n.description,
        })),
        allMilestones.map((m) => ({
          title: m.title,
          description: m.description,
          targetDate: m.targetDate,
          hemisphere: m.hemisphere,
        })),
        pendingSignals.map((s) => ({
          id: s.id,
          title: s.title,
          summary: s.summary,
        }))
      );

      for await (const chunk of textStream) {
        fullText += chunk;
        await writer.write(encoder.encode(chunk));
      }

      const results = parseScanResults(fullText);
      let updated = 0;

      for (const result of results) {
        if (!result.matched) continue;
        const signal = pendingSignals.find((s) => s.id === result.signalId);
        if (!signal) continue;

        await db
          .update(aiNewsSignals)
          .set({
            status: "MATCHED",
            matchedNarrativeId: result.narrativeId ?? null,
            reasoningNote: result.reasoning,
          })
          .where(eq(aiNewsSignals.id, result.signalId));
        updated += 1;
      }

      persistDb();
      await writer.write(
        encoder.encode(`\n\n---\nScan complete. ${updated} signal(s) marked as relevant.`)
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Scan failed";
      await writer.write(encoder.encode(`\n\nError: ${msg}`));
    } finally {
      await writer.close();
    }
  })();

  return new NextResponse(stream.readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
