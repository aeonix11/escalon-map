import { useCallback, useState } from "react";
import {
  parseMapDeepAnalysis,
  type MapMilestoneSuggestion,
} from "@/lib/mapAnalysis";
import type { MilestoneSuggestion } from "@/lib/schema";

export function useMapDeepAnalysis() {
  const [running, setRunning] = useState(false);
  const [rawOutput, setRawOutput] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [suggestions, setSuggestions] = useState<MapMilestoneSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  const runDeepAnalysis = useCallback(async (onComplete?: () => void | Promise<void>) => {
    setRunning(true);
    setRawOutput("");
    setAnalysis("");
    setSuggestions([]);
    setSelected(new Set());

    try {
      const res = await fetch("/api/map-analyze", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        setAnalysis(err.error ?? "Analysis failed");
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
        setRawOutput(text);
      }

      const parsed = parseMapDeepAnalysis(text);
      setAnalysis(parsed.analysis);
      setSuggestions(parsed.suggestions);
      await onComplete?.();
    } catch (e) {
      setAnalysis(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setRunning(false);
    }
  }, []);

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
    analysis,
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
