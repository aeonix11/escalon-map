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

export default function CentralTimeAxis({
  scale,
  baseWidthPerYear,
  canvasWidth,
}: CentralTimeAxisProps) {
  const ticks: { left: number; label: string; sub?: string }[] = [];

  for (let year = TIMELINE_START_YEAR; year <= TIMELINE_END_YEAR; year++) {
    const yearLeft = (year - TIMELINE_START_YEAR) * baseWidthPerYear;

    if (scale === "DECADAL") {
      if (year % 5 === 0 || year === TIMELINE_START_YEAR) {
        ticks.push({ left: yearLeft, label: String(year) });
      }
    } else if (scale === "YEARLY") {
      ticks.push({ left: yearLeft, label: String(year) });
    } else {
      for (let month = 0; month < 12; month++) {
        const monthLeft =
          (year - TIMELINE_START_YEAR + month / 12) * baseWidthPerYear;
        ticks.push({
          left: monthLeft,
          label: MONTHS[month],
          sub: month === 0 ? String(year) : undefined,
        });
      }
    }
  }

  return (
    <div className="relative h-full w-full" style={{ width: canvasWidth }}>
      <div className="absolute inset-0 flex items-center">
        {ticks.map((tick, i) => (
          <div
            key={i}
            className="absolute flex flex-col items-center"
            style={{ left: `${tick.left}px` }}
          >
            <div className="h-3 w-px bg-slate-300" />
            <span className="mt-1 text-[10px] text-slate-600">{tick.label}</span>
            {tick.sub && (
              <span className="text-[9px] text-slate-400">{tick.sub}</span>
            )}
          </div>
        ))}
      </div>
      <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-300" />
    </div>
  );
}
