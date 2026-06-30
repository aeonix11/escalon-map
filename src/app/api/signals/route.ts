import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { initDb, persistDb } from "@/lib/db";
import { aiNewsSignals, milestones } from "@/lib/schema";
import { embedText, embeddingToBuffer } from "@/lib/voyage";
import { nowIso } from "@/lib/types";

export async function GET() {
  const db = await initDb();
  const signals = await db.select().from(aiNewsSignals);
  return NextResponse.json(signals);
}

export async function POST(req: NextRequest) {
  const db = await initDb();
  const body = await req.json();

  if (body.action === "create") {
    const id = crypto.randomUUID();
    const embedding = await embedText(
      `${body.title}\n${body.summary ?? ""}`
    );
    await db.insert(aiNewsSignals).values({
      id,
      title: body.title,
      summary: body.summary ?? null,
      sourceName: body.sourceName ?? null,
      url: body.url ?? null,
      publishedAt: body.publishedAt ?? nowIso(),
      embedding: embedding ? embeddingToBuffer(embedding) : null,
      status: "PENDING",
      createdAt: nowIso(),
    });
    persistDb();
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
      narrativeId: signal.matchedNarrativeId ?? null,
      title: signal.title,
      description: signal.summary ?? signal.reasoningNote ?? null,
      targetDate: signal.publishedAt?.slice(0, 10) ?? nowIso().slice(0, 10),
      isFuzzy: false,
      fuzzyRangeMonths: 3,
      hemisphere: "LOWER_EARTHLY",
      linkedFragmentId: null,
      createdAt: nowIso(),
    });

    await db
      .update(aiNewsSignals)
      .set({ status: "ACCEPTED" })
      .where(eq(aiNewsSignals.id, body.signalId));

    persistDb();
    return NextResponse.json({ milestoneId });
  }

  if (body.action === "dismiss") {
    await db
      .update(aiNewsSignals)
      .set({ status: "DISMISSED" })
      .where(eq(aiNewsSignals.id, body.signalId));
    persistDb();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
