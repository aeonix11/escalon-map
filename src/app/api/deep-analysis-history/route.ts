import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { deepAnalysisRuns } from "@/lib/schema";
import { parseStoredSuggestions } from "@/lib/deepAnalysisHistory";
import {
  persistIfEditable,
  resolveMapContext,
} from "@/lib/mapContext";

export async function GET(req: NextRequest) {
  const ctx = await resolveMapContext();
  const runId = req.nextUrl.searchParams.get("id");

  if (runId) {
    const [run] = await ctx.db
      .select()
      .from(deepAnalysisRuns)
      .where(eq(deepAnalysisRuns.id, runId))
      .limit(1);

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({
      run: {
        id: run.id,
        analysisText: run.analysisText,
        suggestions: parseStoredSuggestions(run.suggestionsJson),
        model: run.model,
        suggestionCount: run.suggestionCount,
        createdAt: run.createdAt,
      },
    });
  }

  const runs = await ctx.db
    .select({
      id: deepAnalysisRuns.id,
      preview: deepAnalysisRuns.analysisText,
      model: deepAnalysisRuns.model,
      suggestionCount: deepAnalysisRuns.suggestionCount,
      createdAt: deepAnalysisRuns.createdAt,
    })
    .from(deepAnalysisRuns)
    .orderBy(desc(deepAnalysisRuns.createdAt));

  return NextResponse.json({
    runs: runs.map((r) => ({
      id: r.id,
      preview: r.preview.slice(0, 200),
      model: r.model,
      suggestionCount: r.suggestionCount,
      createdAt: r.createdAt,
    })),
  });
}

export async function DELETE(req: NextRequest) {
  const ctx = await resolveMapContext();
  if (!ctx.editable) {
    return NextResponse.json({ error: "Read-only map" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await ctx.db.delete(deepAnalysisRuns).where(eq(deepAnalysisRuns.id, id));
  persistIfEditable(ctx);
  return NextResponse.json({ ok: true });
}
