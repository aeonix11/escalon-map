export interface MapMilestoneSuggestion {
  title: string;
  description: string | null;
  targetDate: string;
  hemisphere: "UPPER_PROPHETIC" | "LOWER_EARTHLY";
  narrativeId: string | null;
  isFuzzy: boolean;
  fuzzyRangeMonths: number;
  reasoning: string;
}

export function parseMapDeepAnalysis(text: string): {
  analysis: string;
  suggestions: MapMilestoneSuggestion[];
} {
  const marker = "---SUGGESTIONS---";
  const markerIndex = text.indexOf(marker);
  const analysis =
    markerIndex >= 0 ? text.slice(0, markerIndex).trim() : text.trim();
  const suggestionsPart =
    markerIndex >= 0 ? text.slice(markerIndex + marker.length) : "";

  const arrayMatch = suggestionsPart.match(/\[[\s\S]*\]/);
  if (!arrayMatch) {
    return { analysis, suggestions: [] };
  }

  try {
    const parsed = JSON.parse(arrayMatch[0]) as MapMilestoneSuggestion[];
    const suggestions = parsed
      .filter((item) => item && typeof item.title === "string")
      .map((item) => ({
        title: item.title,
        description: item.description ?? null,
        targetDate: item.targetDate ?? "2026-01-01",
        hemisphere:
          item.hemisphere === "LOWER_EARTHLY"
            ? ("LOWER_EARTHLY" as const)
            : ("UPPER_PROPHETIC" as const),
        narrativeId: item.narrativeId ?? null,
        isFuzzy: Boolean(item.isFuzzy),
        fuzzyRangeMonths: Number(item.fuzzyRangeMonths) || 3,
        reasoning: item.reasoning ?? "",
      }));
    return { analysis, suggestions };
  } catch {
    return { analysis, suggestions: [] };
  }
}
