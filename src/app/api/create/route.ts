import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  narratives,
  milestones,
  fragments,
  fragmentNarratives,
  notes,
  milestoneNarratives,
} from "@/lib/schema";
import { nowIso } from "@/lib/types";
import { embedText, embeddingToBuffer } from "@/lib/voyage";
import { readOnlyResponse, resolveOwnerMapContext } from "@/lib/mapContext";
import { setMilestoneNarratives } from "@/lib/mapData";

export async function POST(req: NextRequest) {
  const ctx = await resolveOwnerMapContext();
  if (!ctx.editable) return readOnlyResponse();

  const db = ctx.db;
  const body = await req.json();
  const { type, data } = body;
  const mapId = ctx.mapId;

  if (type === "narrative") {
    const id = crypto.randomUUID();
    const embedding = await embedText(
      `${data.title}\n${data.description ?? ""}`
    );
    await db.insert(narratives).values({
      id,
      mapId,
      title: data.title,
      description: data.description ?? null,
      colorHex: data.colorHex ?? "#3b82f6",
      embedding: embedding ? embeddingToBuffer(embedding) : null,
      createdAt: nowIso(),
    });
    return NextResponse.json({ id });
  }

  if (type === "fragment") {
    const id = crypto.randomUUID();
    const embedding = await embedText(data.rawText);
    await db.insert(fragments).values({
      id,
      mapId,
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
      const narrativeIds: string[] =
        data.narrativeIds ??
        (data.narrativeId ? [data.narrativeId] : []);

      await db.insert(milestones).values({
        id,
        mapId,
        title: data.title,
        description: data.description ?? null,
        targetDate: data.targetDate,
        isFuzzy: data.isFuzzy ?? false,
        fuzzyRangeMonths: data.fuzzyRangeMonths ?? 3,
        isPersonal: data.isPersonal ?? false,
        isSpeculative: data.isSpeculative ?? false,
        hemisphere,
        linkedFragmentId: data.linkedFragmentId ?? null,
        createdAt: nowIso(),
      });

      if (narrativeIds.length > 0) {
        await setMilestoneNarratives(id, narrativeIds);
      }

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

      return NextResponse.json({
        id,
        milestone: { ...created, narrativeIds },
      });
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
      mapId,
      title: data.title,
      content: data.content ?? "",
      isPersonal: data.isPersonal ?? false,
      pinnedDate: data.pinnedDate ?? null,
      hemisphere: data.hemisphere ?? null,
      createdAt: ts,
      updatedAt: ts,
    });
    return NextResponse.json({ id });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
