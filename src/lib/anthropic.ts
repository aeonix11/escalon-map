import Anthropic from "@anthropic-ai/sdk";

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
    model: "claude-sonnet-4-20250514",
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
  narratives: NarrativeCandidate[]
): Promise<AsyncIterable<string>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return (async function* () {
      yield "ANTHROPIC_API_KEY not configured. Add your key in Settings to run deep analysis.";
    })();
  }

  const narrativeList = narratives
    .map(
      (n) =>
        `- ID: ${n.id}\n  Title: ${n.title}\n  Description: ${n.description ?? "N/A"}`
    )
    .join("\n");

  const anthropic = getClient();
  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `You are an expert analyst of prophetic timelines and geopolitical signals. The user has a prophecy map spanning 2012-2075 with two hemispheres: UPPER_PROPHETIC (visionary/prophetic above the axis) and LOWER_EARTHLY (real-world confirmed signals below).

CURRENT MAP DATA:
${mapContext}

AVAILABLE NARRATIVES (use these IDs when linking suggestions):
${narrativeList || "None — use narrativeId null"}

Perform a DEEP ANALYSIS of this map:
1. Identify patterns, convergences, gaps, and tensions across narratives and dates
2. Note what's missing or underrepresented on the timeline
3. Suggest where earthly signals might confirm or challenge prophetic milestones
4. Be specific with dates and narrative names

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
  "reasoning": "why this belongs on the map"
}`,
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

export async function streamMapChat(
  systemPrompt: string,
  userMessage: string
): Promise<AsyncIterable<string>> {
  const anthropic = getClient();
  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
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
    model: "claude-sonnet-4-20250514",
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
