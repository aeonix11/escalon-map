"use client";

import { useState } from "react";
import type { Narrative } from "@/lib/schema";
import { parseTimeInput, formatTimestamp } from "@/lib/types";
import { inputClass } from "./formStyles";

export default function AddFragmentForm({
  narratives,
  onCreated,
}: {
  narratives: Narrative[];
  onCreated: () => void;
}) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [videoTime, setVideoTime] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [rawText, setRawText] = useState("");
  const [narrativeIds, setNarrativeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);

  const toggleNarrative = (id: string) => {
    setNarrativeIds((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const timestampSeconds = parseTimeInput(videoTime);
    if (timestampSeconds === null) {
      setTimeError("Use mm:ss (e.g. 24:45) or h:mm:ss (e.g. 1:02:30)");
      return;
    }
    setTimeError(null);
    setLoading(true);
    await fetch("/api/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "fragment",
        data: {
          sourceUrl,
          timestampSeconds,
          speaker,
          rawText,
          narrativeIds,
        },
      }),
    });
    setSourceUrl("");
    setVideoTime("");
    setSpeaker("");
    setRawText("");
    setNarrativeIds([]);
    setLoading(false);
    onCreated();
  };

  const previewSeconds = parseTimeInput(videoTime);

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
    >
      <h3 className="text-xs font-medium text-slate-600 mb-2">Add Video Fragment</h3>
      <label className="mb-1 block text-[10px] text-slate-500">YouTube URL</label>
      <input
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
        placeholder="https://www.youtube.com/watch?v=..."
        className={`${inputClass} mb-2`}
        required
      />
      <label className="mb-1 block text-[10px] text-slate-500">
        Video timestamp
        <span className="ml-1 text-slate-400">(mm:ss or h:mm:ss)</span>
      </label>
      <input
        value={videoTime}
        onChange={(e) => {
          setVideoTime(e.target.value);
          setTimeError(null);
        }}
        placeholder="24:45"
        className={`${inputClass} mb-1 font-mono`}
        required
      />
      {timeError && (
        <p className="mb-2 text-[10px] text-red-600">{timeError}</p>
      )}
      {previewSeconds !== null && videoTime.trim() && !timeError && (
        <p className="mb-2 text-[10px] text-slate-400">
          Jumps to {formatTimestamp(previewSeconds)} in the video
        </p>
      )}
      <label className="mb-1 block text-[10px] text-slate-500">Speaker</label>
      <input
        value={speaker}
        onChange={(e) => setSpeaker(e.target.value)}
        placeholder="Who said it"
        className={`${inputClass} mb-2`}
        required
      />
      <label className="mb-1 block text-[10px] text-slate-500">Quote / transcript</label>
      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder="What was said at this timestamp..."
        className={`${inputClass} mb-2 h-12`}
        required
      />
      {narratives.length > 0 && (
        <>
          <label className="mb-1 block text-[10px] text-slate-500">
            Tag narratives (optional)
          </label>
          <div className="flex flex-wrap gap-1 mb-2">
            {narratives.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => toggleNarrative(n.id)}
                className={`rounded px-2 py-0.5 text-[10px] ${
                  narrativeIds.includes(n.id)
                    ? "ring-2 ring-slate-400/40"
                    : "opacity-60"
                }`}
                style={{ backgroundColor: n.colorHex + "30", color: n.colorHex }}
              >
                {n.title}
              </button>
            ))}
          </div>
        </>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-sky-600 px-3 py-1 text-xs text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Create Fragment"}
      </button>
    </form>
  );
}
