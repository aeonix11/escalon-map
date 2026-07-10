import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import type { SearchResultLogEntry } from "@/lib/mapAnalysis";
import {
  buildAnalysisPrompt,
  resolvePromptTemplate,
} from "@/lib/deepAnalysisPrompts";

/** Override with ANTHROPIC_MODEL in env if needed (e.g. claude-sonnet-5). */
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
  promptTemplate?: string;
  apiKey: string;
}

const clientCache = new Map<string, Anthropic>();

function createAnthropicClient(apiKey: string): Anthropic {
  const cacheKey = createHash("sha256").update(apiKey).digest("hex");
  let client = clientCache.get(cacheKey);
  if (!client) {
    client = new Anthropic({ apiKey });
    clientCache.set(cacheKey, client);
  }
  return client;
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

function modelUsesAdaptiveThinking(modelId: string): boolean {
  return modelId === "claude-sonnet-5" || modelId === "claude-fable-5";
}

function modelUsesModernWebSearch(modelId: string): boolean {
  return (
    modelId === "claude-fable-5" ||
    modelId === "claude-sonnet-5" ||
    modelId === "claude-sonnet-4-6"
  );
}

function buildWebSearchTool(modelId: string, maxSearches: number): Record<string, unknown> {
  if (modelUsesModernWebSearch(modelId)) {
    return {
      type: "web_search_20260209",
      name: "web_search",
      max_uses: maxSearches,
      allowed_callers: ["direct"],
    };
  }
  return {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: maxSearches,
  };
}

function deepMaxTokens(modelId: string): number {
  if (modelId === "claude-fable-5") return 131072;
  if (modelId === "claude-sonnet-5") return 32768;
  return 16384;
}

function deepThinkingParams(modelId: string): Record<string, unknown> {
  if (modelUsesAdaptiveThinking(modelId)) {
    return {
      output_config: { effort: "high" },
    };
  }
  return {
    thinking: { type: "enabled", budget_tokens: 4096 },
  };
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
  apiKey: string,
  signalTitle: string,
  signalSummary: string | null,
  candidates: NarrativeCandidate[]
): Promise<MatchResult> {
  if (!apiKey) {
    return {
      matched: false,
      narrativeId: candidates[0]?.id ?? null,
      reasoning: "Anthropic API key not configured.",
    };
  }

  const anthropic = createAnthropicClient(apiKey);
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
  options: DeepAnalysisOptions
): Promise<AsyncIterable<string>> {
  if (!options.apiKey) {
    return (async function* () {
      yield "Add your Anthropic API key in Settings to run deep analysis.";
    })();
  }

  const mode = options.mode ?? "quick";
  const narrativeList = narratives
    .map(
      (n) =>
        `- ID: ${n.id}\n  Title: ${n.title}\n  Description: ${n.description ?? "N/A"}`
    )
    .join("\n");

  const prompt = buildAnalysisPrompt(
    options.promptTemplate ?? resolvePromptTemplate(mode, undefined),
    mapContext,
    narrativeList
  );

  const anthropic = createAnthropicClient(options.apiKey);
  const modelId =
    mode === "deep"
      ? DEEP_MODEL_IDS[options.model ?? "sonnet-4-6"]
      : getClaudeModel();

  const maxSearches = Math.max(1, Math.min(options.maxSearches ?? 5, 20));
  const searchLog = options.searchLog;

  const baseParams = {
    model: modelId,
    max_tokens: mode === "deep" ? deepMaxTokens(modelId) : 8192,
    messages: [{ role: "user" as const, content: prompt }],
  };

  const stream =
    mode === "deep"
      ? anthropic.messages.stream({
          ...baseParams,
          tools: [buildWebSearchTool(modelId, maxSearches)] as unknown as Anthropic.Messages.Tool[],
          ...deepThinkingParams(modelId),
        } as Anthropic.MessageStreamParams)
      : anthropic.messages.stream(baseParams);

  return (async function* () {
    let searchUses = 0;

    if (mode === "deep") {
      yield `__STATUS__model:${modelId}__`;
      yield `__STATUS__thinking__`;
    }

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        const block = event.content_block as unknown as Record<string, unknown>;
        if (searchLog) {
          appendSearchResultsFromBlock(block, searchLog);
        }
        if (block.type === "server_tool_use" && block.name === "web_search") {
          searchUses += 1;
          yield `__STATUS__search:${searchUses}/${maxSearches}__`;
        }
      }
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
    try {
      const finalMessage = await stream.finalMessage();
      console.log(`[anthropic] finalMessage stop_reason=${finalMessage.stop_reason} usage=${JSON.stringify(finalMessage.usage)}`);
      if (searchLog) {
        for (const block of finalMessage.content) {
          appendSearchResultsFromBlock(block, searchLog);
        }
      }
    } catch {
      // ignore final message errors
    }
  })();
}

export async function streamMapChat(
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<AsyncIterable<string>> {
  const anthropic = createAnthropicClient(apiKey);
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
  apiKey: string,
  narratives: NarrativeCandidate[],
  milestones: ScanMilestoneInput[],
  signals: ScanSignalInput[]
): Promise<AsyncIterable<string>> {
  if (!apiKey) {
    return (async function* () {
      yield "Add your Anthropic API key in Settings to scan signals.";
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

  const anthropic = createAnthropicClient(apiKey);
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
