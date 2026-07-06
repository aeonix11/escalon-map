"use client";

import type { VisualNote, ZoomLevel } from "@/lib/types";

interface NoteCardProps {
  data: VisualNote;
  zoomLevel: ZoomLevel;
  onClick: () => void;
}

export default function NoteCard({ data, zoomLevel, onClick }: NoteCardProps) {
  const color =
    data.hemisphere === "UPPER_PROPHETIC" ? "#f59e0b" : "#0ea5e9";
  const isDecadal = zoomLevel === "DECADAL";
  const showContent = zoomLevel === "SEASONAL" && data.content;

  return (
    <button
      onClick={onClick}
      className={`group relative w-full rounded-lg border bg-white text-left shadow-sm transition-all hover:scale-[1.02] hover:shadow-md ${
        isDecadal ? "p-2" : "p-3"
      }`}
      style={{ borderColor: color + "55" }}
    >
      <div
        className="absolute left-0 top-0 h-1 w-full rounded-t-lg"
        style={{ backgroundColor: color }}
      />
      <p className={`text-slate-500 ${isDecadal ? "text-[9px]" : "text-[10px]"}`}>
        {data.pinnedDate}
        {data.isPersonal && (
          <span className="ml-1 rounded bg-violet-100 px-1 text-violet-700">
            Personal
          </span>
        )}
      </p>
      <h4
        className={`font-medium text-slate-900 ${
          isDecadal ? "text-xs leading-snug" : "text-sm"
        }`}
      >
        {data.title}
      </h4>
      {showContent && (
        <p className="mt-1 text-xs text-slate-600 line-clamp-3">{data.content}</p>
      )}
      {!showContent && data.content && (
        <div className="absolute -top-10 left-0 hidden whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-lg group-hover:block">
          {data.title}
        </div>
      )}
    </button>
  );
}
