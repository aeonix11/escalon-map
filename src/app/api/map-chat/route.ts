import { NextRequest } from "next/server";
import { narratives, milestones, fragments, notes } from "@/lib/schema";
import { streamMapChat } from "@/lib/anthropic";
import { formatNoteForRetrieval, serializeMapContext } from "@/lib/mapSerialize";
import {
  bufferToEmbedding,
  cosineSimilarity,
  embedQuery,
} from "@/lib/voyage";
import { resolveMapContext } from "@/lib/mapContext";

const TOKEN_THRESHOLD = 120000;
const CHARS_PER_TOKEN = 4;

export async function POST(req: NextRequest) {
  const ctx = await resolveMapContext();
  const db = ctx.db;
  const { question } = await req.json();

  const [allNarratives, allMilestones, allFragments, allNotes] = await Promise.all([
    db.select().from(narratives),
    db.select().from(milestones),
    db.select().from(fragments),
    db.select().from(notes),
  ]);

  const fullContext = serializeMapContext(
    allNarratives,
    allMilestones,
    allFragments,
    allNotes
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

      const questionLower = question.toLowerCase();
      const questionWords = questionLower.split(/\s+/).filter(Boolean) as string[];

      const scoredMilestones = allMilestones
        .map((m) => ({
          text: `[Milestone] ${m.targetDate} ${m.hemisphere} ${m.title}: ${m.description ?? ""}`,
          score: 0,
        }))
        .filter((m) =>
          questionWords.some((w) => m.text.toLowerCase().includes(w))
        )
        .slice(0, 10);

      const scoredNotes = allNotes
        .map((n) => ({
          text: formatNoteForRetrieval(n),
          score: 0,
        }))
        .filter((n) =>
          questionWords.some((w) => n.text.toLowerCase().includes(w))
        )
        .slice(0, 10);

      const noteContext =
        scoredNotes.length > 0
          ? scoredNotes
          : [...allNotes]
              .sort((a, b) =>
                (b.updatedAt || b.createdAt).localeCompare(
                  a.updatedAt || a.createdAt
                )
              )
              .slice(0, 5)
              .map((n) => ({ text: formatNoteForRetrieval(n), score: 0 }));

      contextText = [
        ...scoredNarratives,
        ...scoredMilestones,
        ...noteContext,
        ...scoredFragments,
      ]
        .map((s) => s.text)
        .join("\n");
    }
  }

  const systemPrompt = `You are an expert analyst of prophetic timelines and geopolitical signals. The user has built a personal prophecy map spanning 2012-2075 with two hemispheres: UPPER_PROPHETIC (visionary/prophetic data above the axis) and LOWER_EARTHLY (real-world confirmed signals below the axis).

Here is the relevant map data (narratives, milestones, notes, and video fragments):
${contextText}

Answer the user's question based on this data. Be specific, reference dates, narratives, notes, and patterns. Note gaps and convergences.`;

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
