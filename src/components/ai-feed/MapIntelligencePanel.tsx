"use client";

import { useEffect, useMemo, useState } from "react";
import { useMapChat } from "@/hooks/useMapChat";
import { useMapDeepAnalysis } from "@/hooks/useMapDeepAnalysis";
import { useDeepAnalysisHistory } from "@/hooks/useDeepAnalysisHistory";
import { useMapStore } from "@/store/mapStore";
import { inputClass } from "@/components/forms/formStyles";
import type { DeepAnalysisMode, DeepModelChoice } from "@/lib/anthropic";
import {
  defaultMaxSearches,
  estimateContextTokens,
  formatRunLabel,
  formatTokenEstimate,
  getCostHint,
  HealthPanel,
  ParsedSuggestionCard,
  StoredSuggestionCard,
} from "@/components/ai-feed/deepAnalysisUi";

interface MapIntelligencePanelProps {
  onRefresh?: () => void | Promise<void>;
  readOnly?: boolean;
}

const SEARCH_PRESETS = [3, 5, 8, 12] as const;

export default function MapIntelligencePanel({
  onRefresh,
  readOnly = false,
}: MapIntelligencePanelProps) {
  const {
    setDrawerMode,
    milestoneSuggestions,
    milestones,
    narratives,
    fragments,
    notes,
  } = useMapStore();
  const { messages, loading, contextMode, sendMessage, clearChat } = useMapChat();
  const deep = useMapDeepAnalysis();
  const history = useDeepAnalysisHistory();
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<"deep" | "chat">("deep");
  const [deepView, setDeepView] = useState<"current" | "history">("current");
  const [analysisMode, setAnalysisMode] = useState<DeepAnalysisMode>("quick");
  const [model, setModel] = useState<DeepModelChoice>("sonnet-4-6");
  const [maxSearches, setMaxSearches] = useState(5);
  const [scopeNarrativeId, setScopeNarrativeId] = useState<string>("");

  useEffect(() => {
    if (analysisMode === "deep") {
      setMaxSearches(defaultMaxSearches(model));
    }
  }, [model, analysisMode]);

  const panelSuggestions =
    milestoneSuggestions.length > 0 ? milestoneSuggestions : deep.suggestions;
  const usingStoredSuggestions = milestoneSuggestions.length > 0;

  const tokenEstimate = useMemo(
    () =>
      estimateContextTokens(
        narratives,
        milestones,
        fragments,
        notes,
        scopeNarrativeId || null,
        new Set(fragments.map((f) => f.id))
      ),
    [narratives, milestones, fragments, notes, scopeNarrativeId]
  );

  const scopeTitle = scopeNarrativeId
    ? narratives.find((n) => n.id === scopeNarrativeId)?.title ?? null
    : null;

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
    await deep.runDeepAnalysis(
      {
        mode: analysisMode,
        model,
        maxSearches: analysisMode === "deep" ? maxSearches : 0,
        narrativeId: scopeNarrativeId || null,
      },
      async () => {
        await onRefresh?.();
        if (deepView === "history") {
          await history.loadHistory();
        }
      }
    );
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

  const healthIssues =
    deep.health.length > 0
      ? deep.health
      : history.selectedRun?.health ?? [];

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
              <div className="border-b border-slate-200 p-3 space-y-3">
                <div className="flex gap-1">
                  <button
                    onClick={() => setAnalysisMode("quick")}
                    className={`flex-1 rounded px-2 py-1 text-[10px] ${
                      analysisMode === "quick"
                        ? "bg-violet-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Quick
                  </button>
                  <button
                    onClick={() => setAnalysisMode("deep")}
                    className={`flex-1 rounded px-2 py-1 text-[10px] ${
                      analysisMode === "deep"
                        ? "bg-violet-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Deep research
                  </button>
                </div>

                {analysisMode === "quick" ? (
                  <p className="text-[10px] text-slate-600">
                    Fast analysis of your map data. No web search.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-600">
                      Web search, extended thinking, map health audit, and
                      confirmation linking.
                    </p>
                    <div>
                      <label className="text-[10px] font-medium text-slate-600">
                        Model
                      </label>
                      <select
                        value={model}
                        onChange={(e) =>
                          setModel(e.target.value as DeepModelChoice)
                        }
                        className={`${inputClass} mt-0.5`}
                      >
                        <option value="sonnet-4-6">Sonnet 4.6 (cheapest)</option>
                        <option value="sonnet-5">Sonnet 5 (balanced)</option>
                        <option value="fable-5">Fable 5 (go all out)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-600">
                        Max web searches
                      </label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {SEARCH_PRESETS.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setMaxSearches(n)}
                            className={`rounded px-2 py-0.5 text-[10px] ${
                              maxSearches === n
                                ? "bg-violet-200 text-violet-900"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-medium text-slate-600">
                    Scope
                  </label>
                  <select
                    value={scopeNarrativeId}
                    onChange={(e) => setScopeNarrativeId(e.target.value)}
                    className={`${inputClass} mt-0.5`}
                  >
                    <option value="">All narratives</option>
                    {narratives.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title}
                      </option>
                    ))}
                  </select>
                  {scopeNarrativeId && (
                    <p className="mt-1 text-[10px] text-slate-400">
                      Notes are always included (not narrative-linked).
                    </p>
                  )}
                </div>

                <p className="text-[10px] text-slate-500">
                  Map context: {formatTokenEstimate(tokenEstimate)} ·{" "}
                  {getCostHint(analysisMode, model, maxSearches)}
                </p>

                <button
                  onClick={() => void handleRunAnalysis()}
                  disabled={deep.running || readOnly}
                  className="w-full rounded bg-violet-600 py-2 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {deep.running
                    ? analysisMode === "deep"
                      ? "Running deep research…"
                      : "Running analysis…"
                    : analysisMode === "deep"
                      ? "Run deep research"
                      : "Run quick analysis"}
                </button>
                {readOnly && (
                  <p className="text-[10px] text-amber-800">
                    Switch to My Map in Settings to run analysis on your own
                    timeline.
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
                    Run analysis to get a research report, map health audit (deep
                    mode), and timeline suggestions.
                  </p>
                )}

                {!deep.running && deep.health.length > 0 && (
                  <HealthPanel issues={deep.health} />
                )}

                {panelSuggestions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-800">
                        Suggested milestones ({panelSuggestions.length})
                      </h3>
                      {usingStoredSuggestions && (
                        <button
                          onClick={() =>
                            deep.selectAllSuggestions(milestoneSuggestions)
                          }
                          className="text-[10px] text-sky-600 hover:underline"
                        >
                          Select all
                        </button>
                      )}
                    </div>
                    {usingStoredSuggestions
                      ? milestoneSuggestions.map((s) => (
                          <StoredSuggestionCard
                            key={s.id}
                            suggestion={s}
                            milestones={milestones}
                            checked={deep.selected.has(s.id)}
                            onToggle={() => deep.toggleSuggestion(s.id)}
                            readOnly={readOnly}
                          />
                        ))
                      : deep.suggestions.map((s, i) => (
                          <ParsedSuggestionCard
                            key={`${s.title}-${i}`}
                            suggestion={s}
                            milestones={milestones}
                          />
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
                  No saved runs yet. Run analysis to save your first report.
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
                        <p className="mt-0.5 text-[10px] text-violet-700">
                          {formatRunLabel(
                            run.mode,
                            run.model,
                            run.scopeNarrativeId
                              ? narratives.find(
                                  (n) => n.id === run.scopeNarrativeId
                                )?.title ?? "Scoped"
                              : null
                          )}
                        </p>
                        <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                          {run.preview}
                          {run.preview.length >= 200 ? "…" : ""}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {run.suggestionCount} suggestion
                          {run.suggestionCount === 1 ? "" : "s"}
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
                    {formatRunDate(history.selectedRun.createdAt)} ·{" "}
                    {formatRunLabel(
                      history.selectedRun.mode,
                      history.selectedRun.model,
                      history.selectedRun.scopeNarrativeId
                        ? narratives.find(
                            (n) => n.id === history.selectedRun!.scopeNarrativeId
                          )?.title ?? "Scoped"
                        : null
                    )}
                  </p>
                  {history.loadingDetail ? (
                    <p className="text-xs text-slate-500">Loading…</p>
                  ) : (
                    <>
                      <div className="rounded border border-violet-100 bg-violet-50 p-3 text-xs text-violet-900 whitespace-pre-wrap">
                        {history.selectedRun.analysisText}
                      </div>
                      {healthIssues.length > 0 && (
                        <HealthPanel issues={healthIssues} />
                      )}
                      {history.selectedRun.suggestions.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-semibold text-slate-800">
                            Suggestions from this run (
                            {history.selectedRun.suggestions.length})
                          </h3>
                          {history.selectedRun.suggestions.map((s, i) => (
                            <ParsedSuggestionCard
                              key={`${s.title}-${i}`}
                              suggestion={s}
                              milestones={milestones}
                            />
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
