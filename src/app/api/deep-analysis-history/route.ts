import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { deepAnalysisRuns } from "@/lib/schema";
import {
  parseStoredHealth,
  parseStoredSuggestions,
} from "@/lib/deepAnalysisHistory";
import { readOnlyResponse, resolveOwnerMapContext } from "@/lib/mapContext";

export async function GET(req: NextRequest) {
  const ctx = await resolveOwnerMapContext();
  const runId = req.nextUrl.searchParams.get("id");

  if (runId) {
    const [run] = await ctx.db
      .select()
      .from(deepAnalysisRuns)
      .where(eq(deepAnalysisRuns.id, runId))
      .limit(1);

    if (!run || run.mapId !== ctx.mapId) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({
      run: {
        id: run.id,
        analysisText: run.analysisText,
        suggestions: parseStoredSuggestions(run.suggestionsJson),
        health: parseStoredHealth(run.healthJson),
        model: run.model,
        mode: run.mode ?? "quick",
        scopeNarrativeId: run.scopeNarrativeId ?? null,
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
      mode: deepAnalysisRuns.mode,
      scopeNarrativeId: deepAnalysisRuns.scopeNarrativeId,
      suggestionCount: deepAnalysisRuns.suggestionCount,
      createdAt: deepAnalysisRuns.createdAt,
    })
    .from(deepAnalysisRuns)
    .where(eq(deepAnalysisRuns.mapId, ctx.mapId))
    .orderBy(desc(deepAnalysisRuns.createdAt));

  return NextResponse.json({
    runs: runs.map((r) => ({
      id: r.id,
      preview: r.preview.slice(0, 200),
      model: r.model,
      mode: r.mode ?? "quick",
      scopeNarrativeId: r.scopeNarrativeId ?? null,
      suggestionCount: r.suggestionCount,
      createdAt: r.createdAt,
    })),
  });
}

export async function DELETE(req: NextRequest) {
  const ctx = await resolveOwnerMapContext();
  if (!ctx.editable) return readOnlyResponse();

  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await ctx.db.delete(deepAnalysisRuns).where(eq(deepAnalysisRuns.id, id));
  return NextResponse.json({ ok: true });
}
