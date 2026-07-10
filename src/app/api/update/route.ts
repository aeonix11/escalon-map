import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { milestones, notes } from "@/lib/schema";
import { readOnlyResponse, resolveOwnerMapContext } from "@/lib/mapContext";
import { setMilestoneNarratives } from "@/lib/mapData";

export async function POST(req: NextRequest) {
  const ctx = await resolveOwnerMapContext();
  if (!ctx.editable) return readOnlyResponse();

  const db = ctx.db;
  const body = await req.json();
  const { type, id, data } = body;

  if (!type || !id) {
    return NextResponse.json(
      { error: "type and id are required" },
      { status: 400 }
    );
  }

  if (type === "milestone") {
    const updates: Partial<{
      linkedFragmentId: string | null;
      title: string;
      description: string | null;
      targetDate: string;
      hemisphere: "UPPER_PROPHETIC" | "LOWER_EARTHLY";
      isFuzzy: boolean;
      fuzzyRangeMonths: number;
      isPersonal: boolean;
      isSpeculative: boolean;
    }> = {};

    if ("linkedFragmentId" in data) {
      updates.linkedFragmentId = data.linkedFragmentId ?? null;
    }
    if ("title" in data) {
      if (!data.title?.trim()) {
        return NextResponse.json({ error: "title is required" }, { status: 400 });
      }
      updates.title = data.title.trim();
    }
    if ("description" in data) {
      updates.description = data.description ?? null;
    }
    if ("targetDate" in data) {
      if (!data.targetDate) {
        return NextResponse.json({ error: "targetDate is required" }, { status: 400 });
      }
      updates.targetDate = data.targetDate;
    }
    if ("hemisphere" in data) {
      if (
        data.hemisphere !== "UPPER_PROPHETIC" &&
        data.hemisphere !== "LOWER_EARTHLY"
      ) {
        return NextResponse.json({ error: "Invalid hemisphere" }, { status: 400 });
      }
      updates.hemisphere = data.hemisphere;
    }
    if ("isFuzzy" in data) updates.isFuzzy = Boolean(data.isFuzzy);
    if ("isPersonal" in data) updates.isPersonal = Boolean(data.isPersonal);
    if ("isSpeculative" in data) updates.isSpeculative = Boolean(data.isSpeculative);
    if ("fuzzyRangeMonths" in data) {
      const months = Number(data.fuzzyRangeMonths);
      if (!Number.isFinite(months) || months < 1 || months > 120) {
        return NextResponse.json(
          { error: "fuzzyRangeMonths must be between 1 and 120" },
          { status: 400 }
        );
      }
      updates.fuzzyRangeMonths = months;
    }

    const hasNarrativeUpdate =
      "narrativeIds" in data || "narrativeId" in data;

    if (Object.keys(updates).length === 0 && !hasNarrativeUpdate) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(milestones)
      .where(eq(milestones.id, id))
      .limit(1);

    if (!existing || existing.mapId !== ctx.mapId) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    if (Object.keys(updates).length > 0) {
      await db.update(milestones).set(updates).where(eq(milestones.id, id));
    }

    let narrativeIds: string[] | undefined;
    if ("narrativeIds" in data) {
      narrativeIds = Array.isArray(data.narrativeIds) ? data.narrativeIds : [];
      await setMilestoneNarratives(id, narrativeIds);
    } else if ("narrativeId" in data) {
      narrativeIds = data.narrativeId ? [data.narrativeId] : [];
      await setMilestoneNarratives(id, narrativeIds);
    }

    const [updated] = await db
      .select()
      .from(milestones)
      .where(eq(milestones.id, id))
      .limit(1);

    return NextResponse.json({
      ok: true,
      milestone: {
        ...updated,
        narrativeIds: narrativeIds ?? undefined,
      },
    });
  }

  if (type === "note") {
    const updates: Partial<{
      title: string;
      content: string;
      pinnedDate: string | null;
      hemisphere: "UPPER_PROPHETIC" | "LOWER_EARTHLY" | null;
      isPersonal: boolean;
      updatedAt: string;
    }> = {};

    if ("title" in data) {
      if (!data.title?.trim()) {
        return NextResponse.json({ error: "title is required" }, { status: 400 });
      }
      updates.title = data.title.trim();
    }
    if ("content" in data) updates.content = data.content ?? "";
    if ("pinnedDate" in data) updates.pinnedDate = data.pinnedDate ?? null;
    if ("hemisphere" in data) {
      if (
        data.hemisphere !== null &&
        data.hemisphere !== "UPPER_PROPHETIC" &&
        data.hemisphere !== "LOWER_EARTHLY"
      ) {
        return NextResponse.json({ error: "Invalid hemisphere" }, { status: 400 });
      }
      updates.hemisphere = data.hemisphere ?? null;
    }
    if ("isPersonal" in data) updates.isPersonal = Boolean(data.isPersonal);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    updates.updatedAt = new Date().toISOString();

    const [existing] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, id))
      .limit(1);

    if (!existing || existing.mapId !== ctx.mapId) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    await db.update(notes).set(updates).where(eq(notes.id, id));

    const [updated] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, id))
      .limit(1);

    return NextResponse.json({ ok: true, note: updated });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
