import { NextRequest, NextResponse } from "next/server";
import { fragments, narratives, milestones } from "@/lib/schema";
import {
  bufferToEmbedding,
  cosineSimilarity,
  embedQuery,
} from "@/lib/voyage";
import { resolveMapContext } from "@/lib/mapContext";

export async function POST(req: NextRequest) {
  const ctx = await resolveMapContext();
  const db = ctx.db;
  const { query, type } = await req.json();

  const queryEmbedding = await embedQuery(query);
  if (!queryEmbedding) {
    return NextResponse.json({ results: [], note: "VOYAGE_API_KEY not set" });
  }

  if (type === "fragments") {
    const allFragments = await db.select().from(fragments);
    const results = allFragments
      .filter((f) => f.embedding)
      .map((f) => ({
        item: f,
        score: cosineSimilarity(
          queryEmbedding,
          bufferToEmbedding(f.embedding!)
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return NextResponse.json({ results });
  }

  if (type === "narratives") {
    const allNarratives = await db.select().from(narratives);
    const results = allNarratives
      .filter((n) => n.embedding)
      .map((n) => ({
        item: n,
        score: cosineSimilarity(
          queryEmbedding,
          bufferToEmbedding(n.embedding!)
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return NextResponse.json({ results });
  }

  const allMilestones = await db.select().from(milestones);
  const milestoneResults = allMilestones
    .map((m) => ({
      item: m,
      score: 0,
      text: `${m.title} ${m.description ?? ""}`,
    }))
    .filter((m) =>
      m.text.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 10);

  return NextResponse.json({ results: milestoneResults });
}
