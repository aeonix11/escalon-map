"use client";

import type { ZoomLevel } from "@/lib/types";
import { TIMELINE_END_YEAR, TIMELINE_START_YEAR } from "@/lib/types";

interface CentralTimeAxisProps {
  scale: ZoomLevel;
  baseWidthPerYear: number;
  canvasWidth: number;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type Tick = {
  left: number;
  label: string;
  kind: "year" | "month" | "decade";
};

function isDecadeYear(year: number): boolean {
  return year % 10 === 0;
}

function shouldShowYear(year: number, scale: ZoomLevel): boolean {
  if (scale === "DECADAL") return year % 5 === 0;
  return true;
}

function monthStep(scale: ZoomLevel): number {
  if (scale === "SEASONAL") return 3;
  return 12;
}

export default function CentralTimeAxis({
  scale,
  baseWidthPerYear,
  canvasWidth,
}: CentralTimeAxisProps) {
  const ticks: Tick[] = [];

  for (let year = TIMELINE_START_YEAR; year <= TIMELINE_END_YEAR; year++) {
    if (!shouldShowYear(year, scale)) continue;

    const yearLeft = (year - TIMELINE_START_YEAR) * baseWidthPerYear;
    const decade = isDecadeYear(year);

    ticks.push({
      left: yearLeft,
      label: String(year),
      kind: decade ? "decade" : "year",
    });

    if (scale === "SEASONAL") {
      const step = monthStep(scale);
      for (let month = step; month < 12; month += step) {
        const monthLeft =
          (year - TIMELINE_START_YEAR + month / 12) * baseWidthPerYear;
        ticks.push({
          left: monthLeft,
          label: MONTHS[month],
          kind: "month",
        });
      }
    }
  }

  return (
    <div className="relative h-full w-full" style={{ width: canvasWidth }}>
      <div className="absolute inset-0 flex items-center">
        {ticks.map((tick, i) => (
          <div
            key={`${tick.kind}-${tick.left}-${i}`}
            className="absolute flex flex-col items-center -translate-x-1/2 z-[3] pointer-events-none"
            style={{ left: `${tick.left}px` }}
          >
            {tick.kind === "decade" ? (
              <span className="mb-1 rounded-md border-2 border-slate-400 bg-white px-2.5 py-0.5 text-[13px] font-bold tabular-nums text-slate-900 shadow-md">
                {tick.label}
              </span>
            ) : tick.kind === "year" ? (
              <span className="mb-0.5 rounded border border-slate-300 bg-white px-1.5 py-px text-[11px] font-bold tabular-nums text-slate-800 shadow-sm">
                {tick.label}
              </span>
            ) : null}
            <div
              className={
                tick.kind === "decade"
                  ? "h-6 w-1 rounded-full bg-slate-700"
                  : tick.kind === "year"
                    ? "h-4 w-0.5 bg-slate-500"
                    : "h-2 w-px bg-slate-400"
              }
            />
            {tick.kind === "month" && (
              <span className="mt-0.5 rounded bg-white/95 px-1 text-[9px] font-semibold tabular-nums text-slate-600 shadow-sm">
                {tick.label}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-500/80 z-[1]" />
    </div>
  );
}
