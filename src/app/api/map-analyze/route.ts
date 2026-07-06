import { NextResponse } from "next/server";
import { narratives, milestones, fragments, milestoneSuggestions, notes, deepAnalysisRuns } from "@/lib/schema";
import { streamMapDeepAnalysis, getClaudeModelId } from "@/lib/anthropic";
import { parseMapDeepAnalysis } from "@/lib/mapAnalysis";
import { saveDeepAnalysisRun } from "@/lib/deepAnalysisHistory";
import { serializeMapContext } from "@/lib/mapSerialize";
import {
  persistIfEditable,
  resolveMapContext,
} from "@/lib/mapContext";

export async function POST() {
  const ctx = await resolveMapContext();

  const [allNarratives, allMilestones, allFragments, allNotes] = await Promise.all([
    ctx.db.select().from(narratives),
    ctx.db.select().from(milestones),
    ctx.db.select().from(fragments),
    ctx.db.select().from(notes),
  ]);

  const mapContext = serializeMapContext(
    allNarratives,
    allMilestones,
    allFragments,
    allNotes
  );

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    let fullText = "";
    try {
      const textStream = await streamMapDeepAnalysis(
        mapContext,
        allNarratives.map((n) => ({
          id: n.id,
          title: n.title,
          description: n.description,
        }))
      );

      for await (const chunk of textStream) {
        fullText += chunk;
        await writer.write(encoder.encode(chunk));
      }

      const { analysis, suggestions } = parseMapDeepAnalysis(fullText);

      if (ctx.editable && analysis.trim()) {
        await saveDeepAnalysisRun(
          ctx.db,
          analysis,
          suggestions,
          getClaudeModelId()
        );
        persistIfEditable(ctx);
      }

      if (suggestions.length > 0) {
        if (ctx.editable) {
          await ctx.db.delete(milestoneSuggestions);
          const now = new Date().toISOString();
          for (const item of suggestions) {
            await ctx.db.insert(milestoneSuggestions).values({
              id: crypto.randomUUID(),
              narrativeId: item.narrativeId,
              title: item.title,
              description: item.description,
              targetDate: item.targetDate,
              isFuzzy: item.isFuzzy,
              fuzzyRangeMonths: item.fuzzyRangeMonths,
              hemisphere: item.hemisphere,
              reasoning: item.reasoning || null,
              createdAt: now,
            });
          }
          persistIfEditable(ctx);
        }
        await writer.write(
          encoder.encode(
            `\n\n---\nParsed ${suggestions.length} timeline suggestion(s).${
              ctx.editable
                ? " They are now on your timeline as AI-suggested boxes."
                : ""
            }`
          )
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Deep analysis failed";
      await writer.write(encoder.encode(`\n\nError: ${msg}`));
    } finally {
      await writer.close();
    }
  })();

  return new NextResponse(stream.readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Map-Editable": ctx.editable ? "true" : "false",
    },
  });
}

