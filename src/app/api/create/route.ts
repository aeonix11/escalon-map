import { NextRequest, NextResponse } from "next/server";
import { narratives, milestones, fragments, fragmentNarratives, notes } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { nowIso } from "@/lib/types";
import { embedText, embeddingToBuffer } from "@/lib/voyage";
import {
  persistIfEditable,
  readOnlyResponse,
  resolveMapContext,
} from "@/lib/mapContext";

export async function POST(req: NextRequest) {
  const ctx = await resolveMapContext();
  if (!ctx.editable) return readOnlyResponse();

  const db = ctx.db;
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
    persistIfEditable(ctx);
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
    persistIfEditable(ctx);
    return NextResponse.json({ id });
  }

  if (type === "milestone") {
    const hemisphere = data.hemisphere;
    if (
      hemisphere !== "UPPER_PROPHETIC" &&
      hemisphere !== "LOWER_EARTHLY"
    ) {
      return NextResponse.json(
        { error: "hemisphere must be UPPER_PROPHETIC or LOWER_EARTHLY" },
        { status: 400 }
      );
    }

    try {
      const id = crypto.randomUUID();
      await db.insert(milestones).values({
        id,
        narrativeId: data.narrativeId ?? null,
        title: data.title,
        description: data.description ?? null,
        targetDate: data.targetDate,
        isFuzzy: data.isFuzzy ?? false,
        fuzzyRangeMonths: data.fuzzyRangeMonths ?? 3,
        isPersonal: data.isPersonal ?? false,
        hemisphere,
        linkedFragmentId: data.linkedFragmentId ?? null,
        createdAt: nowIso(),
      });
      persistIfEditable(ctx);

      const [created] = await db
        .select()
        .from(milestones)
        .where(eq(milestones.id, id))
        .limit(1);

      if (!created) {
        return NextResponse.json(
          { error: "Milestone insert failed to persist" },
          { status: 500 }
        );
      }

      return NextResponse.json({ id, milestone: created });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Insert failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  if (type === "note") {
    const id = crypto.randomUUID();
    const ts = nowIso();
    await db.insert(notes).values({
      id,
      title: data.title,
      content: data.content ?? "",
      isPersonal: data.isPersonal ?? false,
      pinnedDate: data.pinnedDate ?? null,
      hemisphere: data.hemisphere ?? null,
      createdAt: ts,
      updatedAt: ts,
    });
    persistIfEditable(ctx);
    return NextResponse.json({ id });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
