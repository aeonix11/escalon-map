import { useCallback, useState } from "react";
import {
  parseMapDeepAnalysis,
  type MapHealthIssue,
  type MapMilestoneSuggestion,
} from "@/lib/mapAnalysis";
import type {
  DeepAnalysisMode,
  DeepModelChoice,
} from "@/lib/anthropic";
import { DEEP_STATUS_MARKER, formatDeepStatus } from "@/lib/deepAnalysisStream";
import type { MilestoneSuggestion } from "@/lib/schema";

export interface DeepAnalysisRunOptions {
  mode: DeepAnalysisMode;
  model: DeepModelChoice;
  maxSearches: number;
  narrativeId: string | null;
}

function stripDeepStreamMarkers(text: string): {
  clean: string;
  status: string | null;
} {
  let status: string | null = null;
  const clean = text.replace(DEEP_STATUS_MARKER, (match) => {
    status = match.slice("__STATUS__".length, -"__".length);
    return "";
  });
  return { clean, status };
}

export function useMapDeepAnalysis() {
  const [running, setRunning] = useState(false);
  const [rawOutput, setRawOutput] = useState("");
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [health, setHealth] = useState<MapHealthIssue[]>([]);
  const [suggestions, setSuggestions] = useState<MapMilestoneSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  const runDeepAnalysis = useCallback(
    async (
      options: DeepAnalysisRunOptions,
      onComplete?: () => void | Promise<void>
    ) => {
      setRunning(true);
      setRawOutput("");
      setRunStatus(null);
      setRunError(null);
      setAnalysis("");
      setHealth([]);
      setSuggestions([]);
      setSelected(new Set());

      try {
        const res = await fetch("/api/map-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: options.mode,
            model: options.model,
            maxSearches: options.maxSearches,
            narrativeId: options.narrativeId,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Analysis failed" }));
          setRunError(err.error ?? "Analysis failed");
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let text = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          const { clean, status } = stripDeepStreamMarkers(text);
          setRawOutput(clean);
          if (status) setRunStatus(formatDeepStatus(status));
        }

        const { clean } = stripDeepStreamMarkers(text);

        // If the server wrote an inline error (stream started as 200 but threw
        // mid-stream), surface it as a proper error rather than analysis text.
        const inlineError = clean.match(/\n\nError: ([\s\S]+)/);
        if (inlineError) {
          setRunError(inlineError[1].trim());
          return;
        }

        // If the stream completed with no text at all, something went wrong
        // server-side but the error didn't make it into the stream.
        if (!clean.trim()) {
          setRunError(
            "No output received from the model. This usually means the API request failed silently. " +
            "Check the black server console window for error details, then try again. " +
            "If you see a model access error, your API key may not have access to Fable 5 yet."
          );
          return;
        }

        const parsed = parseMapDeepAnalysis(clean);
        setAnalysis(parsed.analysis);
        setHealth(parsed.health);
        setSuggestions(parsed.suggestions);
        await onComplete?.();
      } catch (e) {
        setRunError(e instanceof Error ? e.message : "Analysis failed");
      } finally {
        setRunning(false);
        setRunStatus(null);
      }
    },
    []
  );

  const syncSelectionFromStore = useCallback((stored: MilestoneSuggestion[]) => {
    setSelected(new Set(stored.map((s) => s.id)));
  }, []);

  const toggleSuggestion = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllSuggestions = useCallback((stored: MilestoneSuggestion[]) => {
    setSelected(new Set(stored.map((s) => s.id)));
  }, []);

  const clearResults = useCallback(() => {
    setRawOutput("");
    setAnalysis("");
    setHealth([]);
    setSuggestions([]);
    setSelected(new Set());
  }, []);

  const applySelected = useCallback(
    async (stored: MilestoneSuggestion[], onApplied?: () => void) => {
      const ids = stored.filter((s) => selected.has(s.id)).map((s) => s.id);
      if (ids.length === 0) return false;

      setApplying(true);
      try {
        const res = await fetch("/api/milestone-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) return false;
        onApplied?.();
        return true;
      } finally {
        setApplying(false);
      }
    },
    [selected]
  );

  return {
    running,
    rawOutput,
    runStatus,
    runError,
    analysis,
    health,
    suggestions,
    selected,
    applying,
    runDeepAnalysis,
    syncSelectionFromStore,
    toggleSuggestion,
    selectAllSuggestions,
    clearResults,
    applySelected,
  };
}
