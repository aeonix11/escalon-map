import { desc, eq } from "drizzle-orm";
import { deepAnalysisRuns } from "@/lib/schema";
import type { AppDatabase } from "@/lib/db";
import type { MapMilestoneSuggestion } from "@/lib/mapAnalysis";

const MAX_HISTORY_RUNS = 30;

export async function saveDeepAnalysisRun(
  db: AppDatabase,
  analysis: string,
  suggestions: MapMilestoneSuggestion[],
  model: string
) {
  if (!analysis.trim()) return;

  const now = new Date().toISOString();
  await db.insert(deepAnalysisRuns).values({
    id: crypto.randomUUID(),
    analysisText: analysis.trim(),
    suggestionsJson: JSON.stringify(suggestions),
    model,
    suggestionCount: suggestions.length,
    createdAt: now,
  });

  const rows = await db
    .select({ id: deepAnalysisRuns.id })
    .from(deepAnalysisRuns)
    .orderBy(desc(deepAnalysisRuns.createdAt));

  if (rows.length > MAX_HISTORY_RUNS) {
    for (const row of rows.slice(MAX_HISTORY_RUNS)) {
      await db.delete(deepAnalysisRuns).where(eq(deepAnalysisRuns.id, row.id));
    }
  }
}

export function parseStoredSuggestions(
  json: string
): MapMilestoneSuggestion[] {
  try {
    const parsed = JSON.parse(json) as MapMilestoneSuggestion[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
