"use client";

import { useState } from "react";
import type { AiNewsSignal, Narrative } from "@/lib/schema";
import { useSignalMatcher } from "@/hooks/useSignalMatcher";
import { useSignalScan } from "@/hooks/useSignalScan";
import { inputClass } from "@/components/forms/formStyles";

interface InboxTabProps {
  signals: AiNewsSignal[];
  narratives: Narrative[];
  onRefresh: () => void;
  expanded?: boolean;
  readOnly?: boolean;
  scan?: ReturnType<typeof useSignalScan>;
}

export default function InboxTab({
  signals,
  narratives,
  onRefresh,
  expanded = false,
  readOnly = false,
  scan: externalScan,
}: InboxTabProps) {
  const { matchSignal, loading: matching } = useSignalMatcher();
  const internalScan = useSignalScan(onRefresh);
  const { scanning, scanOutput, runDeepAnalysis } = externalScan ?? internalScan;
  const [newTitle, setNewTitle] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [matchResults, setMatchResults] = useState<
    Record<string, { reasoning: string; narrativeId: string | null }>
  >({});

  const inbox = signals.filter(
    (s) => s.status === "PENDING" || s.status === "MATCHED"
  );

  const handleMatch = async (signalId: string) => {
    const result = await matchSignal(signalId);
    if (result) {
      setMatchResults((prev) => ({
        ...prev,
        [signalId]: {
          reasoning: result.reasoning,
          narrativeId: result.narrativeId,
        },
      }));
      onRefresh();
    }
  };

  const handleAccept = async (signalId: string) => {
    await fetch("/api/signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", signalId }),
    });
    onRefresh();
  };

  const handleDismiss = async (signalId: string) => {
    await fetch("/api/signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss", signalId }),
    });
    onRefresh();
  };

  const handleDelete = async (signalId: string) => {
    if (!window.confirm("Delete this signal permanently?")) return;
    await fetch("/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "signal", id: signalId }),
    });
    onRefresh();
  };

  const handleAddSignal = async () => {
    if (!newTitle) return;
    await fetch("/api/signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        title: newTitle,
        summary: newSummary,
      }),
    });
    setNewTitle("");
    setNewSummary("");
    onRefresh();
  };

  const getNarrativeTitle = (narrativeId: string | null) => {
    if (!narrativeId) return null;
    return narratives.find((n) => n.id === narrativeId)?.title ?? null;
  };

  const cardGridClass = expanded
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
    : "space-y-3";

  return (
    <div className="flex h-full flex-col">
      {readOnly && (
        <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-[10px] text-amber-900">
          View-only map — signal actions are disabled.
        </p>
      )}

      {!readOnly && (
        <div className="border-b border-slate-200 p-3 space-y-2">
          <button
            onClick={runDeepAnalysis}
            disabled={scanning || inbox.length === 0}
            className="w-full rounded bg-violet-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {scanning ? "Scanning inbox…" : "Scan inbox signals"}
          </button>
          {scanOutput && (
            <pre
              className={`overflow-y-auto rounded border border-violet-100 bg-violet-50 p-2 text-[10px] text-violet-800 whitespace-pre-wrap ${
                expanded ? "max-h-32" : "max-h-24"
              }`}
            >
              {scanOutput}
            </pre>
          )}
        </div>
      )}

      {!readOnly && (
        <div className="border-b border-slate-200 p-3 space-y-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add signal title..."
            className={inputClass}
          />
          <textarea
            value={newSummary}
            onChange={(e) => setNewSummary(e.target.value)}
            placeholder="Summary..."
            className={`${inputClass} ${expanded ? "h-20" : "h-12"}`}
          />
          <button
            onClick={handleAddSignal}
            className="rounded bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-500"
          >
            Add Signal
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {inbox.length === 0 && (
          <p className="text-xs text-slate-500">No pending signals.</p>
        )}
        <div className={cardGridClass}>
        {inbox.map((signal) => {
          const narrativeTitle = getNarrativeTitle(
            matchResults[signal.id]?.narrativeId ?? signal.matchedNarrativeId
          );
          const reasoning =
            matchResults[signal.id]?.reasoning ?? signal.reasoningNote;

          return (
            <div
              key={signal.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-2 h-full flex flex-col"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-slate-800">{signal.title}</p>
                {signal.status === "MATCHED" && (
                  <span className="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] text-violet-700">
                    Matched
                  </span>
                )}
              </div>
              {signal.summary && (
                <p className="mt-1 text-[10px] text-slate-600 line-clamp-3">
                  {signal.summary}
                </p>
              )}
              {signal.sourceName && (
                <p className="mt-1 text-[10px] text-slate-500">{signal.sourceName}</p>
              )}
              {signal.url && (
                <a
                  href={signal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-[10px] text-sky-600 hover:underline truncate"
                >
                  {signal.url}
                </a>
              )}
              {reasoning && (
                <p className="mt-2 text-[10px] text-violet-700 bg-violet-50 rounded p-1 border border-violet-100">
                  {reasoning}
                </p>
              )}
              {narrativeTitle && (
                <p className="mt-1 text-[10px] text-slate-600">
                  Narrative: {narrativeTitle}
                </p>
              )}
              {!readOnly && (
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  onClick={() => handleMatch(signal.id)}
                  disabled={matching}
                  className="rounded bg-violet-600 px-2 py-0.5 text-[10px] text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  Match
                </button>
                <button
                  onClick={() => handleAccept(signal.id)}
                  className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] text-white hover:bg-emerald-500"
                >
                  Pin
                </button>
                <button
                  onClick={() => handleDismiss(signal.id)}
                  className="rounded bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700 hover:bg-slate-300"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => handleDelete(signal.id)}
                  className="rounded bg-red-100 px-2 py-0.5 text-[10px] text-red-700 hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
