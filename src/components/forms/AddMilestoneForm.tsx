"use client";

import { useState } from "react";
import type { Fragment, Narrative } from "@/lib/schema";
import {
  formatTimestamp,
  TIMELINE_START_YEAR,
  TIMELINE_END_YEAR,
} from "@/lib/types";
import { inputClass } from "./formStyles";

function fragmentLabel(f: Fragment): string {
  const preview =
    f.rawText.length > 40 ? `${f.rawText.slice(0, 40)}…` : f.rawText;
  return `${formatTimestamp(f.timestampSeconds)} · ${f.speaker} — ${preview}`;
}

export default function AddMilestoneForm({
  narratives,
  fragments,
  onCreated,
}: {
  narratives: Narrative[];
  fragments: Fragment[];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("2026-06-01");
  const [narrativeIds, setNarrativeIds] = useState<string[]>([]);
  const [linkedFragmentId, setLinkedFragmentId] = useState("");
  const [hemisphere, setHemisphere] = useState<"UPPER_PROPHETIC" | "LOWER_EARTHLY">(
    "UPPER_PROPHETIC"
  );
  const [isFuzzy, setIsFuzzy] = useState(false);
  const [fuzzyRangeMonths, setFuzzyRangeMonths] = useState(3);
  const [isPersonal, setIsPersonal] = useState(false);
  const [isSpeculative, setIsSpeculative] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "milestone",
        data: {
          title,
          description,
          targetDate,
          narrativeIds,
          linkedFragmentId: linkedFragmentId || null,
          hemisphere,
          isFuzzy,
          fuzzyRangeMonths,
          isPersonal,
          isSpeculative,
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to save milestone");
      return;
    }
    setSuccess(`Saved: ${title} (${hemisphere === "LOWER_EARTHLY" ? "Earthly" : "Prophetic"})`);
    setTitle("");
    setDescription("");
    setLinkedFragmentId("");
    onCreated();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
    >
      <h3 className="text-xs font-medium text-slate-600 mb-2">Add Milestone</h3>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className={`${inputClass} mb-2`}
        required
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className={`${inputClass} mb-2 h-12`}
      />
      <input
        type="date"
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
        min={`${TIMELINE_START_YEAR}-01-01`}
        max={`${TIMELINE_END_YEAR}-12-31`}
        className={`${inputClass} mb-2`}
      />
      <div className="mb-2">
        <p className="mb-1 text-[10px] text-slate-500">Narratives (optional)</p>
        <div className="flex flex-wrap gap-1">
          {narratives.map((n) => {
            const selected = narrativeIds.includes(n.id);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() =>
                  setNarrativeIds((prev) =>
                    selected
                      ? prev.filter((id) => id !== n.id)
                      : [...prev, n.id]
                  )
                }
                className={`rounded px-2 py-0.5 text-[10px] border ${
                  selected ? "ring-1" : "opacity-60"
                }`}
                style={{
                  backgroundColor: n.colorHex + "30",
                  color: n.colorHex,
                  borderColor: n.colorHex + "55",
                }}
              >
                {n.title}
              </button>
            );
          })}
        </div>
      </div>
      <label className="mb-1 block text-[10px] text-slate-500">
        Link video source (optional)
      </label>
      <select
        value={linkedFragmentId}
        onChange={(e) => setLinkedFragmentId(e.target.value)}
        className={`${inputClass} mb-2`}
      >
        <option value="">No video source</option>
        {fragments.map((f) => (
          <option key={f.id} value={f.id}>
            {fragmentLabel(f)}
          </option>
        ))}
      </select>
      {fragments.length === 0 && (
        <p className="mb-2 text-[10px] text-slate-400">
          Add a video fragment first, then link it here.
        </p>
      )}
      <select
        value={hemisphere}
        onChange={(e) =>
          setHemisphere(e.target.value as "UPPER_PROPHETIC" | "LOWER_EARTHLY")
        }
        className={`${inputClass} mb-1`}
      >
        <option value="UPPER_PROPHETIC">Upper — Prophetic</option>
        <option value="LOWER_EARTHLY">Lower — Earthly</option>
      </select>
      <p className="mb-2 text-[10px] text-slate-500">
        Earthly milestones appear in the blue zone below the timeline axis.
      </p>
      {error && (
        <p className="mb-2 text-[10px] text-red-600">{error}</p>
      )}
      {success && (
        <p className="mb-2 text-[10px] text-emerald-700">{success}</p>
      )}
      <label className="flex items-center gap-2 text-xs text-slate-600 mb-2">
        <input
          type="checkbox"
          checked={isPersonal}
          onChange={(e) => setIsPersonal(e.target.checked)}
        />
        Personal — omit from Export (for your eyes only)
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-600 mb-2">
        <input type="checkbox" checked={isFuzzy} onChange={(e) => setIsFuzzy(e.target.checked)} />
        Fuzzy window — extends forward from target date
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-600 mb-2">
        <input
          type="checkbox"
          checked={isSpeculative}
          onChange={(e) => setIsSpeculative(e.target.checked)}
        />
        Speculative — anticipated placeholder, timing or certainty not firm
      </label>
      {isFuzzy && (
        <>
          <label className="mb-1 block text-[10px] text-slate-500">
            Duration after start (months)
          </label>
          <input
            type="number"
            min={1}
            max={120}
            value={fuzzyRangeMonths}
            onChange={(e) => setFuzzyRangeMonths(Number(e.target.value))}
            className={`${inputClass} mb-1`}
          />
          <p className="mb-2 text-[10px] text-slate-400">
            Card marks the start; timeline bar runs {fuzzyRangeMonths} month
            {fuzzyRangeMonths === 1 ? "" : "s"} forward (up to 10 years).
          </p>
        </>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-amber-500 px-3 py-1 text-xs text-white hover:bg-amber-400 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Create Milestone"}
      </button>
    </form>
  );
}
