"use client";

import type { Narrative } from "@/lib/schema";

interface NarrativeFilterBarProps {
  narratives: Narrative[];
  activeNarrativeId: string | null;
  onSelect: (id: string) => void;
}

export default function NarrativeFilterBar({
  narratives,
  activeNarrativeId,
  onSelect,
}: NarrativeFilterBarProps) {
  if (narratives.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-white px-6 py-2">
      {narratives.map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() => onSelect(n.id)}
          className={`rounded px-2 py-1 text-xs transition-all ${
            activeNarrativeId === n.id
              ? "ring-2 ring-slate-400/50"
              : "opacity-60 hover:opacity-100"
          }`}
          style={{ backgroundColor: n.colorHex + "40", color: n.colorHex }}
        >
          {n.title}
        </button>
      ))}
    </div>
  );
}
