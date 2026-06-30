"use client";

import { useMemo } from "react";
import type { AiNewsSignal, Narrative } from "@/lib/schema";

interface HistoryTabProps {
  signals: AiNewsSignal[];
  narratives: Narrative[];
  expanded?: boolean;
}

export default function HistoryTab({
  signals,
  narratives,
  expanded = false,
}: HistoryTabProps) {
  const history = useMemo(
    () =>
      signals
        .filter((s) => s.status === "ACCEPTED" || s.status === "DISMISSED")
        .sort(
          (a, b) =>
            Date.parse(b.createdAt) - Date.parse(a.createdAt)
        ),
    [signals]
  );

  const getNarrativeTitle = (narrativeId: string | null) => {
    if (!narrativeId) return null;
    return narratives.find((n) => n.id === narrativeId)?.title ?? null;
  };

  const cardGridClass = expanded
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
    : "space-y-2";

  return (
    <div className="h-full overflow-y-auto p-3">
      {history.length === 0 && (
        <p className="text-xs text-slate-500">No history yet.</p>
      )}
      <div className={cardGridClass}>
      {history.map((signal) => {
        const narrativeTitle = getNarrativeTitle(signal.matchedNarrativeId);
        return (
          <div
            key={signal.id}
            className="rounded-lg border border-slate-200 bg-slate-50 p-2 h-full"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-slate-800">{signal.title}</p>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] ${
                  signal.status === "ACCEPTED"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {signal.status}
              </span>
            </div>
            {signal.summary && (
              <p className="mt-1 text-[10px] text-slate-600 line-clamp-2">
                {signal.summary}
              </p>
            )}
            {signal.sourceName && (
              <p className="mt-1 text-[10px] text-slate-500">{signal.sourceName}</p>
            )}
            {narrativeTitle && (
              <p className="mt-1 text-[10px] text-violet-700">
                Narrative: {narrativeTitle}
              </p>
            )}
            {signal.reasoningNote && (
              <p className="mt-1 text-[10px] text-slate-600">{signal.reasoningNote}</p>
            )}
            <p className="mt-1 text-[9px] text-slate-400">
              {new Date(signal.createdAt).toLocaleString()}
            </p>
          </div>
        );
      })}
      </div>
    </div>
  );
}
