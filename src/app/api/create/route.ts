import { NextRequest, NextResponse } from "next/server";
import { initDb, persistDb } from "@/lib/db";
import { narratives, milestones, fragments, fragmentNarratives } from "@/lib/schema";
import { nowIso } from "@/lib/types";
import { embedText, embeddingToBuffer } from "@/lib/voyage";

export async function POST(req: NextRequest) {
  const db = await initDb();
  const body = await req.json();
  const { type, data } = body;

  if (type === "narrative") {
    const id = crypto.randomUUID();
    const embedding = await embedText(
      `${data.title}\n${data.description ?? ""}`
    );
    await db.insert(narratives).values({
      id,
      title: data.title,
      description: data.description ?? null,
      colorHex: data.colorHex ?? "#3b82f6",
      embedding: embedding ? embeddingToBuffer(embedding) : null,
      createdAt: nowIso(),
    });
    persistDb();
    return NextResponse.json({ id });
  }

  if (type === "fragment") {
    const id = crypto.randomUUID();
    const embedding = await embedText(data.rawText);
    await db.insert(fragments).values({
      id,
      sourceUrl: data.sourceUrl,
      timestampSeconds: data.timestampSeconds,
      speaker: data.speaker,
      rawText: data.rawText,
      embedding: embedding ? embeddingToBuffer(embedding) : null,
      createdAt: nowIso(),
    });
    if (data.narrativeIds?.length) {
      for (const narrativeId of data.narrativeIds) {
        await db.insert(fragmentNarratives).values({
          fragmentId: id,
          narrativeId,
        });
      }
    }
    persistDb();
    return NextResponse.json({ id });
  }

  if (type === "milestone") {
    const id = crypto.randomUUID();
    await db.insert(milestones).values({
      id,
      narrativeId: data.narrativeId ?? null,
      title: data.title,
      description: data.description ?? null,
      targetDate: data.targetDate,
      isFuzzy: data.isFuzzy ?? false,
      fuzzyRangeMonths: data.fuzzyRangeMonths ?? 3,
      hemisphere: data.hemisphere,
      linkedFragmentId: data.linkedFragmentId ?? null,
      createdAt: nowIso(),
    });
    persistDb();
    return NextResponse.json({ id });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
