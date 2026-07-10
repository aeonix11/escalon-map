import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { fragments, narratives, milestones } from "@/lib/schema";
import {
  bufferToEmbedding,
  cosineSimilarity,
  embedQuery,
} from "@/lib/voyage";
import { resolveOwnerMapContext } from "@/lib/mapContext";
import { fetchMapPayload } from "@/lib/mapData";
import { loadUserApiKeys, missingVoyageKeyResponse } from "@/lib/userApiKeys";

export async function POST(req: NextRequest) {
  const ctx = await resolveOwnerMapContext();
  const keys = await loadUserApiKeys(ctx.userId!);
  const db = ctx.db;
  const { query, type } = await req.json();

  const queryEmbedding = await embedQuery(query, keys.voyageApiKey);
  if (!queryEmbedding) {
    if (!keys.voyageApiKey) {
      return NextResponse.json(missingVoyageKeyResponse(), { status: 400 });
    }
    return NextResponse.json({ results: [], note: "Embedding failed" });
  }

  if (type === "fragments") {
    const allFragments = await db
      .select()
      .from(fragments)
      .where(eq(fragments.mapId, ctx.mapId));
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
    const allNarratives = await db
      .select()
      .from(narratives)
      .where(eq(narratives.mapId, ctx.mapId));
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

  const payload = await fetchMapPayload(ctx.mapId);
  const milestoneResults = payload.milestones
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
