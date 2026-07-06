"use client";

import { useMemo } from "react";
import {
  formatTimelineDate,
  getNowTimelineFraction,
  isNowInTimelineRange,
} from "@/lib/types";

interface NowMarkerProps {
  baseWidthPerYear: number;
}

export default function NowMarker({ baseWidthPerYear }: NowMarkerProps) {
  const { left, label } = useMemo(() => {
    const now = new Date();
    return {
      left: getNowTimelineFraction(now) * baseWidthPerYear,
      label: formatTimelineDate(now),
    };
  }, [baseWidthPerYear]);

  if (!isNowInTimelineRange()) return null;

  return (
    <div
      className="pointer-events-none absolute inset-y-0 z-[11]"
      style={{ left: `${left}px` }}
      aria-hidden
    >
      <div className="absolute inset-y-0 left-0 w-0 -translate-x-1/2 border-l-2 border-dashed border-rose-500/85 shadow-[1px_0_8px_rgba(244,63,94,0.25)]" />

      <div className="absolute left-1/2 top-1/2 z-[1] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <div className="rounded-full border-2 border-white bg-rose-500 shadow-md h-3.5 w-3.5" />
        <div className="mt-1 whitespace-nowrap rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700 shadow-sm">
          Now
        </div>
        <div className="mt-0.5 whitespace-nowrap text-[8px] font-medium text-rose-600/90">
          {label}
        </div>
      </div>
    </div>
  );
}
