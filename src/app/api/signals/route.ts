import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { aiNewsSignals, milestones } from "@/lib/schema";
import { embedText, embeddingToBuffer } from "@/lib/voyage";
import { nowIso } from "@/lib/types";
import { readOnlyResponse, resolveOwnerMapContext } from "@/lib/mapContext";
import { setMilestoneNarratives } from "@/lib/mapData";

export async function GET() {
  const ctx = await resolveOwnerMapContext();
  const signals = await ctx.db
    .select()
    .from(aiNewsSignals)
    .where(eq(aiNewsSignals.mapId, ctx.mapId));
  return NextResponse.json(signals);
}

export async function POST(req: NextRequest) {
  const ctx = await resolveOwnerMapContext();
  if (!ctx.editable) return readOnlyResponse();

  const db = ctx.db;
  const body = await req.json();

  if (body.action === "create") {
    const id = crypto.randomUUID();
    const embedding = await embedText(
      `${body.title}\n${body.summary ?? ""}`
    );
    await db.insert(aiNewsSignals).values({
      id,
      mapId: ctx.mapId,
      title: body.title,
      summary: body.summary ?? null,
      sourceName: body.sourceName ?? null,
      url: body.url ?? null,
      publishedAt: body.publishedAt ?? nowIso(),
      embedding: embedding ? embeddingToBuffer(embedding) : null,
      status: "PENDING",
      createdAt: nowIso(),
    });
    return NextResponse.json({ id });
  }

  if (body.action === "accept") {
    const [signal] = await db
      .select()
      .from(aiNewsSignals)
      .where(eq(aiNewsSignals.id, body.signalId))
      .limit(1);
    if (!signal) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const milestoneId = crypto.randomUUID();
    await db.insert(milestones).values({
      id: milestoneId,
      mapId: ctx.mapId,
      title: signal.title,
      description: signal.summary ?? signal.reasoningNote ?? null,
      targetDate: signal.publishedAt?.slice(0, 10) ?? nowIso().slice(0, 10),
      isFuzzy: false,
      fuzzyRangeMonths: 3,
      hemisphere: "LOWER_EARTHLY",
      linkedFragmentId: null,
      createdAt: nowIso(),
    });

    if (signal.matchedNarrativeId) {
      await setMilestoneNarratives(milestoneId, [signal.matchedNarrativeId]);
    }

    await db
      .update(aiNewsSignals)
      .set({ status: "ACCEPTED" })
      .where(eq(aiNewsSignals.id, body.signalId));

    return NextResponse.json({ milestoneId });
  }

  if (body.action === "dismiss") {
    await db
      .update(aiNewsSignals)
      .set({ status: "DISMISSED" })
      .where(eq(aiNewsSignals.id, body.signalId));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
