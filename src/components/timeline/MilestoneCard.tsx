"use client";

import type { VisualMilestone, ZoomLevel } from "@/lib/types";

interface MilestoneCardProps {
  data: VisualMilestone;
  variant: "prophetic" | "earthly";
  zoomLevel: ZoomLevel;
  onClick: () => void;
}

export default function MilestoneCard({
  data,
  variant,
  zoomLevel,
  onClick,
}: MilestoneCardProps) {
  const color =
    data.narrativeColor ?? (variant === "prophetic" ? "#f59e0b" : "#0ea5e9");
  const isCompact = zoomLevel === "DECADAL";
  const isYearly = zoomLevel === "YEARLY";

  if (isCompact) {
    return (
      <button
        onClick={onClick}
        className="group relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-sm transition-transform hover:scale-125"
        style={{ backgroundColor: color }}
        title={data.title}
      >
        {data.isFuzzy && (
          <span
            className="absolute -bottom-1 left-1/2 h-1 w-3 -translate-x-1/2 rounded-full opacity-80"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="absolute -top-8 left-0 hidden whitespace-nowrap rounded bg-white border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-md group-hover:block">
          {data.title}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group relative rounded-lg border bg-white p-3 text-left shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
      style={{
        borderColor: color + "55",
      }}
    >
      <div
        className="absolute left-0 top-0 h-1 w-full rounded-t-lg"
        style={{ backgroundColor: color }}
      />
      <p className="text-[10px] text-slate-500">{data.targetDate}</p>
      <h4 className="text-sm font-medium text-slate-900">{data.title}</h4>
      {!isYearly && data.description && (
        <p className="mt-1 text-xs text-slate-600 line-clamp-2">
          {data.description}
        </p>
      )}
      <div
        className="absolute -top-10 left-0 hidden whitespace-nowrap rounded bg-white border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-lg group-hover:block"
      >
        {data.title}
        {data.description && ` — ${data.description}`}
      </div>
    </button>
  );
}
