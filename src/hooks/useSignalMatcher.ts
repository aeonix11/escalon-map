import { useCallback, useState } from "react";
import type { Narrative } from "@/lib/schema";

export interface MatchResponse {
  matched: boolean;
  narrativeId: string | null;
  reasoning: string;
  candidates: Narrative[];
}

export function useSignalMatcher() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchSignal = useCallback(async (signalId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/signals/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId }),
      });
      if (!res.ok) throw new Error("Match failed");
      return (await res.json()) as MatchResponse;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { matchSignal, loading, error };
}
