import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { aiNewsSignals, narratives } from "@/lib/schema";
import { reasonMatch } from "@/lib/anthropic";
import {
  bufferToEmbedding,
  cosineSimilarity,
  embedText,
  embeddingToBuffer,
} from "@/lib/voyage";
import {
  persistIfEditable,
  readOnlyResponse,
  resolveMapContext,
} from "@/lib/mapContext";

export async function POST(req: NextRequest) {
  const ctx = await resolveMapContext();
  if (!ctx.editable) return readOnlyResponse();

  const db = ctx.db;
  const { signalId } = await req.json();

  const [signal] = await db
    .select()
    .from(aiNewsSignals)
    .where(eq(aiNewsSignals.id, signalId))
    .limit(1);

  if (!signal) {
    return NextResponse.json({ error: "Signal not found" }, { status: 404 });
  }

  const allNarratives = await db.select().from(narratives);

  let signalEmbedding: Float32Array | null = null;
  if (signal.embedding) {
    signalEmbedding = bufferToEmbedding(signal.embedding);
  } else {
    signalEmbedding = await embedText(
      `${signal.title}\n${signal.summary ?? ""}`
    );
    if (signalEmbedding) {
      await db
        .update(aiNewsSignals)
        .set({ embedding: embeddingToBuffer(signalEmbedding) })
        .where(eq(aiNewsSignals.id, signalId));
    }
  }

  let candidates = allNarratives;
  if (signalEmbedding) {
    const scored = allNarratives
      .filter((n) => n.embedding)
      .map((n) => ({
        narrative: n,
        score: cosineSimilarity(
          signalEmbedding!,
          bufferToEmbedding(n.embedding!)
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (scored.length > 0) {
      candidates = scored.map((s) => s.narrative);
    } else {
      candidates = allNarratives.slice(0, 3);
    }
  } else {
    candidates = allNarratives.slice(0, 3);
  }

  const result = await reasonMatch(
    signal.title,
    signal.summary,
    candidates.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
    }))
  );

  await db
    .update(aiNewsSignals)
    .set({
      status: result.matched ? "MATCHED" : "PENDING",
      matchedNarrativeId: result.narrativeId,
      reasoningNote: result.reasoning,
    })
    .where(eq(aiNewsSignals.id, signalId));

  persistIfEditable(ctx);

  return NextResponse.json({
    matched: result.matched,
    narrativeId: result.narrativeId,
    reasoning: result.reasoning,
    candidates,
  });
}
