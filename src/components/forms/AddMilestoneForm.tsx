"use client";

import { useState } from "react";
import type { Fragment, Narrative } from "@/lib/schema";
import { formatTimestamp } from "@/lib/types";
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
  const [narrativeId, setNarrativeId] = useState("");
  const [linkedFragmentId, setLinkedFragmentId] = useState("");
  const [hemisphere, setHemisphere] = useState<"UPPER_PROPHETIC" | "LOWER_EARTHLY">(
    "UPPER_PROPHETIC"
  );
  const [isFuzzy, setIsFuzzy] = useState(false);
  const [fuzzyRangeMonths, setFuzzyRangeMonths] = useState(3);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "milestone",
        data: {
          title,
          description,
          targetDate,
          narrativeId: narrativeId || null,
          linkedFragmentId: linkedFragmentId || null,
          hemisphere,
          isFuzzy,
          fuzzyRangeMonths,
        },
      }),
    });
    setTitle("");
    setDescription("");
    setLinkedFragmentId("");
    setLoading(false);
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
        className={`${inputClass} mb-2`}
      />
      <select
        value={narrativeId}
        onChange={(e) => setNarrativeId(e.target.value)}
        className={`${inputClass} mb-2`}
      >
        <option value="">No narrative</option>
        {narratives.map((n) => (
          <option key={n.id} value={n.id}>{n.title}</option>
        ))}
      </select>
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
        className={`${inputClass} mb-2`}
      >
        <option value="UPPER_PROPHETIC">Upper — Prophetic</option>
        <option value="LOWER_EARTHLY">Lower — Earthly</option>
      </select>
      <label className="flex items-center gap-2 text-xs text-slate-600 mb-2">
        <input type="checkbox" checked={isFuzzy} onChange={(e) => setIsFuzzy(e.target.checked)} />
        Fuzzy date window
      </label>
      {isFuzzy && (
        <input
          type="number"
          min={1}
          max={24}
          value={fuzzyRangeMonths}
          onChange={(e) => setFuzzyRangeMonths(Number(e.target.value))}
          className={`${inputClass} mb-2`}
        />
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
