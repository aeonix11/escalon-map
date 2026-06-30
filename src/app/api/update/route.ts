import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { initDb, persistDb } from "@/lib/db";
import { milestones } from "@/lib/schema";

export async function POST(req: NextRequest) {
  const db = await initDb();
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
      narrativeId: string | null;
      title: string;
      description: string | null;
    }> = {};

    if ("linkedFragmentId" in data) {
      updates.linkedFragmentId = data.linkedFragmentId ?? null;
    }
    if ("narrativeId" in data) {
      updates.narrativeId = data.narrativeId ?? null;
    }
    if ("title" in data) updates.title = data.title;
    if ("description" in data) updates.description = data.description ?? null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    await db.update(milestones).set(updates).where(eq(milestones.id, id));
    persistDb();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
