import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { milestones, milestoneSuggestions } from "@/lib/schema";
import { readOnlyResponse, resolveOwnerMapContext } from "@/lib/mapContext";
import { setMilestoneNarratives } from "@/lib/mapData";

export async function POST(req: NextRequest) {
  const ctx = await resolveOwnerMapContext();
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
    if (!suggestion || suggestion.mapId !== ctx.mapId) continue;

    const milestoneId = crypto.randomUUID();
    await ctx.db.insert(milestones).values({
      id: milestoneId,
      mapId: ctx.mapId,
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

    if (suggestion.narrativeId) {
      await setMilestoneNarratives(milestoneId, [suggestion.narrativeId]);
    }

    await ctx.db
      .delete(milestoneSuggestions)
      .where(eq(milestoneSuggestions.id, id));
    created.push(milestoneId);
  }

  return NextResponse.json({ ok: true, created: created.length, ids: created });
}
