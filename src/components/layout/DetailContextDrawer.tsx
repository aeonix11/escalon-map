"use client";

import { useEffect, useState } from "react";
import { useMapStore } from "@/store/mapStore";
import { formatTimestamp, TIMELINE_END_YEAR, TIMELINE_START_YEAR } from "@/lib/types";
import { inputClass } from "@/components/forms/formStyles";
import type { Fragment, Milestone, MilestoneSuggestion } from "@/lib/schema";

interface DetailContextDrawerProps {
  onRefresh: () => void;
}

function fragmentLabel(f: Fragment): string {
  const preview =
    f.rawText.length > 45 ? `${f.rawText.slice(0, 45)}…` : f.rawText;
  return `${formatTimestamp(f.timestampSeconds)} · ${f.speaker} — ${preview}`;
}

function loadFormFromMilestone(m: Milestone) {
  return {
    title: m.title,
    description: m.description ?? "",
    targetDate: m.targetDate,
    narrativeId: m.narrativeId ?? "",
    linkedFragmentId: m.linkedFragmentId ?? "",
    hemisphere: m.hemisphere,
    isFuzzy: m.isFuzzy,
    fuzzyRangeMonths: m.fuzzyRangeMonths,
    isPersonal: m.isPersonal ?? false,
    isSpeculative: m.isSpeculative ?? false,
  };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-2">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="border-t border-slate-100 my-5" />;
}

