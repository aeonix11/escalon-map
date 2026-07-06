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
  const isDecadal = zoomLevel === "DECADAL";
  const showDescription = zoomLevel === "SEASONAL" && data.description;
  const isSuggested = Boolean(data.isAiSuggested);

  return (
    <button
      onClick={onClick}
      className={`group relative w-full rounded-lg border bg-white text-left shadow-sm transition-all hover:scale-[1.02] hover:shadow-md ${
        isDecadal ? "p-2" : "p-3"
      } ${isSuggested ? "border-dashed border-violet-400 bg-violet-50/60" : ""}`}
      style={{
        borderColor: isSuggested ? undefined : color + "55",
      }}
    >
      {!isSuggested && (
        <div
          className="absolute left-0 top-0 h-1 w-full rounded-t-lg"
          style={{ backgroundColor: color }}
        />
      )}
      <p className={`text-slate-500 ${isDecadal ? "text-[9px]" : "text-[10px]"}`}>
        {data.targetDate}
        {data.isFuzzy && (
          <span className="ml-1 text-slate-400">· +{data.fuzzyRangeMonths}mo</span>
        )}
        {data.isPersonal && (
          <span className="ml-1 rounded bg-violet-100 px-1 text-violet-700">Personal</span>
        )}
        {isSuggested && (
          <span className="ml-1 rounded bg-violet-200 px-1 text-violet-800">AI suggested</span>
        )}
      </p>
      <h4
        className={`font-medium text-slate-900 ${
          isDecadal ? "text-xs leading-snug" : "text-sm"
        }`}
      >
        {data.title}
      </h4>
      {showDescription && (
        <p className="mt-1 text-xs text-slate-600 line-clamp-2">
          {data.description}
        </p>
      )}
      {!showDescription && data.description && (
        <div className="absolute -top-10 left-0 hidden whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-lg group-hover:block">
          {data.title}
          {` — ${data.description}`}
        </div>
      )}
    </button>
  );
}
