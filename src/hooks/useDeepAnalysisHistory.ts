import { useCallback, useState } from "react";
import type { MapHealthIssue, MapMilestoneSuggestion } from "@/lib/mapAnalysis";
import type { DeepAnalysisMode } from "@/lib/anthropic";

export interface DeepAnalysisRunSummary {
  id: string;
  preview: string;
  model: string | null;
  mode: DeepAnalysisMode;
  scopeNarrativeId: string | null;
  suggestionCount: number;
  createdAt: string;
}

export interface DeepAnalysisRunDetail extends DeepAnalysisRunSummary {
  analysisText: string;
  suggestions: MapMilestoneSuggestion[];
  health: MapHealthIssue[];
}

export function useDeepAnalysisHistory() {
  const [runs, setRuns] = useState<DeepAnalysisRunSummary[]>([]);
  const [selectedRun, setSelectedRun] = useState<DeepAnalysisRunDetail | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/deep-analysis-history");
      if (!res.ok) return;
      const data = await res.json();
      setRuns(data.runs ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRun = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(
        `/api/deep-analysis-history?id=${encodeURIComponent(id)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.run) setSelectedRun(data.run);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const deleteRun = useCallback(
    async (id: string) => {
      const res = await fetch("/api/deep-analysis-history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) return false;
      setRuns((prev) => prev.filter((r) => r.id !== id));
      if (selectedRun?.id === id) setSelectedRun(null);
      return true;
    },
    [selectedRun?.id]
  );

  const clearSelected = useCallback(() => setSelectedRun(null), []);

  return {
    runs,
    selectedRun,
    loading,
    loadingDetail,
    loadHistory,
    loadRun,
    deleteRun,
    clearSelected,
  };
}
