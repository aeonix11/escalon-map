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
  sub?: string;
  kind: "year" | "month";
};

export default function CentralTimeAxis({
  scale,
  baseWidthPerYear,
  canvasWidth,
}: CentralTimeAxisProps) {
  const ticks: Tick[] = [];

  for (let year = TIMELINE_START_YEAR; year <= TIMELINE_END_YEAR; year++) {
    const yearLeft = (year - TIMELINE_START_YEAR) * baseWidthPerYear;

    ticks.push({ left: yearLeft, label: String(year), kind: "year" });

    if (scale === "SEASONAL") {
      for (let month = 1; month < 12; month++) {
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
            className="absolute flex flex-col items-center -translate-x-1/2"
            style={{ left: `${tick.left}px` }}
          >
            <div
              className={
                tick.kind === "year"
                  ? "h-5 w-0.5 bg-slate-500"
                  : "h-2.5 w-px bg-slate-300"
              }
            />
            <span
              className={
                tick.kind === "year"
                  ? "mt-1 text-[11px] font-bold tabular-nums text-slate-800"
                  : "mt-0.5 text-[9px] text-slate-500"
              }
            >
              {tick.label}
            </span>
            {tick.sub && (
              <span className="text-[8px] font-medium text-slate-500">{tick.sub}</span>
            )}
          </div>
        ))}
      </div>
      <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-400" />
    </div>
  );
}
