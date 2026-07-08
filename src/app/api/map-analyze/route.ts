import { NextRequest, NextResponse } from "next/server";
import {
  narratives,
  milestones,
  fragments,
  fragmentNarratives,
  milestoneSuggestions,
  notes,
} from "@/lib/schema";
import {
  streamMapDeepAnalysis,
  getClaudeModelId,
  type DeepAnalysisOptions,
  type DeepModelChoice,
  type DeepAnalysisMode,
} from "@/lib/anthropic";
import { DEEP_STATUS_MARKER } from "@/lib/deepAnalysisStream";
import {
  parseMapDeepAnalysis,
  verifySuggestionSources,
  type SearchResultLogEntry,
} from "@/lib/mapAnalysis";
import { saveDeepAnalysisRun } from "@/lib/deepAnalysisHistory";
import { resolvePromptTemplate } from "@/lib/deepAnalysisPrompts";
import { serializeMapContext } from "@/lib/mapSerialize";
import { readSettings } from "@/lib/settings";
import {
  persistIfEditable,
  resolveMapContext,
} from "@/lib/mapContext";

interface AnalyzeRequestBody {
  mode?: DeepAnalysisMode;
  model?: DeepModelChoice;
  maxSearches?: number;
  narrativeId?: string | null;
}

export async function POST(req: NextRequest) {
  const ctx = await resolveMapContext();

  let body: AnalyzeRequestBody = {};
  try {
    body = (await req.json()) as AnalyzeRequestBody;
  } catch {
    // empty body is fine — defaults to quick mode
  }

  const mode: DeepAnalysisMode = body.mode === "deep" ? "deep" : "quick";
  const model: DeepModelChoice = body.model ?? "sonnet-4-6";
  const maxSearches =
    typeof body.maxSearches === "number"
      ? Math.max(1, Math.min(body.maxSearches, 20))
      : mode === "deep"
        ? model === "fable-5"
          ? 8
          : model === "sonnet-5"
            ? 6
            : 5
        : 0;
  const scopeNarrativeId = body.narrativeId?.trim() || null;

  const [
    allNarratives,
    allMilestones,
    allFragments,
    allNotes,
    allFragmentNarratives,
  ] = await Promise.all([
    ctx.db.select().from(narratives),
    ctx.db.select().from(milestones),
    ctx.db.select().from(fragments),
    ctx.db.select().from(notes),
    ctx.db.select().from(fragmentNarratives),
  ]);

  let filteredNarratives = allNarratives;
  let filteredMilestones = allMilestones;
  let filteredFragments = allFragments;

  if (scopeNarrativeId) {
    filteredNarratives = allNarratives.filter((n) => n.id === scopeNarrativeId);
    filteredMilestones = allMilestones.filter(
      (m) => m.narrativeId === scopeNarrativeId
    );
    const linkedFragmentIds = new Set(
      allFragmentNarratives
        .filter((fn) => fn.narrativeId === scopeNarrativeId)
        .map((fn) => fn.fragmentId)
    );
    filteredFragments = allFragments.filter((f) => linkedFragmentIds.has(f.id));
  }

  const mapContext = serializeMapContext(
    filteredNarratives,
    filteredMilestones,
    filteredFragments,
    allNotes
  );

  const searchLog: SearchResultLogEntry[] = [];
  const settings = readSettings();
  const promptTemplate = resolvePromptTemplate(
    mode,
    mode === "deep"
      ? settings.deepAnalysisDeepPrompt
      : settings.deepAnalysisQuickPrompt
  );
  const analysisOptions: DeepAnalysisOptions = {
    mode,
    model: mode === "deep" ? model : undefined,
    maxSearches: mode === "deep" ? maxSearches : undefined,
    searchLog,
    promptTemplate,
  };

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    let fullText = "";
    try {
      const textStream = await streamMapDeepAnalysis(
        mapContext,
        filteredNarratives.map((n) => ({
          id: n.id,
          title: n.title,
          description: n.description,
        })),
        analysisOptions
      );

      for await (const chunk of textStream) {
        fullText += chunk;
        await writer.write(encoder.encode(chunk));
      }

      console.log(`[map-analyze] stream done, fullText length=${fullText.length}, mode=${mode}, model=${model}`);

      const parsed = parseMapDeepAnalysis(fullText.replace(DEEP_STATUS_MARKER, ""));
      let suggestions = parsed.suggestions;
      if (mode === "deep" && searchLog.length > 0) {
        suggestions = verifySuggestionSources(suggestions, searchLog);
      }

      const modelUsed =
        mode === "deep" ? getClaudeModelId(model) : getClaudeModelId();

      if (ctx.editable && parsed.analysis.trim()) {
        await saveDeepAnalysisRun(
          ctx.db,
          parsed.analysis,
          suggestions,
          modelUsed,
          {
            mode,
            health: parsed.health,
            scopeNarrativeId,
          }
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
              sourcesJson: JSON.stringify(item.sources ?? []),
              tier: item.tier ?? "inferred",
              confirmsMilestoneId: item.confirmsMilestoneId ?? null,
              createdAt: now,
            });
          }
          persistIfEditable(ctx);
        }
        const healthNote =
          parsed.health.length > 0
            ? ` Found ${parsed.health.length} map health issue(s).`
            : "";
        const searchNote =
          mode === "deep"
            ? ` Web search: ${searchLog.length} source URL(s) collected (limit ${maxSearches}).`
            : "";
        await writer.write(
          encoder.encode(
            `\n\n---\nParsed ${suggestions.length} timeline suggestion(s).${healthNote}${searchNote}${
              ctx.editable
                ? " They are now on your timeline as AI-suggested boxes."
                : ""
            }`
          )
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Deep analysis failed";
      console.error("[map-analyze] stream error:", msg);
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
