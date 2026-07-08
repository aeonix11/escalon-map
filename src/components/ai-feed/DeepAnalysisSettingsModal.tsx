"use client";

import { useEffect, useState } from "react";
import type { DeepAnalysisMode } from "@/lib/anthropic";
import { inputClass } from "@/components/forms/formStyles";

interface PromptModeData {
  custom: string;
  effective: string;
  default: string;
  usingDefault: boolean;
}

interface PromptSettingsResponse {
  quick: PromptModeData;
  deep: PromptModeData;
  placeholderHint: string;
}

interface DeepAnalysisSettingsModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: DeepAnalysisMode;
}

export default function DeepAnalysisSettingsModal({
  open,
  onClose,
  initialMode = "deep",
}: DeepAnalysisSettingsModalProps) {
  const [tab, setTab] = useState<DeepAnalysisMode>(initialMode);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [data, setData] = useState<PromptSettingsResponse | null>(null);
  const [quickDraft, setQuickDraft] = useState("");
  const [deepDraft, setDeepDraft] = useState("");

  useEffect(() => {
    if (open) setTab(initialMode);
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setMessage(null);
    void fetch("/api/deep-analysis-prompts")
      .then((r) => r.json())
      .then((json: PromptSettingsResponse) => {
        setData(json);
        setQuickDraft(json.quick.custom || json.quick.default);
        setDeepDraft(json.deep.custom || json.deep.default);
      })
      .catch(() => setMessage("Could not load prompt settings."))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const currentDraft = tab === "deep" ? deepDraft : quickDraft;
  const setCurrentDraft = tab === "deep" ? setDeepDraft : setQuickDraft;
  const modeData = tab === "deep" ? data?.deep : data?.quick;
  const isDefault =
    tab === "deep"
      ? data?.deep.usingDefault && deepDraft === data?.deep.default
      : data?.quick.usingDefault && quickDraft === data?.quick.default;

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setMessage(null);
    try {
      const quickToSave =
        quickDraft.trim() === data.quick.default.trim() ? "" : quickDraft;
      const deepToSave =
        deepDraft.trim() === data.deep.default.trim() ? "" : deepDraft;
      const res = await fetch("/api/deep-analysis-prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quickPrompt: quickToSave,
          deepPrompt: deepToSave,
        }),
      });
      if (!res.ok) {
        setMessage("Could not save prompts.");
        return;
      }
      const json = (await res.json()) as PromptSettingsResponse;
      setData(json);
      setMessage("Prompt settings saved.");
    } catch {
      setMessage("Could not save prompts.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!data) return;
    if (tab === "deep") {
      setDeepDraft(data.deep.default);
    } else {
      setQuickDraft(data.quick.default);
    }
  };

  const handleUseBuiltInDefault = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/deep-analysis-prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tab === "deep" ? { resetDeep: true } : { resetQuick: true }),
      });
      if (!res.ok) {
        setMessage("Could not reset prompt.");
        return;
      }
      const json = (await res.json()) as PromptSettingsResponse;
      setData(json);
      if (tab === "deep") {
        setDeepDraft(json.deep.default);
      } else {
        setQuickDraft(json.quick.default);
      }
      setMessage("Reverted to built-in default prompt.");
    } catch {
      setMessage("Could not reset prompt.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-labelledby="deep-analysis-settings-title"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="deep-analysis-settings-title" className="text-base font-semibold text-slate-900">
              Deep analysis prompts
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Customize what the AI looks for during analysis and web search.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-5 py-2">
          <button
            type="button"
            onClick={() => setTab("quick")}
            className={`rounded px-3 py-1 text-xs ${
              tab === "quick"
                ? "bg-violet-100 text-violet-800"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Quick analysis
          </button>
          <button
            type="button"
            onClick={() => setTab("deep")}
            className={`rounded px-3 py-1 text-xs ${
              tab === "deep"
                ? "bg-violet-100 text-violet-800"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Deep research
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <p className="text-sm text-slate-500">Loading prompts…</p>
          ) : (
            <>
              <p className="text-xs text-slate-600">{data?.placeholderHint}</p>
              {modeData && !modeData.usingDefault && (
                <p className="text-xs text-amber-700 rounded border border-amber-200 bg-amber-50 px-2 py-1">
                  Using a custom prompt for {tab === "deep" ? "deep research" : "quick analysis"}.
                </p>
              )}
              <textarea
                value={currentDraft}
                onChange={(e) => setCurrentDraft(e.target.value)}
                className={`${inputClass} min-h-[420px] font-mono text-xs leading-relaxed`}
                spellCheck={false}
              />
              <p className="text-[10px] text-slate-400">
                Saved to{" "}
                <code className="rounded bg-slate-100 px-1">data/settings.json</code>. Changes
                apply to the next analysis run.
              </p>
            </>
          )}
          {message && (
            <p
              className={`text-xs ${
                message.includes("Could not") ? "text-red-600" : "text-emerald-700"
              }`}
            >
              {message}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={loading || saving}
              className="rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Reset editor to default text
            </button>
            <button
              type="button"
              onClick={() => void handleUseBuiltInDefault()}
              disabled={loading || saving || isDefault}
              className="rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Use built-in default
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-200 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={loading || saving}
              className="rounded bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save prompts"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
