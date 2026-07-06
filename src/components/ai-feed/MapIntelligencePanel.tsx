"use client";

import { useEffect, useState } from "react";
import { useMapChat } from "@/hooks/useMapChat";
import { useMapDeepAnalysis } from "@/hooks/useMapDeepAnalysis";
import { useDeepAnalysisHistory } from "@/hooks/useDeepAnalysisHistory";
import { useMapStore } from "@/store/mapStore";
import { inputClass } from "@/components/forms/formStyles";

interface MapIntelligencePanelProps {
  onRefresh?: () => void | Promise<void>;
  readOnly?: boolean;
}

export default function MapIntelligencePanel({
  onRefresh,
  readOnly = false,
}: MapIntelligencePanelProps) {
  const { setDrawerMode, milestoneSuggestions } = useMapStore();
  const { messages, loading, contextMode, sendMessage, clearChat } = useMapChat();
  const deep = useMapDeepAnalysis();
  const history = useDeepAnalysisHistory();
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<"deep" | "chat">("deep");
  const [deepView, setDeepView] = useState<"current" | "history">("current");

  const panelSuggestions =
    milestoneSuggestions.length > 0 ? milestoneSuggestions : deep.suggestions;
  const usingStoredSuggestions = milestoneSuggestions.length > 0;

  useEffect(() => {
    if (milestoneSuggestions.length > 0) {
      deep.syncSelectionFromStore(milestoneSuggestions);
    }
  }, [milestoneSuggestions, deep.syncSelectionFromStore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const q = input;
    setInput("");
    setTab("chat");
    await sendMessage(q);
  };

  const handleApplySuggestions = async () => {
    const ok = await deep.applySelected(milestoneSuggestions, () => {
      onRefresh?.();
      deep.clearResults();
    });
    if (!ok && deep.selected.size > 0) {
      window.alert("Could not add suggestions. Check your API key and map permissions.");
    }
  };

  const handleRunAnalysis = async () => {
    await deep.runDeepAnalysis(async () => {
      await onRefresh?.();
      if (deepView === "history") {
        await history.loadHistory();
      }
    });
  };

  const openHistory = () => {
    setDeepView("history");
    history.clearSelected();
    void history.loadHistory();
  };

  const formatRunDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const chatSuggestions = [
    "What year do the most milestones converge?",
    "Summarize the 2027–2030 window across both hemispheres",
    "Which narratives have the strongest real-world signal coverage?",
    "Are there patterns or gaps in my map?",
  ];

  return (
    <aside className="w-[28rem] border-l border-slate-200 bg-white flex flex-col shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 p-3">
        <div>
          <h2 className="text-sm font-semibold text-violet-700">Map Intelligence</h2>
          {tab === "chat" && contextMode && (
            <p className="text-[10px] text-slate-500">
              Context: {contextMode === "full" ? "Full map" : "Retrieved slice"}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              clearChat();
              deep.clearResults();
            }}
            className="text-[10px] text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
          <button
            onClick={() => setDrawerMode(null)}
            className="text-[10px] text-slate-500 hover:text-slate-700"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 px-3 py-2">
        <button
          onClick={() => setTab("deep")}
          className={`rounded px-2 py-1 text-[10px] ${
            tab === "deep"
              ? "bg-violet-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Deep analysis
        </button>
        <button
          onClick={() => setTab("chat")}
          className={`rounded px-2 py-1 text-[10px] ${
            tab === "chat"
              ? "bg-violet-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Chat
        </button>
      </div>

      {tab === "deep" ? (
        <>
          <div className="flex gap-1 border-b border-slate-100 px-3 py-1.5">
            <button
              onClick={() => setDeepView("current")}
              className={`rounded px-2 py-0.5 text-[10px] ${
                deepView === "current"
                  ? "bg-violet-100 text-violet-800"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              Current run
            </button>
            <button
              onClick={openHistory}
              className={`rounded px-2 py-0.5 text-[10px] ${
                deepView === "history"
                  ? "bg-violet-100 text-violet-800"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              History
            </button>
          </div>

          {deepView === "current" ? (
            <>
          <div className="border-b border-slate-200 p-3 space-y-2">
            <p className="text-[10px] text-slate-600">
              Research your full map and auto-place AI-suggested milestone boxes on
              the timeline. Requires an Anthropic API key in Settings.
            </p>
            <button
              onClick={() => void handleRunAnalysis()}
              disabled={deep.running || readOnly}
              className="w-full rounded bg-violet-600 py-2 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {deep.running ? "Running deep analysis…" : "Run deep analysis"}
            </button>
            {readOnly && (
              <p className="text-[10px] text-amber-800">
                Switch to My Map in Settings to run deep analysis on your own timeline.
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {deep.running && deep.rawOutput && (
              <pre className="whitespace-pre-wrap rounded border border-violet-100 bg-violet-50 p-2 text-xs text-violet-900">
                {deep.rawOutput}
              </pre>
            )}
            {!deep.running && deep.analysis && (
              <div className="rounded border border-violet-100 bg-violet-50 p-3 text-xs text-violet-900 whitespace-pre-wrap">
                {deep.analysis}
              </div>
            )}
            {!deep.running && !deep.analysis && (
              <p className="text-xs text-slate-500">
                Click Run deep analysis to get a full research report and timeline
                suggestions based on your narratives, milestones, and fragments.
              </p>
            )}

            {panelSuggestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-800">
                    Suggested milestones ({panelSuggestions.length})
                  </h3>
                  {usingStoredSuggestions && (
                    <button
                      onClick={() => deep.selectAllSuggestions(milestoneSuggestions)}
                      className="text-[10px] text-sky-600 hover:underline"
                    >
                      Select all
                    </button>
                  )}
                  {!usingStoredSuggestions && deep.suggestions.length > 0 && (
                    <button
                      onClick={() =>
                        deep.selectAllSuggestions(
                          deep.suggestions.map((s, i) => ({
                            id: String(i),
                            narrativeId: s.narrativeId,
                            title: s.title,
                            description: s.description,
                            targetDate: s.targetDate,
                            isFuzzy: s.isFuzzy,
                            fuzzyRangeMonths: s.fuzzyRangeMonths,
                            hemisphere: s.hemisphere,
                            reasoning: s.reasoning,
                            createdAt: "",
                          }))
                        )
                      }
                      className="text-[10px] text-sky-600 hover:underline"
                    >
                      Select all
                    </button>
                  )}
                </div>
                {usingStoredSuggestions
                  ? milestoneSuggestions.map((s) => (
                      <label
                        key={s.id}
                        className="flex gap-2 rounded border border-violet-200 bg-violet-50/50 p-2 text-xs cursor-pointer hover:bg-violet-50"
                      >
                        <input
                          type="checkbox"
                          checked={deep.selected.has(s.id)}
                          onChange={() => deep.toggleSuggestion(s.id)}
                          disabled={readOnly}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="font-medium text-slate-900">{s.title}</span>
                          <span className="ml-1 text-slate-500">· {s.targetDate}</span>
                          <span className="ml-1 text-[10px] text-slate-400">
                            {s.hemisphere === "UPPER_PROPHETIC" ? "Prophetic" : "Earthly"}
                          </span>
                          {s.description && (
                            <p className="mt-1 text-slate-600">{s.description}</p>
                          )}
                          {s.reasoning && (
                            <p className="mt-1 text-[10px] text-violet-700">{s.reasoning}</p>
                          )}
                        </span>
                      </label>
                    ))
                  : deep.suggestions.map((s, i) => (
                      <div
                        key={`${s.title}-${i}`}
                        className="rounded border border-violet-200 bg-violet-50/50 p-2 text-xs"
                      >
                        <span className="font-medium text-slate-900">{s.title}</span>
                        <span className="ml-1 text-slate-500">· {s.targetDate}</span>
                        {s.description && (
                          <p className="mt-1 text-slate-600">{s.description}</p>
                        )}
                      </div>
                    ))}
                {usingStoredSuggestions && !readOnly ? (
                  <button
                    onClick={() => void handleApplySuggestions()}
                    disabled={deep.applying || deep.selected.size === 0}
                    className="w-full rounded bg-emerald-600 py-2 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {deep.applying
                      ? "Confirming…"
                      : `Confirm ${deep.selected.size} selected on timeline`}
                  </button>
                ) : usingStoredSuggestions ? (
                  <p className="text-[10px] text-amber-800">
                    Switch to My Map in Settings to confirm suggestions.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500">
                    Suggestions appear on the timeline when analysis finishes.
                  </p>
                )}
              </div>
            )}
          </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {history.loading && (
                <p className="text-xs text-slate-500">Loading history…</p>
              )}
              {!history.loading && history.runs.length === 0 && (
                <p className="text-xs text-slate-500">
                  No saved runs yet. Run deep analysis to save your first report.
                </p>
              )}
              {!history.selectedRun ? (
                <ul className="space-y-2">
                  {history.runs.map((run) => (
                    <li key={run.id}>
                      <button
                        onClick={() => void history.loadRun(run.id)}
                        className="w-full rounded border border-slate-200 bg-slate-50 p-2 text-left hover:bg-violet-50"
                      >
                        <p className="text-[10px] font-medium text-slate-700">
                          {formatRunDate(run.createdAt)}
                        </p>
                        <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                          {run.preview}
                          {run.preview.length >= 200 ? "…" : ""}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {run.suggestionCount} suggestion
                          {run.suggestionCount === 1 ? "" : "s"}
                          {run.model ? ` · ${run.model}` : ""}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={history.clearSelected}
                      className="text-[10px] text-sky-600 hover:underline"
                    >
                      ← Back to list
                    </button>
                    {!readOnly && (
                      <button
                        onClick={async () => {
                          if (
                            !window.confirm("Delete this saved analysis run?")
                          ) {
                            return;
                          }
                          await history.deleteRun(history.selectedRun!.id);
                        }}
                        className="text-[10px] text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {formatRunDate(history.selectedRun.createdAt)}
                    {history.selectedRun.model
                      ? ` · ${history.selectedRun.model}`
                      : ""}
                  </p>
                  {history.loadingDetail ? (
                    <p className="text-xs text-slate-500">Loading…</p>
                  ) : (
                    <>
                      <div className="rounded border border-violet-100 bg-violet-50 p-3 text-xs text-violet-900 whitespace-pre-wrap">
                        {history.selectedRun.analysisText}
                      </div>
                      {history.selectedRun.suggestions.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-semibold text-slate-800">
                            Suggestions from this run (
                            {history.selectedRun.suggestions.length})
                          </h3>
                          {history.selectedRun.suggestions.map((s, i) => (
                            <div
                              key={`${s.title}-${i}`}
                              className="rounded border border-violet-200 bg-violet-50/50 p-2 text-xs"
                            >
                              <span className="font-medium text-slate-900">
                                {s.title}
                              </span>
                              <span className="ml-1 text-slate-500">
                                · {s.targetDate}
                              </span>
                              {s.description && (
                                <p className="mt-1 text-slate-600">
                                  {s.description}
                                </p>
                              )}
                              {s.reasoning && (
                                <p className="mt-1 text-[10px] text-violet-700">
                                  {s.reasoning}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Ask about your timeline:</p>
                {chatSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg p-2 text-xs ${
                  m.role === "user"
                    ? "bg-sky-50 text-slate-800 ml-4 border border-sky-100"
                    : "bg-violet-50 text-slate-700 mr-4 border border-violet-100"
                }`}
              >
                <span className="text-[10px] text-slate-500 block mb-1">
                  {m.role === "user" ? "You" : "Claude"}
                </span>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
            {loading && (
              <p className="text-xs text-slate-500 animate-pulse">Thinking...</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your prophecy map..."
              className={`${inputClass} h-20 resize-none`}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="mt-2 w-full rounded bg-violet-600 py-2 text-xs text-white hover:bg-violet-500 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </>
      )}
    </aside>
  );
}
