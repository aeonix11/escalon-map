"use client";

import { useState } from "react";
import type { AiNewsSignal } from "@/lib/schema";
import { useSignalMatcher } from "@/hooks/useSignalMatcher";
import { inputClass } from "@/components/forms/formStyles";

interface SignalTrayProps {
  signals: AiNewsSignal[];
  onRefresh: () => void;
}

export default function SignalTray({ signals, onRefresh }: SignalTrayProps) {
  const { matchSignal, loading: matching } = useSignalMatcher();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { item: { id: string; speaker?: string; rawText?: string; title?: string }; score: number }[]
  >([]);
  const [newTitle, setNewTitle] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [matchResults, setMatchResults] = useState<
    Record<string, { reasoning: string; narrativeId: string | null }>
  >({});

  const pending = signals.filter(
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

  const handleSearch = async () => {
    if (!searchQuery) return;
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: searchQuery, type: "fragments" }),
    });
    const data = await res.json();
    setSearchResults(data.results ?? []);
  };

  return (
    <aside className="w-72 border-r border-slate-200 bg-white flex flex-col shadow-sm">
      <div className="border-b border-slate-200 p-3">
        <h2 className="text-xs font-semibold text-slate-800">Signal Tray</h2>
        <p className="text-[10px] text-slate-500">{pending.length} pending</p>
      </div>

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
          className={`${inputClass} h-12`}
        />
        <button
          onClick={handleAddSignal}
          className="rounded bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-500"
        >
          Add Signal
        </button>
      </div>

      <div className="border-b border-slate-200 p-3 space-y-2">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Semantic fragment search..."
          className={inputClass}
        />
        <button
          onClick={handleSearch}
          className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
        >
          Search Fragments
        </button>
        {searchResults.length > 0 && (
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {searchResults.map((r, i) => (
              <li key={i} className="text-[10px] text-slate-600 p-1 bg-slate-50 border border-slate-100 rounded">
                {r.item.speaker && <span className="text-amber-600">{r.item.speaker}: </span>}
                {r.item.rawText ?? r.item.title}
                <span className="text-slate-400 ml-1">({r.score.toFixed(2)})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {pending.map((signal) => (
          <div
            key={signal.id}
            className="rounded-lg border border-slate-200 bg-slate-50 p-2"
          >
            <p className="text-xs font-medium text-slate-800">{signal.title}</p>
            {signal.summary && (
              <p className="mt-1 text-[10px] text-slate-600 line-clamp-2">
                {signal.summary}
              </p>
            )}
            {signal.sourceName && (
              <p className="mt-1 text-[10px] text-slate-500">{signal.sourceName}</p>
            )}
            {(matchResults[signal.id]?.reasoning || signal.reasoningNote) && (
              <p className="mt-2 text-[10px] text-violet-700 bg-violet-50 rounded p-1 border border-violet-100">
                {matchResults[signal.id]?.reasoning ?? signal.reasoningNote}
              </p>
            )}
            <div className="mt-2 flex gap-1">
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
          </div>
        ))}
      </div>
    </aside>
  );
}
