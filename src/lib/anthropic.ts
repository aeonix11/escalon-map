import Anthropic from "@anthropic-ai/sdk";
import type { SearchResultLogEntry } from "@/lib/mapAnalysis";

/** Override with ANTHROPIC_MODEL in Settings / env if needed (e.g. claude-sonnet-5). */
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-6";

export type DeepModelChoice = "sonnet-4-6" | "sonnet-5" | "fable-5";
export type DeepAnalysisMode = "quick" | "deep";

const DEEP_MODEL_IDS: Record<DeepModelChoice, string> = {
  "sonnet-4-6": "claude-sonnet-4-6",
  "sonnet-5": "claude-sonnet-5",
  "fable-5": "claude-fable-5",
};

export interface DeepAnalysisOptions {
  mode?: DeepAnalysisMode;
  model?: DeepModelChoice;
  maxSearches?: number;
  searchLog?: SearchResultLogEntry[];
}

function getClaudeModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_CLAUDE_MODEL;
}

export function getClaudeModelId(model?: DeepModelChoice): string {
  if (model) return DEEP_MODEL_IDS[model];
  return getClaudeModel();
}

function appendSearchResultsFromBlock(
  block: unknown,
  log: SearchResultLogEntry[]
) {
  if (!block || typeof block !== "object") return;
  const b = block as Record<string, unknown>;
  if (b.type !== "web_search_tool_result") return;
  const content = b.content;
  if (!Array.isArray(content)) return;
  const seen = new Set(log.map((e) => e.url));
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (typeof r.url !== "string" || seen.has(r.url)) continue;
    seen.add(r.url);
    log.push({
      url: r.url,
      title: typeof r.title === "string" ? r.title : r.url,
    });
  }
}

function buildQuickPrompt(mapContext: string, narrativeList: string): string {
  return `You are an expert analyst of prophetic timelines and geopolitical signals. The user has a prophecy map spanning 2012-2075 with two hemispheres: UPPER_PROPHETIC (visionary/prophetic above the axis) and LOWER_EARTHLY (real-world confirmed signals below). Map data includes narratives, milestones, user notes (pinned or unpinned), and video fragments.

CURRENT MAP DATA:
${mapContext}

AVAILABLE NARRATIVES (use these IDs when linking suggestions):
${narrativeList || "None — use narrativeId null"}

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
}

function buildDeepResearchPrompt(mapContext: string, narrativeList: string): string {
  return `You are an expert analyst of prophetic timelines and geopolitical signals. The user has a prophecy map spanning 2012-2075 with two hemispheres: UPPER_PROPHETIC (visionary/prophetic above the axis) and LOWER_EARTHLY (real-world confirmed signals below). Map data includes narratives, milestones, user notes (pinned or unpinned), and video fragments.

You have access to the web_search tool. Use it to find real-world evidence for earthly milestones and to check whether existing prophetic milestones may already be confirmed in the real world.

CURRENT MAP DATA:
${mapContext}

AVAILABLE NARRATIVES (use these IDs when linking suggestions):
${narrativeList || "None — use narrativeId null"}

Perform a DEEP RESEARCH ANALYSIS:

1. MAP HEALTH AUDIT — identify timeline gaps, contradictions between milestones, orphaned narratives (no milestones), and UPPER_PROPHETIC milestones overdue for earthly confirmation.

2. CONFIRMATION LINKING — for existing UPPER_PROPHETIC milestones, use web_search to check whether real-world events already confirm or contradict them. If genuinely confirmed, include a new LOWER_EARTHLY suggestion with tier "sourced", real sources from your search, and confirmsMilestoneId set to that milestone's id from the map data.

3. NEW SUGGESTIONS — propose 5-12 NEW milestones (either hemisphere) that enrich the timeline. Do not duplicate existing milestones. For LOWER_EARTHLY suggestions where real evidence exists, search the web and cite sources. For UPPER_PROPHETIC extrapolations, tier as "speculative" unless strongly inferred from map patterns.

4. Every suggestion MUST include tier: "sourced" (has verifiable citation from web search), "inferred" (pattern-based from map data, no citation), or "speculative" (prophetic extrapolation).

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
}

let client: Anthropic | null = null;

function getClient() {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    });
  }
  return client;
}

export interface NarrativeCandidate {
  id: string;
  title: string;
  description: string | null;
}

export interface MatchResult {
  matched: boolean;
  narrativeId: string | null;
  reasoning: string;
}

export async function reasonMatch(
  signalTitle: string,
  signalSummary: string | null,
  candidates: NarrativeCandidate[]
): Promise<MatchResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      matched: false,
      narrativeId: candidates[0]?.id ?? null,
      reasoning: "ANTHROPIC_API_KEY not configured.",
    };
  }

  const anthropic = getClient();
  const candidateList = candidates
    .map(
      (c) =>
        `- ID: ${c.id}\n  Title: ${c.title}\n  Description: ${c.description ?? "N/A"}`
    )
    .join("\n");

  const response = await anthropic.messages.create({
    model: getClaudeModel(),
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are analyzing whether a real-world news signal matches prophetic narrative themes.

NEWS SIGNAL:
Title: ${signalTitle}
Summary: ${signalSummary ?? "N/A"}

CANDIDATE NARRATIVES:
${candidateList}

Respond in JSON only:
{
  "matched": true/false,
  "narrativeId": "id of best match or null",
  "reasoning": "brief explanation of why it matches or doesn't"
}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as MatchResult;
    }
  } catch {
    // fall through
  }

  return {
    matched: false,
    narrativeId: null,
    reasoning: text,
  };
}

