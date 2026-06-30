import { NextRequest } from "next/server";
import { initDb } from "@/lib/db";
import {
  narratives,
  milestones,
  fragments,
  fragmentNarratives,
} from "@/lib/schema";
import { streamMapChat } from "@/lib/anthropic";
import {
  bufferToEmbedding,
  cosineSimilarity,
  embedQuery,
} from "@/lib/voyage";

const TOKEN_THRESHOLD = 120000;
const CHARS_PER_TOKEN = 4;

function serializeMap(
  allNarratives: typeof narratives.$inferSelect[],
  allMilestones: typeof milestones.$inferSelect[],
  allFragments: typeof fragments.$inferSelect[]
): string {
  let text = "=== NARRATIVES ===\n";
  for (const n of allNarratives) {
    text += `[${n.id}] ${n.title}: ${n.description ?? ""}\n`;
  }
  text += "\n=== MILESTONES ===\n";
  for (const m of allMilestones) {
    text += `[${m.id}] ${m.targetDate} | ${m.hemisphere} | ${m.title}: ${m.description ?? ""} (narrative: ${m.narrativeId ?? "none"})\n`;
  }
  text += "\n=== FRAGMENTS ===\n";
  for (const f of allFragments) {
    text += `[${f.id}] ${f.speaker} @ ${f.timestampSeconds}s: ${f.rawText}\n`;
  }
  return text;
}

export async function POST(req: NextRequest) {
  const db = await initDb();
  const { question } = await req.json();

  const [allNarratives, allMilestones, allFragments] = await Promise.all([
    db.select().from(narratives),
    db.select().from(milestones),
    db.select().from(fragments),
  ]);

  const fullContext = serializeMap(
    allNarratives,
    allMilestones,
    allFragments
  );
  const estimatedTokens = fullContext.length / CHARS_PER_TOKEN;

  let contextMode: "full" | "retrieved" = "full";
  let contextText = fullContext;

  if (estimatedTokens > TOKEN_THRESHOLD) {
    contextMode = "retrieved";
    const queryEmbedding = await embedQuery(question);
    if (queryEmbedding) {
      const scoredFragments = allFragments
        .filter((f) => f.embedding)
        .map((f) => ({
          text: `[Fragment] ${f.speaker}: ${f.rawText}`,
          score: cosineSimilarity(
            queryEmbedding,
            bufferToEmbedding(f.embedding!)
          ),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);

      const scoredNarratives = allNarratives
        .filter((n) => n.embedding)
        .map((n) => ({
          text: `[Narrative] ${n.title}: ${n.description ?? ""}`,
          score: cosineSimilarity(
            queryEmbedding,
            bufferToEmbedding(n.embedding!)
          ),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      const scoredMilestones = allMilestones
        .map((m) => ({
          text: `[Milestone] ${m.targetDate} ${m.hemisphere} ${m.title}: ${m.description ?? ""}`,
          score: 0,
        }))
        .filter((m) =>
          m.text.toLowerCase().includes(question.toLowerCase().split(" ")[0])
        )
        .slice(0, 10);

      contextText = [
        ...scoredNarratives,
        ...scoredMilestones,
        ...scoredFragments,
      ]
        .map((s) => s.text)
        .join("\n");
    }
  }

  const systemPrompt = `You are an expert analyst of prophetic timelines and geopolitical signals. The user has built a personal prophecy map spanning 2026-2075 with two hemispheres: UPPER_PROPHETIC (visionary/prophetic data above the axis) and LOWER_EARTHLY (real-world confirmed signals below the axis).

Here is the relevant map data:
${contextText}

Answer the user's question based on this data. Be specific, reference dates, narratives, and patterns. Note gaps and convergences.`;

  const stream = await streamMapChat(systemPrompt, question);

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Context-Mode": contextMode,
    },
  });
}
