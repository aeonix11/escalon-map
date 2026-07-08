import type { DeepAnalysisMode } from "@/lib/anthropic";

export const MAP_CONTEXT_PLACEHOLDER = "{{MAP_CONTEXT}}";
export const NARRATIVE_LIST_PLACEHOLDER = "{{NARRATIVE_LIST}}";

export const DEFAULT_QUICK_PROMPT_TEMPLATE = `You are an expert analyst of prophetic timelines and geopolitical signals. The user has a prophecy map spanning 2012-2075 with two hemispheres: UPPER_PROPHETIC (visionary/prophetic above the axis) and LOWER_EARTHLY (real-world confirmed signals below). Map data includes narratives, milestones, user notes (pinned or unpinned), and video fragments.

CURRENT MAP DATA:
${MAP_CONTEXT_PLACEHOLDER}

AVAILABLE NARRATIVES (use these IDs when linking suggestions):
${NARRATIVE_LIST_PLACEHOLDER}

Perform a DEEP ANALYSIS of this map:
1. Identify patterns, convergences, gaps, and tensions across narratives, milestones, notes, and dates
2. Note what's missing or underrepresented on the timeline — including themes only captured in unpinned notes
3. Suggest where earthly signals might confirm or challenge prophetic milestones
4. Weigh pinned notes on the timeline alongside milestones; use unpinned notes as supporting context
5. Be specific with dates and narrative names

Write your analysis in clear prose (several paragraphs). Do NOT use markdown headers.

After your analysis, on its own line, write exactly: ---SUGGESTIONS---

Then output a JSON array (no markdown fence) of 5-12 NEW milestone suggestions to enrich the timeline. Do not duplicate existing milestones. Each item:
{
  "title": "short title",
  "description": "1-2 sentences",
  "targetDate": "YYYY-MM-DD",
  "hemisphere": "UPPER_PROPHETIC" or "LOWER_EARTHLY",
  "narrativeId": "narrative id from list or null",
  "isFuzzy": false,
  "fuzzyRangeMonths": 3,
  "reasoning": "why this belongs on the map",
  "tier": "inferred",
  "sources": [],
  "confirmsMilestoneId": null
}`;

export const DEFAULT_DEEP_PROMPT_TEMPLATE = `You are an expert analyst of prophetic timelines and geopolitical signals. The user has a prophecy map spanning 2012-2075 with two hemispheres: UPPER_PROPHETIC (visionary/prophetic above the axis) and LOWER_EARTHLY (real-world confirmed signals below). Map data includes narratives, milestones, user notes (pinned or unpinned), and video fragments.

You have access to the web_search tool. Use it to find real-world evidence for earthly milestones and to check whether existing prophetic milestones may already be confirmed in the real world.

CURRENT MAP DATA:
${MAP_CONTEXT_PLACEHOLDER}

AVAILABLE NARRATIVES (use these IDs when linking suggestions):
${NARRATIVE_LIST_PLACEHOLDER}

Perform a DEEP RESEARCH ANALYSIS:

1. MAP HEALTH AUDIT — identify timeline gaps, contradictions between milestones, orphaned narratives (no milestones), and UPPER_PROPHETIC milestones overdue for earthly confirmation.

2. CONFIRMATION LINKING — for existing UPPER_PROPHETIC milestones, use web_search to check whether real-world events already confirm or contradict them. If genuinely confirmed, include a new LOWER_EARTHLY suggestion with tier "sourced", real sources from your search, and confirmsMilestoneId set to that milestone's id from the map data.

3. NEW SUGGESTIONS — propose 5-12 NEW milestones (either hemisphere) that enrich the timeline. Do not duplicate existing milestones. For LOWER_EARTHLY suggestions where real evidence exists, search the web and cite sources. For UPPER_PROPHETIC extrapolations, tier as "speculative" unless strongly inferred from map patterns.

4. Every suggestion MUST include tier: "sourced" (has verifiable citation from web search), "inferred" (pattern-based from map data, no citation), or "speculative" (prophetic extrapolation).

5. WEB SEARCH REQUIREMENT — you have a web_search tool with a per-run limit. Use it actively: run multiple searches for confirmation linking and earthly evidence before writing your analysis. Do not skip web search when real-world verification is possible.

Write your prose analysis first (several paragraphs, no markdown headers).

Then on its own line write exactly: ---HEALTH---
Then a JSON array (no markdown fence) of health issues, each:
{
  "type": "gap" | "contradiction" | "orphaned_narrative" | "overdue_confirmation",
  "title": "short title",
  "description": "1-2 sentences"
}

Then on its own line write exactly: ---SUGGESTIONS---
Then a JSON array (no markdown fence) of suggestions, each:
{
  "title": "short title",
  "description": "1-2 sentences",
  "targetDate": "YYYY-MM-DD",
  "hemisphere": "UPPER_PROPHETIC" or "LOWER_EARTHLY",
  "narrativeId": "narrative id from list or null",
  "isFuzzy": false,
  "fuzzyRangeMonths": 3,
  "reasoning": "why this belongs on the map",
  "tier": "sourced" | "inferred" | "speculative",
  "sources": [{"url": "https://...", "title": "source title"}],
  "confirmsMilestoneId": "milestone id from map or null"
}`;

export function getDefaultPromptTemplate(mode: DeepAnalysisMode): string {
  return mode === "deep" ? DEFAULT_DEEP_PROMPT_TEMPLATE : DEFAULT_QUICK_PROMPT_TEMPLATE;
}

export function resolvePromptTemplate(
  mode: DeepAnalysisMode,
  customTemplate: string | null | undefined
): string {
  const trimmed = customTemplate?.trim();
  if (trimmed) return trimmed;
  return getDefaultPromptTemplate(mode);
}

export function buildAnalysisPrompt(
  template: string,
  mapContext: string,
  narrativeList: string
): string {
  let prompt = template
    .split(MAP_CONTEXT_PLACEHOLDER).join(mapContext)
    .split(NARRATIVE_LIST_PLACEHOLDER).join(narrativeList || "None — use narrativeId null");

  if (!template.includes(MAP_CONTEXT_PLACEHOLDER)) {
    prompt += `\n\nCURRENT MAP DATA:\n${mapContext}`;
  }
  if (!template.includes(NARRATIVE_LIST_PLACEHOLDER)) {
    prompt += `\n\nAVAILABLE NARRATIVES (use these IDs when linking suggestions):\n${narrativeList || "None — use narrativeId null"}`;
  }

  return prompt;
}

export const PROMPT_PLACEHOLDER_HINT =
  "Use {{MAP_CONTEXT}} and {{NARRATIVE_LIST}} where map data should be inserted. Keep ---SUGGESTIONS--- (and ---HEALTH--- for deep research) so results can be parsed.";
