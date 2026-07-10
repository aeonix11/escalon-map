import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { aiNewsSignals } from "@/lib/schema";
import { streamSignalScan, parseScanResults } from "@/lib/anthropic";
import { readOnlyResponse, resolveOwnerMapContext } from "@/lib/mapContext";
import { fetchMapPayload } from "@/lib/mapData";
import {
  loadUserApiKeys,
  missingAnthropicKeyResponse,
} from "@/lib/userApiKeys";

export async function POST() {
  const ctx = await resolveOwnerMapContext();
  if (!ctx.editable) return readOnlyResponse();

  const keys = await loadUserApiKeys(ctx.userId!);
  if (!keys.anthropicApiKey) {
    return NextResponse.json(missingAnthropicKeyResponse(), { status: 400 });
  }
  const anthropicApiKey = keys.anthropicApiKey;

  const db = ctx.db;
  const payload = await fetchMapPayload(ctx.mapId);

  const pendingSignals = await db
    .select()
    .from(aiNewsSignals)
    .where(eq(aiNewsSignals.mapId, ctx.mapId))
    .limit(50);

  const pending = pendingSignals.filter((s) => s.status === "PENDING");

  if (pending.length === 0) {
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
        anthropicApiKey,
        payload.narratives.map((n) => ({
          id: n.id,
          title: n.title,
          description: n.description,
        })),
        payload.milestones.map((m) => ({
          title: m.title,
          description: m.description,
          targetDate: m.targetDate,
          hemisphere: m.hemisphere,
        })),
        pending.map((s) => ({
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
        const signal = pending.find((s) => s.id === result.signalId);
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
