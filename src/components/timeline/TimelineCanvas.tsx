"use client";

import { useRef, useState, useEffect } from "react";
import { useMapStore } from "@/store/mapStore";
import { useTimelineLayout } from "@/hooks/useTimelineLayout";
import CentralTimeAxis from "./CentralTimeAxis";
import MilestoneCard from "./MilestoneCard";
import SVGBezierConnector from "./SVGBezierConnector";
import MilestoneAnchorLines from "./MilestoneAnchorLines";
import {
  TIMELINE_END_YEAR,
  TIMELINE_START_YEAR,
  getLaneOffset,
} from "@/lib/types";

export default function TimelineCanvas() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<{ ratio: number; mouseX: number } | null>(null);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [hoveredMilestoneId, setHoveredMilestoneId] = useState<string | null>(
    null
  );

  const {
    milestones,
    narratives,
    zoomScale,
    activeNarrativeId,
    setSelectedMilestoneId,
    setDrawerMode,
    setZoomScale,
  } = useMapStore();

  const { milestones: computed, zoomLevel } = useTimelineLayout(
    milestones,
    narratives,
    zoomScale,
    activeNarrativeId
  );

  const baseWidthPerYear = zoomScale * 12;
  const totalYears = TIMELINE_END_YEAR - TIMELINE_START_YEAR;
  const canvasWidth = totalYears * baseWidthPerYear + 400;

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => setCanvasHeight(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const scrollWidth = el.scrollWidth;
      const ratio =
        scrollWidth > 0 ? (el.scrollLeft + mouseX) / scrollWidth : 0;

      const step =
        Math.sign(e.deltaY) *
        Math.min(6, Math.max(1, Math.round(Math.abs(e.deltaY) / 25)));
      const next = Math.min(100, Math.max(1, zoomScale - step));
      if (next === zoomScale) return;

      scrollAnchorRef.current = { ratio, mouseX };
      setZoomScale(next);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomScale, setZoomScale]);

  useEffect(() => {
    const el = scrollRef.current;
    const anchor = scrollAnchorRef.current;
    if (!el || !anchor) return;
    scrollAnchorRef.current = null;
    el.scrollLeft = anchor.ratio * el.scrollWidth - anchor.mouseX;
  }, [zoomScale, canvasWidth]);

  const handleMilestoneClick = (id: string) => {
    setSelectedMilestoneId(id);
    setDrawerMode("detail");
  };

  return (
    <div
      ref={scrollRef}
      className="relative h-[85vh] w-full overflow-x-auto overflow-y-hidden select-none bg-slate-100/80"
    >
      <div
        ref={canvasRef}
        style={{ width: `${canvasWidth}px` }}
        className="relative h-full"
      >
        {/* Hemisphere zones — use vertical screen space */}
        <div
          className="absolute inset-x-0 top-0 bottom-1/2 bg-amber-50/40 pointer-events-none"
        />
        <div
          className="absolute inset-x-0 top-1/2 bottom-0 bg-sky-50/40 pointer-events-none"
        />

        <MilestoneAnchorLines
          milestones={computed}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          zoomLevel={zoomLevel}
          highlightedMilestoneId={hoveredMilestoneId}
        />

        {activeNarrativeId && (
          <SVGBezierConnector
            milestones={computed}
            narrativeColor={
              narratives.find((n) => n.id === activeNarrativeId)?.colorHex ??
              "#3b82f6"
            }
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            zoomLevel={zoomLevel}
          />
        )}

        {computed.map((m) => {
          const offset = getLaneOffset(m.lane, zoomLevel);
          const isUpper = m.hemisphere === "UPPER_PROPHETIC";
          const isHovered = hoveredMilestoneId === m.id;
          const isDimmed =
            hoveredMilestoneId !== null && hoveredMilestoneId !== m.id;

          return (
            <div
              key={m.id}
              onMouseEnter={() => setHoveredMilestoneId(m.id)}
              onMouseLeave={() => setHoveredMilestoneId(null)}
              style={{
                left: `${m.leftPixel}px`,
                opacity: isDimmed ? m.opacity * 0.45 : m.opacity,
                ...(isUpper
                  ? { bottom: `calc(50% + ${offset}px)` }
                  : { top: `calc(50% + ${offset}px)` }),
              }}
              className={`absolute w-[260px] pointer-events-auto transition-all duration-200 ease-out ${
                isHovered ? "z-[14] scale-[1.02]" : "z-[12]"
              }`}
            >
              <MilestoneCard
                data={m}
                variant={isUpper ? "prophetic" : "earthly"}
                zoomLevel={zoomLevel}
                onClick={() => handleMilestoneClick(m.id)}
              />
            </div>
          );
        })}

        <div
          className="absolute top-[50%] translate-y-[-50%] w-full h-16 bg-white/75 border-y border-slate-200 shadow-sm z-10 pointer-events-none"
        >
          <CentralTimeAxis
            scale={zoomLevel}
            baseWidthPerYear={baseWidthPerYear}
            canvasWidth={canvasWidth}
          />
        </div>
      </div>
    </div>
  );
}
