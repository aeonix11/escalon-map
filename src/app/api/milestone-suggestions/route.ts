import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { milestones, milestoneSuggestions } from "@/lib/schema";
import {
  persistIfEditable,
  readOnlyResponse,
  resolveMapContext,
} from "@/lib/mapContext";

export async function POST(req: NextRequest) {
  const ctx = await resolveMapContext();
  if (!ctx.editable) return readOnlyResponse();

  const body = await req.json();
  const ids = body.ids as string[] | undefined;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  const created: string[] = [];
  for (const id of ids) {
    const [suggestion] = await ctx.db
      .select()
      .from(milestoneSuggestions)
      .where(eq(milestoneSuggestions.id, id));
    if (!suggestion) continue;

    const milestoneId = crypto.randomUUID();
    await ctx.db.insert(milestones).values({
      id: milestoneId,
      narrativeId: suggestion.narrativeId,
      title: suggestion.title,
      description: suggestion.description,
      targetDate: suggestion.targetDate,
      isFuzzy: suggestion.isFuzzy,
      fuzzyRangeMonths: suggestion.fuzzyRangeMonths,
      isPersonal: false,
      isSpeculative: suggestion.tier === "speculative",
      hemisphere: suggestion.hemisphere,
      linkedFragmentId: null,
      createdAt: new Date().toISOString(),
    });
    await ctx.db
      .delete(milestoneSuggestions)
      .where(eq(milestoneSuggestions.id, id));
    created.push(milestoneId);
  }

  persistIfEditable(ctx);
  return NextResponse.json({ ok: true, created: created.length, ids: created });
}
