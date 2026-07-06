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
    f.rawText.length > 35 ? `${f.rawText.slice(0, 35)}…` : f.rawText;
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
  };
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
    }
  }, [milestone?.id]);

  const handleDeleteMilestone = async () => {
    if (!milestone) return;
    if (
      !window.confirm(
        `Delete milestone "${milestone.title}"? This cannot be undone.`
      )
    ) {
      return;
    }
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
            title,
            description,
            targetDate,
            narrativeId: narrativeId || null,
            linkedFragmentId: linkedFragmentId || null,
            hemisphere,
            isFuzzy,
            fuzzyRangeMonths,
            isPersonal,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
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
        body: JSON.stringify({
          type: "milestone",
          id: milestone.id,
          data: { linkedFragmentId: fragmentId },
        }),
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

  if (suggestion) {
    const narrative = suggestion.narrativeId
      ? narratives.find((n) => n.id === suggestion.narrativeId)
      : null;

    return (
      <aside className="w-80 border-l border-slate-200 bg-white p-4 shadow-sm overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-violet-800">AI Suggestion</h2>
          <button
            onClick={() => {
              setSelectedSuggestionId(null);
              setDrawerMode(null);
            }}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Close
          </button>
        </div>
        <span className="mt-2 inline-block rounded bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-800">
          Suggested milestone
        </span>
        <h3 className="mt-3 text-base font-semibold text-slate-900">{suggestion.title}</h3>
        <p className="mt-1 text-xs text-slate-500">{suggestion.targetDate}</p>
        <p className="mt-1 text-xs text-slate-500">
          {suggestion.hemisphere === "UPPER_PROPHETIC" ? "Prophetic" : "Earthly"}
          {narrative ? ` · ${narrative.title}` : ""}
        </p>
        {suggestion.description && (
          <p className="mt-3 text-sm text-slate-700">{suggestion.description}</p>
        )}
        {suggestion.reasoning && (
          <p className="mt-3 rounded border border-violet-100 bg-violet-50 p-2 text-xs text-violet-900">
            {suggestion.reasoning}
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => void handleAcceptSuggestion(suggestion)}
            disabled={saving}
            className="rounded bg-emerald-600 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
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
      </aside>
    );
  }

  if (!milestone) {
    return (
      <aside className="w-80 border-l border-slate-200 bg-white p-4 shadow-sm">
        <button
          onClick={() => setDrawerMode(null)}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          Close
        </button>
        <p className="mt-4 text-sm text-slate-500">
          Select a milestone to view details.
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-80 border-l border-slate-200 bg-white p-4 shadow-sm overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          {editing ? "Edit Milestone" : "Milestone Detail"}
        </h2>
        <div className="flex items-center gap-2">
          {!editing && (
            <button
              onClick={() => {
                setError(null);
                setEditing(true);
              }}
              className="text-xs text-sky-600 hover:text-sky-700"
            >
              Edit
            </button>
          )}
          <button
            onClick={handleDeleteMilestone}
            disabled={deleting || editing}
            className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={() => setDrawerMode(null)}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Close
          </button>
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="mt-4 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className={inputClass}
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className={`${inputClass} h-16`}
          />
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            min={`${TIMELINE_START_YEAR}-01-01`}
            max={`${TIMELINE_END_YEAR}-12-31`}
            className={inputClass}
            required
          />
          <select
            value={narrativeId}
            onChange={(e) => setNarrativeId(e.target.value)}
            className={inputClass}
          >
            <option value="">No narrative</option>
            {narratives.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </select>
          <select
            value={linkedFragmentId}
            onChange={(e) => setLinkedFragmentId(e.target.value)}
            className={inputClass}
          >
            <option value="">No video source</option>
            {fragments.map((f) => (
              <option key={f.id} value={f.id}>
                {fragmentLabel(f)}
              </option>
            ))}
          </select>
          <select
            value={hemisphere}
            onChange={(e) =>
              setHemisphere(e.target.value as "UPPER_PROPHETIC" | "LOWER_EARTHLY")
            }
            className={inputClass}
          >
            <option value="UPPER_PROPHETIC">Upper — Prophetic</option>
            <option value="LOWER_EARTHLY">Lower — Earthly</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={isPersonal}
              onChange={(e) => setIsPersonal(e.target.checked)}
            />
            Personal — omit from Export
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={isFuzzy}
              onChange={(e) => setIsFuzzy(e.target.checked)}
            />
            Fuzzy window (forward from date)
          </label>
          {isFuzzy && (
            <input
              type="number"
              min={1}
              max={120}
              value={fuzzyRangeMonths}
              onChange={(e) => setFuzzyRangeMonths(Number(e.target.value))}
              className={inputClass}
            />
          )}
          {error && <p className="text-[10px] text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-amber-500 px-3 py-1 text-xs text-white hover:bg-amber-400 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
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
              }}
              className="rounded bg-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-300"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 space-y-3">
          <div
            className="rounded border p-3 bg-white"
            style={{
              borderColor: narrative?.colorHex ?? "#cbd5e1",
              backgroundColor: (narrative?.colorHex ?? "#94a3b8") + "12",
            }}
          >
            <p className="text-xs text-slate-500">
              {milestone.targetDate}
              {milestone.isFuzzy && (
                <span className="ml-1 text-slate-400">
                  · +{milestone.fuzzyRangeMonths}mo window
                </span>
              )}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {milestone.hemisphere === "UPPER_PROPHETIC" ? "Prophetic" : "Earthly"}
              {milestone.isPersonal && (
                <span className="ml-2 rounded bg-violet-100 px-1 py-px text-violet-700">
                  Personal
                </span>
              )}
            </p>
            <h3 className="font-medium text-slate-900">{milestone.title}</h3>
            {milestone.description && (
              <p className="mt-1 text-sm text-slate-600">{milestone.description}</p>
            )}
            {narrative && (
              <p className="mt-2 text-xs" style={{ color: narrative.colorHex }}>
                Narrative: {narrative.title}
              </p>
            )}
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <h4 className="text-xs font-medium text-slate-700">Video source</h4>
            {linkedFragment ? (
              <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2">
                <p className="text-[10px] font-medium text-amber-800">
                  {formatTimestamp(linkedFragment.timestampSeconds)} ·{" "}
                  {linkedFragment.speaker}
                </p>
                <p className="mt-1 text-[10px] text-slate-600 line-clamp-2">
                  {linkedFragment.rawText}
                </p>
                <button
                  onClick={() =>
                    openVideoModal(
                      linkedFragment.sourceUrl,
                      relatedFragments.length > 0
                        ? relatedFragments
                        : [linkedFragment]
                    )
                  }
                  className="mt-2 text-[10px] text-sky-600 hover:underline"
                >
                  Play at {formatTimestamp(linkedFragment.timestampSeconds)}
                </button>
              </div>
            ) : (
              <p className="mt-1 text-[10px] text-slate-500">No video linked yet.</p>
            )}

            {fragments.length > 0 ? (
              <div className="mt-2 space-y-2">
                <select
                  value={linkFragmentId}
                  onChange={(e) => setLinkFragmentId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Choose a fragment to link…</option>
                  {fragments.map((f) => (
                    <option key={f.id} value={f.id}>
                      {fragmentLabel(f)}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1">
                  <button
                    onClick={() => linkFragmentId && handleLinkFragment(linkFragmentId)}
                    disabled={!linkFragmentId || linking}
                    className="rounded bg-sky-600 px-2 py-1 text-[10px] text-white hover:bg-sky-500 disabled:opacity-50"
                  >
                    {linking ? "Linking…" : linkedFragment ? "Change link" : "Link source"}
                  </button>
                  {linkedFragment && (
                    <button
                      onClick={() => handleLinkFragment(null)}
                      disabled={linking}
                      className="rounded bg-slate-200 px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                    >
                      Remove link
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-[10px] text-slate-400">
                Add a video fragment via Add Data first.
              </p>
            )}
          </div>

          {relatedFragments.length > 1 && (
            <div>
              <h4 className="text-xs font-medium text-slate-600">
                Other clips from same video
              </h4>
              <ul className="mt-2 space-y-2">
                {relatedFragments
                  .filter((f) => f.id !== linkedFragment?.id)
                  .map((f) => (
                    <li key={f.id}>
                      <button
                        onClick={() =>
                          openVideoModal(
                            f.sourceUrl,
                            relatedFragments.filter(
                              (rf) => rf.sourceUrl === f.sourceUrl
                            )
                          )
                        }
                        className="w-full rounded border border-slate-200 bg-white p-2 text-left text-xs hover:bg-slate-100"
                      >
                        <span className="text-amber-600">
                          {formatTimestamp(f.timestampSeconds)}
                        </span>
                        <span className="ml-2 text-slate-700">{f.speaker}</span>
                        <p className="mt-1 text-slate-600 line-clamp-2">{f.rawText}</p>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