export default function DetailContextDrawer({ onRefresh }: DetailContextDrawerProps) {
  const {
    selectedMilestoneId,
    selectedSuggestionId,
    milestones,
    milestoneSuggestions,
    narratives,
    fragments,
    setDrawerMode,
    setSelectedMilestoneId,
    setSelectedSuggestionId,
    openVideoModal,
  } = useMapStore();

  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linkFragmentId, setLinkFragmentId] = useState("");
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [narrativeId, setNarrativeId] = useState("");
  const [linkedFragmentId, setLinkedFragmentId] = useState("");
  const [hemisphere, setHemisphere] = useState<"UPPER_PROPHETIC" | "LOWER_EARTHLY">(
    "UPPER_PROPHETIC"
  );
  const [isFuzzy, setIsFuzzy] = useState(false);
  const [fuzzyRangeMonths, setFuzzyRangeMonths] = useState(3);
  const [isPersonal, setIsPersonal] = useState(false);
  const [isSpeculative, setIsSpeculative] = useState(false);

  const milestone = milestones.find((m) => m.id === selectedMilestoneId);
  const suggestion = milestoneSuggestions.find(
    (s) => s.id === selectedSuggestionId
  );
  const narrative = milestone?.narrativeId
    ? narratives.find((n) => n.id === milestone.narrativeId)
    : null;
  const linkedFragment = milestone?.linkedFragmentId
    ? fragments.find((f) => f.id === milestone.linkedFragmentId)
    : null;

  const relatedFragments = fragments.filter(
    (f) =>
      milestone?.linkedFragmentId === f.id ||
      (linkedFragment && f.sourceUrl === linkedFragment.sourceUrl)
  );

  useEffect(() => {
    setEditing(false);
    setError(null);
    if (milestone) {
      const form = loadFormFromMilestone(milestone);
      setTitle(form.title);
      setDescription(form.description);
      setTargetDate(form.targetDate);
      setNarrativeId(form.narrativeId);
      setLinkedFragmentId(form.linkedFragmentId);
      setHemisphere(form.hemisphere);
      setIsFuzzy(form.isFuzzy);
      setFuzzyRangeMonths(form.fuzzyRangeMonths);
      setIsPersonal(form.isPersonal);
      setIsSpeculative(form.isSpeculative);
    }
  }, [milestone?.id]);

  const handleDeleteMilestone = async () => {
    if (!milestone) return;
    if (!window.confirm(`Delete milestone "${milestone.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "milestone", id: milestone.id }),
      });
      setSelectedMilestoneId(null);
      setDrawerMode(null);
      onRefresh();
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestone) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "milestone",
          id: milestone.id,
          data: {
            title, description, targetDate,
            narrativeId: narrativeId || null,
            linkedFragmentId: linkedFragmentId || null,
            hemisphere, isFuzzy, fuzzyRangeMonths, isPersonal, isSpeculative,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleLinkFragment = async (fragmentId: string | null) => {
    if (!milestone) return;
    setLinking(true);
    try {
      await fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "milestone", id: milestone.id, data: { linkedFragmentId: fragmentId } }),
      });
      setLinkFragmentId("");
      onRefresh();
    } finally {
      setLinking(false);
    }
  };

  const handleAcceptSuggestion = async (item: MilestoneSuggestion) => {
    setSaving(true);
    try {
      const res = await fetch("/api/milestone-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [item.id] }),
      });
      if (!res.ok) return;
      setSelectedSuggestionId(null);
      setDrawerMode(null);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDismissSuggestion = async (item: MilestoneSuggestion) => {
    if (!window.confirm(`Dismiss AI suggestion "${item.title}"?`)) return;
    setDeleting(true);
    try {
      await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "milestone_suggestion", id: item.id }),
      });
      setSelectedSuggestionId(null);
      setDrawerMode(null);
      onRefresh();
    } finally {
      setDeleting(false);
    }
  };

  const widthClass = expanded ? "w-[540px]" : "w-[360px]";

  // ── AI Suggestion panel ────────────────────────────────────────────────────
  if (suggestion) {
    const suggNarrative = suggestion.narrativeId
      ? narratives.find((n) => n.id === suggestion.narrativeId)
      : null;

    return (
      <aside className={`${widthClass} transition-all duration-200 border-l border-slate-200 bg-white flex flex-col shadow-sm overflow-y-auto`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-violet-800">AI Suggestion</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setExpanded((e) => !e)}
              title={expanded ? "Collapse panel" : "Expand panel"}
              className="text-slate-400 hover:text-slate-600"
            >
              {expanded ? "⟩" : "⟨"}
            </button>
            <button
              onClick={() => { setSelectedSuggestionId(null); setDrawerMode(null); }}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <span className="inline-block rounded bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-800">
            AI suggested
          </span>

          <div>
            <p className="text-xs text-slate-500">{suggestion.targetDate}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {suggestion.hemisphere === "UPPER_PROPHETIC" ? "Prophetic" : "Earthly"}
              {suggNarrative ? ` · ${suggNarrative.title}` : ""}
            </p>
            <h3 className="mt-1 text-lg font-semibold leading-snug text-slate-900">{suggestion.title}</h3>
          </div>

          {suggestion.description && (
            <p className="text-sm leading-relaxed text-slate-700">{suggestion.description}</p>
          )}

          {suggestion.reasoning && (
            <>
              <Divider />
              <div>
                <SectionLabel>AI reasoning</SectionLabel>
                <p className="text-xs leading-relaxed text-violet-900 rounded border border-violet-100 bg-violet-50 p-3">
                  {suggestion.reasoning}
                </p>
              </div>
            </>
          )}

          <Divider />
          <div className="flex flex-col gap-2">
            <button
              onClick={() => void handleAcceptSuggestion(suggestion)}
              disabled={saving}
              className="rounded bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? "Adding…" : "Add to timeline"}
            </button>
            <button
              onClick={() => void handleDismissSuggestion(suggestion)}
              disabled={deleting}
              className="rounded border border-slate-200 py-2 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Dismiss suggestion
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!milestone) {
    return (
      <aside className={`${widthClass} transition-all duration-200 border-l border-slate-200 bg-white p-5 shadow-sm`}>
        <button onClick={() => setDrawerMode(null)} className="text-xs text-slate-500 hover:text-slate-700">
          Close
        </button>
        <p className="mt-4 text-sm text-slate-500">Select a milestone to view details.</p>
      </aside>
    );
  }

  // ── Milestone detail / edit ────────────────────────────────────────────────
  return (
    <aside className={`${widthClass} transition-all duration-200 border-l border-slate-200 bg-white flex flex-col shadow-sm overflow-y-auto`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 shrink-0">
        <h2 className="text-sm font-semibold text-slate-700">
          {editing ? "Edit Milestone" : "Milestone"}
        </h2>
        <div className="flex items-center gap-3">
          {!editing && (
            <button
              onClick={() => { setError(null); setEditing(true); }}
              className="text-xs text-sky-600 hover:text-sky-700"
            >
              Edit
            </button>
          )}
          {!editing && (
            <button
              onClick={handleDeleteMilestone}
              disabled={deleting}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            title={expanded ? "Collapse panel" : "Expand panel"}
            className="text-slate-400 hover:text-slate-600 text-base leading-none"
          >
            {expanded ? "⟩" : "⟨"}
          </button>
          <button
            onClick={() => setDrawerMode(null)}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editing ? (
        <form onSubmit={handleSave} className="p-5 space-y-3 overflow-y-auto">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-400">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={inputClass} required />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-400">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className={`${inputClass} h-24`} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-400">Date</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} min={`${TIMELINE_START_YEAR}-01-01`} max={`${TIMELINE_END_YEAR}-12-31`} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-400">Narrative</label>
            <select value={narrativeId} onChange={(e) => setNarrativeId(e.target.value)} className={inputClass}>
              <option value="">No narrative</option>
              {narratives.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-400">Video source</label>
            <select value={linkedFragmentId} onChange={(e) => setLinkedFragmentId(e.target.value)} className={inputClass}>
              <option value="">No video source</option>
              {fragments.map((f) => <option key={f.id} value={f.id}>{fragmentLabel(f)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-slate-400">Hemisphere</label>
            <select value={hemisphere} onChange={(e) => setHemisphere(e.target.value as "UPPER_PROPHETIC" | "LOWER_EARTHLY")} className={inputClass}>
              <option value="UPPER_PROPHETIC">Upper — Prophetic</option>
              <option value="LOWER_EARTHLY">Lower — Earthly</option>
            </select>
          </div>
          <div className="rounded border border-slate-100 bg-slate-50 p-3 space-y-2">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={isSpeculative} onChange={(e) => setIsSpeculative(e.target.checked)} />
              Speculative — anticipated placeholder, not firm
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={isPersonal} onChange={(e) => setIsPersonal(e.target.checked)} />
              Personal — omit from Export
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={isFuzzy} onChange={(e) => setIsFuzzy(e.target.checked)} />
              Fuzzy window (forward from date)
            </label>
            {isFuzzy && (
              <input type="number" min={1} max={120} value={fuzzyRangeMonths} onChange={(e) => setFuzzyRangeMonths(Number(e.target.value))} className={`${inputClass} w-28`} />
            )}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="flex-1 rounded bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-400 disabled:opacity-50">
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
                const form = loadFormFromMilestone(milestone);
                setTitle(form.title); setDescription(form.description); setTargetDate(form.targetDate);
                setNarrativeId(form.narrativeId); setLinkedFragmentId(form.linkedFragmentId);
                setHemisphere(form.hemisphere); setIsFuzzy(form.isFuzzy);
                setFuzzyRangeMonths(form.fuzzyRangeMonths); setIsPersonal(form.isPersonal);
                setIsSpeculative(form.isSpeculative);
              }}
              className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        /* ── View mode ── */
        <div className="p-5 overflow-y-auto">

          {/* Main info */}
          <div
            className="rounded-lg border p-4"
            style={{
              borderColor: narrative?.colorHex ?? "#e2e8f0",
              backgroundColor: (narrative?.colorHex ?? "#94a3b8") + "0f",
            }}
          >
            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="text-xs font-mono text-slate-600">{milestone.targetDate}</span>
              {milestone.isFuzzy && (
                <span className="rounded bg-slate-100 px-1.5 py-px text-[10px] text-slate-500">
                  +{milestone.fuzzyRangeMonths}mo window
                </span>
              )}
              <span className="rounded bg-slate-100 px-1.5 py-px text-[10px] text-slate-500">
                {milestone.hemisphere === "UPPER_PROPHETIC" ? "Prophetic" : "Earthly"}
              </span>
              {milestone.isSpeculative && (
                <span className="rounded border border-dashed border-amber-400 bg-amber-50 px-1.5 py-px text-[10px] text-amber-800">
                  Speculative
                </span>
              )}
              {milestone.isPersonal && (
                <span className="rounded bg-violet-100 px-1.5 py-px text-[10px] text-violet-700">
                  Personal
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className={`text-lg font-semibold leading-snug text-slate-900 ${milestone.isSpeculative ? "italic" : ""}`}>
              {milestone.title}
            </h3>

            {/* Description */}
            {milestone.description && (
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {milestone.description}
              </p>
            )}

            {/* Narrative */}
            {narrative && (
              <div className="mt-3 flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: narrative.colorHex }}
                />
                <span className="text-xs text-slate-600">{narrative.title}</span>
              </div>
            )}
          </div>

          <Divider />

          {/* Video source */}
          <div>
            <SectionLabel>Video source</SectionLabel>

            {linkedFragment ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-3">
                <p className="text-xs font-medium text-amber-800">
                  {formatTimestamp(linkedFragment.timestampSeconds)} · {linkedFragment.speaker}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 line-clamp-3">
                  {linkedFragment.rawText}
                </p>
                <button
                  onClick={() => openVideoModal(
                    linkedFragment.sourceUrl,
                    relatedFragments.length > 0 ? relatedFragments : [linkedFragment]
                  )}
                  className="mt-2 text-xs font-medium text-sky-600 hover:underline"
                >
                  ▶ Play at {formatTimestamp(linkedFragment.timestampSeconds)}
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-3">No video linked yet.</p>
            )}

            {fragments.length > 0 && (
              <div className="space-y-2">
                <select
                  value={linkFragmentId}
                  onChange={(e) => setLinkFragmentId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Choose a fragment to link…</option>
                  {fragments.map((f) => (
                    <option key={f.id} value={f.id}>{fragmentLabel(f)}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => linkFragmentId && handleLinkFragment(linkFragmentId)}
                    disabled={!linkFragmentId || linking}
                    className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                  >
                    {linking ? "Linking…" : linkedFragment ? "Change link" : "Link source"}
                  </button>
                  {linkedFragment && (
                    <button
                      onClick={() => handleLinkFragment(null)}
                      disabled={linking}
                      className="rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            )}

            {fragments.length === 0 && (
              <p className="text-xs text-slate-400">Add a video fragment via Add Data first.</p>
            )}
          </div>

          {/* Related clips */}
          {relatedFragments.length > 1 && (
            <>
              <Divider />
              <div>
                <SectionLabel>Other clips from same video</SectionLabel>
                <ul className="space-y-2">
                  {relatedFragments
                    .filter((f) => f.id !== linkedFragment?.id)
                    .map((f) => (
                      <li key={f.id}>
                        <button
                          onClick={() => openVideoModal(f.sourceUrl, relatedFragments.filter((rf) => rf.sourceUrl === f.sourceUrl))}
                          className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-amber-600">{formatTimestamp(f.timestampSeconds)}</span>
                            <span className="text-xs text-slate-500">{f.speaker}</span>
                          </div>
                          <p className="text-xs leading-relaxed text-slate-600 line-clamp-2">{f.rawText}</p>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            </>
          )}

        </div>
      )}
    </aside>
  );
}
