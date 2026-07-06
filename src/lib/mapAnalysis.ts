import type { SuggestionTier } from "@/lib/schema";

export interface SearchResultLogEntry {
  url: string;
  title: string;
}

export interface MapHealthIssue {
  type:
    | "gap"
    | "contradiction"
    | "orphaned_narrative"
    | "overdue_confirmation";
  title: string;
  description: string;
}

export interface SuggestionSource {
  url: string;
  title: string;
}

export interface MapMilestoneSuggestion {
  title: string;
  description: string | null;
  targetDate: string;
  hemisphere: "UPPER_PROPHETIC" | "LOWER_EARTHLY";
  narrativeId: string | null;
  isFuzzy: boolean;
  fuzzyRangeMonths: number;
  reasoning: string;
  tier: SuggestionTier;
  sources: SuggestionSource[];
  confirmsMilestoneId: string | null;
}

function parseJsonArray<T>(text: string): T[] {
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (!arrayMatch) return [];
  try {
    const parsed = JSON.parse(arrayMatch[0]) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeTier(value: unknown): SuggestionTier {
  if (value === "sourced" || value === "speculative") return value;
  return "inferred";
}

function normalizeSources(value: unknown): SuggestionSource[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s) => s && typeof s === "object" && typeof s.url === "string")
    .map((s) => ({
      url: s.url,
      title: typeof s.title === "string" ? s.title : s.url,
    }));
}

function normalizeSuggestion(item: Partial<MapMilestoneSuggestion>): MapMilestoneSuggestion {
  return {
    title: item.title ?? "Untitled",
    description: item.description ?? null,
    targetDate: item.targetDate ?? "2026-01-01",
    hemisphere:
      item.hemisphere === "LOWER_EARTHLY"
        ? "LOWER_EARTHLY"
        : "UPPER_PROPHETIC",
    narrativeId: item.narrativeId ?? null,
    isFuzzy: Boolean(item.isFuzzy),
    fuzzyRangeMonths: Number(item.fuzzyRangeMonths) || 3,
    reasoning: item.reasoning ?? "",
    tier: normalizeTier(item.tier),
    sources: normalizeSources(item.sources),
    confirmsMilestoneId: item.confirmsMilestoneId ?? null,
  };
}

export function parseMapDeepAnalysis(text: string): {
  analysis: string;
  health: MapHealthIssue[];
  suggestions: MapMilestoneSuggestion[];
} {
  const healthMarker = "---HEALTH---";
  const suggestionsMarker = "---SUGGESTIONS---";

  const healthIndex = text.indexOf(healthMarker);
  const suggestionsIndex = text.indexOf(suggestionsMarker);

  let analysis = text.trim();
  let healthPart = "";
  let suggestionsPart = "";

  if (healthIndex >= 0) {
    analysis = text.slice(0, healthIndex).trim();
    if (suggestionsIndex >= 0 && suggestionsIndex > healthIndex) {
      healthPart = text.slice(healthIndex + healthMarker.length, suggestionsIndex);
      suggestionsPart = text.slice(suggestionsIndex + suggestionsMarker.length);
    } else {
      healthPart = text.slice(healthIndex + healthMarker.length);
    }
  } else if (suggestionsIndex >= 0) {
    analysis = text.slice(0, suggestionsIndex).trim();
    suggestionsPart = text.slice(suggestionsIndex + suggestionsMarker.length);
  }

  const health = parseJsonArray<Partial<MapHealthIssue>>(healthPart)
    .filter((item) => item && typeof item.title === "string")
    .map((item) => ({
      type:
        item.type === "gap" ||
        item.type === "contradiction" ||
        item.type === "orphaned_narrative" ||
        item.type === "overdue_confirmation"
          ? item.type
          : ("gap" as const),
      title: item.title!,
      description: item.description ?? "",
    }));

  const suggestions = parseJsonArray<Partial<MapMilestoneSuggestion>>(
    suggestionsPart
  )
    .filter((item) => item && typeof item.title === "string")
    .map((item) => normalizeSuggestion(item));

  return { analysis, health, suggestions };
}

export function verifySuggestionSources(
  suggestions: MapMilestoneSuggestion[],
  searchLog: SearchResultLogEntry[]
): MapMilestoneSuggestion[] {
  const verifiedUrls = new Set(searchLog.map((s) => s.url));
  return suggestions.map((item) => {
    const verifiedSources = item.sources.filter((s) => verifiedUrls.has(s.url));
    let tier = item.tier;
    if (tier === "sourced" && verifiedSources.length === 0) {
      tier = "inferred";
    }
    return { ...item, sources: verifiedSources, tier };
  });
}

export function parseStoredSources(json: string | null | undefined): SuggestionSource[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as SuggestionSource[];
    return normalizeSources(parsed);
  } catch {
    return [];
  }
}