export async function streamMapDeepAnalysis(
  mapContext: string,
  narratives: NarrativeCandidate[],
  options: DeepAnalysisOptions = {}
): Promise<AsyncIterable<string>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return (async function* () {
      yield "ANTHROPIC_API_KEY not configured. Add your key in Settings to run deep analysis.";
    })();
  }

  const mode = options.mode ?? "quick";
  const narrativeList = narratives
    .map(
      (n) =>
        `- ID: ${n.id}\n  Title: ${n.title}\n  Description: ${n.description ?? "N/A"}`
    )
    .join("\n");

  const prompt =
    mode === "deep"
      ? buildDeepResearchPrompt(mapContext, narrativeList)
      : buildQuickPrompt(mapContext, narrativeList);

  const anthropic = getClient();
  const modelId =
    mode === "deep"
      ? DEEP_MODEL_IDS[options.model ?? "sonnet-4-6"]
      : getClaudeModel();

  const maxSearches = Math.max(1, Math.min(options.maxSearches ?? 5, 20));
  const searchLog = options.searchLog;

  const baseParams = {
    model: modelId,
    max_tokens: mode === "deep" ? 16384 : 8192,
    messages: [{ role: "user" as const, content: prompt }],
  };

  const stream =
    mode === "deep"
      ? anthropic.messages.stream({
          ...baseParams,
          tools: [
            {
              type: "web_search_20250305",
              name: "web_search",
              max_uses: maxSearches,
            },
          ] as unknown as Anthropic.Messages.Tool[],
          thinking: { type: "enabled", budget_tokens: 4096 },
        })
      : anthropic.messages.stream(baseParams);

  return (async function* () {
    for await (const event of stream) {
      if (event.type === "content_block_start" && searchLog) {
        appendSearchResultsFromBlock(event.content_block, searchLog);
      }
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
    if (searchLog) {
      try {
        const finalMessage = await stream.finalMessage();
        for (const block of finalMessage.content) {
          appendSearchResultsFromBlock(block, searchLog);
        }
      } catch {
        // ignore final message errors
      }
    }
  })();
}

export async function streamMapChat(
  systemPrompt: string,
  userMessage: string
): Promise<AsyncIterable<string>> {
  const anthropic = getClient();
  const stream = await anthropic.messages.stream({
    model: getClaudeModel(),
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  return (async function* () {
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  })();
}

export interface ScanSignalInput {
  id: string;
  title: string;
  summary: string | null;
}

export interface ScanMilestoneInput {
  title: string;
  description: string | null;
  targetDate: string;
  hemisphere: string;
}

export interface ScanResultItem {
  signalId: string;
  matched: boolean;
  narrativeId: string | null;
  reasoning: string;
}

export async function streamSignalScan(
  narratives: NarrativeCandidate[],
  milestones: ScanMilestoneInput[],
  signals: ScanSignalInput[]
): Promise<AsyncIterable<string>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return (async function* () {
      yield "ANTHROPIC_API_KEY not configured. Cannot scan signals.";
    })();
  }

  const narrativeList = narratives
    .map(
      (n) =>
        `- ID: ${n.id}\n  Title: ${n.title}\n  Description: ${n.description ?? "N/A"}`
    )
    .join("\n");

  const milestoneList = milestones
    .map(
      (m) =>
        `- ${m.title} (${m.targetDate}, ${m.hemisphere}): ${m.description ?? "N/A"}`
    )
    .join("\n");

  const signalList = signals
    .map(
      (s) =>
        `- ID: ${s.id}\n  Title: ${s.title}\n  Summary: ${s.summary ?? "N/A"}`
    )
    .join("\n");

  const anthropic = getClient();
  const stream = await anthropic.messages.stream({
    model: getClaudeModel(),
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are analyzing real-world news signals against a prophetic/geopolitical timeline map.

PROPHETIC NARRATIVES:
${narrativeList || "None"}

TIMELINE MILESTONES:
${milestoneList || "None"}

PENDING NEWS SIGNALS:
${signalList}

Review these signals and identify which ones are meaningfully relevant to the narratives or milestones on this map. Be selective — only flag signals with genuine thematic connection.

First, write a brief analysis (2-4 sentences) explaining your overall assessment.

Then end your response with a JSON array (no markdown fence) of up to 10 matches:
[
  {
    "signalId": "id from list",
    "matched": true,
    "narrativeId": "best narrative id or null",
    "reasoning": "brief why this matters to the map"
  }
]

Only include signals that are genuinely relevant. If none match, return an empty array [].`,
      },
    ],
  });

  return (async function* () {
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  })();
}

export function parseScanResults(text: string): ScanResultItem[] {
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (!arrayMatch) return [];

  try {
    const parsed = JSON.parse(arrayMatch[0]) as ScanResultItem[];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.signalId === "string" &&
        typeof item.matched === "boolean"
    );
  } catch {
    return [];
  }
}
