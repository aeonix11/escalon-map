"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { useMapStore } from "@/store/mapStore";
import { useTimelineLayout } from "@/hooks/useTimelineLayout";
import { useNotesLayout } from "@/hooks/useNotesLayout";
import { useCommentsLayout } from "@/hooks/useCommentsLayout";
import CentralTimeAxis from "./CentralTimeAxis";
import MilestoneCard from "./MilestoneCard";
import NoteCard from "./NoteCard";
import MilestoneAnchorLines from "./MilestoneAnchorLines";
import NoteAnchorLines from "./NoteAnchorLines";
import NowMarker from "./NowMarker";
import CommentPin from "@/components/comments/CommentPin";
import { pixelToTimelineAnchor } from "@/lib/commentAnchors";
import {
  TIMELINE_END_YEAR,
  TIMELINE_START_YEAR,
  getLaneOffset,
  getNowTimelineFraction,
  getTimelineContentHeight,
  isNowInTimelineRange,
  PIN_OFFSET,
  parseTargetDateFraction,
} from "@/lib/types";

function maxLaneForHemisphere(
  items: { lane: number; hemisphere?: string | null }[],
  hemisphere: "UPPER_PROPHETIC" | "LOWER_EARTHLY"
): number {
  return items.reduce(
    (max, item) =>
      item.hemisphere === hemisphere ? Math.max(max, item.lane) : max,
    0
  );
}

export default function TimelineCanvas() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<{ ratio: number; mouseX: number } | null>(null);
  const didCenterVerticallyRef = useRef(false);
  const didCenterOnNowRef = useRef(false);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [hoveredMilestoneId, setHoveredMilestoneId] = useState<string | null>(
    null
  );
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);

  const {
    milestones,
    milestoneSuggestions,
    notes,
    narratives,
    zoomScale,
    activeNarrativeId,
    hidePersonalMilestones,
    narrativeFocusMode,
    setSelectedMilestoneId,
    setSelectedSuggestionId,
    setSelectedNoteId,
    setDrawerMode,
    setZoomScale,
    drawerMode,
    mapComments,
    commentPinMode,
    pendingCommentAnchor,
    focusedCommentId,
    scrollToCommentId,
    setPendingCommentAnchor,
    scrollToComment,
    clearScrollToComment,
  } = useMapStore();

  const layoutMilestones = useMemo(() => {
    let items = hidePersonalMilestones
      ? milestones.filter((m) => !m.isPersonal)
      : milestones;

    if (
      activeNarrativeId &&
      narrativeFocusMode === "hide"
    ) {
      items = items.filter((m) =>
        m.narrativeIds.includes(activeNarrativeId)
      );
    }

    return items;
  }, [milestones, hidePersonalMilestones, activeNarrativeId, narrativeFocusMode]);

  const layoutNotes = useMemo(
    () =>
      hidePersonalMilestones ? notes.filter((n) => !n.isPersonal) : notes,
    [notes, hidePersonalMilestones]
  );

  const layoutSuggestions = useMemo(() => {
    if (
      activeNarrativeId &&
      narrativeFocusMode === "hide"
    ) {
      return milestoneSuggestions.filter(
        (s) => s.narrativeId === activeNarrativeId
      );
    }
    return milestoneSuggestions;
  }, [milestoneSuggestions, activeNarrativeId, narrativeFocusMode]);

  const {
    milestones: computed,
    zoomLevel,
    maxUpperLane: maxMilestoneUpperLane,
    maxLowerLane: maxMilestoneLowerLane,
  } = useTimelineLayout(
    layoutMilestones,
    layoutSuggestions,
    narratives,
    zoomScale,
    activeNarrativeId
  );

  const { notes: computedNotes } = useNotesLayout(layoutNotes, zoomScale);

  const showCommentPins = drawerMode === "comments";
  const layoutComments = useCommentsLayout(
    showCommentPins ? mapComments : [],
    computed,
    zoomScale
  );

  const maxUpperLane = Math.max(
    maxMilestoneUpperLane,
    maxLaneForHemisphere(computedNotes, "UPPER_PROPHETIC")
  );
  const maxLowerLane = Math.max(
    maxMilestoneLowerLane,
    maxLaneForHemisphere(computedNotes, "LOWER_EARTHLY")
  );

  const contentHeight = getTimelineContentHeight(
    viewportHeight,
    maxUpperLane,
    maxLowerLane,
    zoomLevel
  );

  const baseWidthPerYear = zoomScale * 12;
  const totalYears = TIMELINE_END_YEAR - TIMELINE_START_YEAR;
  const canvasWidth = totalYears * baseWidthPerYear + 400;
  const centerY = contentHeight / 2;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setViewportHeight(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || didCenterVerticallyRef.current || contentHeight <= viewportHeight) {
      return;
    }
    el.scrollTop = (contentHeight - viewportHeight) / 2;
    didCenterVerticallyRef.current = true;
  }, [contentHeight, viewportHeight]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || didCenterOnNowRef.current || !isNowInTimelineRange()) return;

    const centerOnNow = () => {
      if (el.scrollWidth <= 0) return false;
      const nowLeft = getNowTimelineFraction() * baseWidthPerYear;
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      el.scrollLeft = Math.max(
        0,
        Math.min(maxScroll, nowLeft - el.clientWidth / 2)
      );
      return true;
    };

    if (centerOnNow()) {
      didCenterOnNowRef.current = true;
      return;
    }

    const frame = requestAnimationFrame(() => {
      if (centerOnNow()) didCenterOnNowRef.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [baseWidthPerYear, canvasWidth]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const zoomIntent = e.ctrlKey || e.metaKey;
      if (!zoomIntent || e.deltaY === 0) return;

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

  useEffect(() => {
    if (!scrollToCommentId || !showCommentPins) return;
    const el = scrollRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;

    const visual = layoutComments.find((c) => c.id === scrollToCommentId);
    if (!visual) {
      clearScrollToComment();
      return;
    }

    const isUpper = visual.hemisphere === "UPPER_PROPHETIC";
    const pinOffset = PIN_OFFSET + visual.stackIndex * 6;
    const pinY = isUpper
      ? centerY - pinOffset
      : centerY + pinOffset;

    const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight);

    el.scrollLeft = Math.max(
      0,
      Math.min(maxScrollLeft, visual.leftPixel - el.clientWidth / 2)
    );
    el.scrollTop = Math.max(
      0,
      Math.min(maxScrollTop, pinY - el.clientHeight / 2)
    );

    clearScrollToComment();
  }, [
    scrollToCommentId,
    showCommentPins,
    layoutComments,
    centerY,
    clearScrollToComment,
  ]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!commentPinMode || e.target !== e.currentTarget) return;

    const canvasRect = canvasRef.current!.getBoundingClientRect();
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const leftPixel =
      e.clientX - canvasRect.left + scrollEl.scrollLeft;
    const clickY = e.clientY - canvasRect.top + scrollEl.scrollTop;
    const anchor = pixelToTimelineAnchor(
      leftPixel,
      clickY,
      centerY,
      baseWidthPerYear
    );
    const label =
      anchor.hemisphere === "UPPER_PROPHETIC"
        ? `At: ${anchor.pinnedDate.slice(0, 4)} · Prophetic`
        : `At: ${anchor.pinnedDate.slice(0, 4)} · Earthly`;

    setPendingCommentAnchor({
      pinnedDate: anchor.pinnedDate,
      hemisphere: anchor.hemisphere,
      label,
    });
  };

  const handleMilestoneClick = (id: string, isSuggested: boolean) => {
    if (isSuggested) {
      setSelectedSuggestionId(id);
    } else {
      setSelectedMilestoneId(id);
    }
    setDrawerMode("detail");
  };

  const handleNoteClick = (id: string) => {
    setSelectedNoteId(id);
    setDrawerMode("notes");
  };

  return (
    <div
      ref={scrollRef}
      className={`relative h-full w-full overflow-x-auto overflow-y-auto select-none bg-slate-100/80 ${
        commentPinMode ? "cursor-crosshair" : ""
      }`}
    >
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ width: `${canvasWidth}px`, minHeight: `${contentHeight}px` }}
        className="relative"
      >
        {/* Hemisphere zones */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-1/2 bg-amber-50/40" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 bottom-0 bg-sky-50/40" />
        <div className="pointer-events-none absolute left-3 top-3 rounded bg-amber-100/90 px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
          Prophetic
        </div>
        <div className="pointer-events-none absolute left-3 bottom-3 rounded bg-sky-100/90 px-2 py-0.5 text-[10px] font-medium text-sky-800 border border-sky-200">
          Earthly
        </div>

        {Array.from(
          { length: TIMELINE_END_YEAR - TIMELINE_START_YEAR + 1 },
          (_, i) => TIMELINE_START_YEAR + i
        ).map((year) => {
          const isDecade = year % 10 === 0;
          const isHalfDecade = year % 5 === 0;
          return (
          <div
            key={year}
            className={`pointer-events-none absolute inset-y-0 ${
              isDecade
                ? "w-0.5 bg-slate-400/70"
                : isHalfDecade
                  ? "w-px bg-slate-400/40"
                  : "w-px bg-slate-300/25"
            }`}
            style={{
              left: `${(year - TIMELINE_START_YEAR) * baseWidthPerYear}px`,
            }}
          />
          );
        })}

        <NowMarker baseWidthPerYear={baseWidthPerYear} />

        <MilestoneAnchorLines
          milestones={computed}
          canvasWidth={canvasWidth}
          canvasHeight={contentHeight}
          zoomLevel={zoomLevel}
          highlightedMilestoneId={hoveredMilestoneId}
        />

        <NoteAnchorLines
          notes={computedNotes}
          canvasWidth={canvasWidth}
          canvasHeight={contentHeight}
          zoomLevel={zoomLevel}
          highlightedNoteId={hoveredNoteId}
        />

        {computedNotes.map((n) => {
          if (!n.hemisphere) return null;
          const offset = getLaneOffset(n.lane, zoomLevel);
          const isUpper = n.hemisphere === "UPPER_PROPHETIC";
          const isHovered = hoveredNoteId === n.id;
          const isDimmed = hoveredNoteId !== null && hoveredNoteId !== n.id;

          return (
            <div
              key={n.id}
              onMouseEnter={() => setHoveredNoteId(n.id)}
              onMouseLeave={() => setHoveredNoteId(null)}
              style={{
                left: `${n.leftPixel}px`,
                opacity: isDimmed ? 0.45 : 1,
                ...(isUpper
                  ? { bottom: contentHeight - centerY + offset }
                  : { top: centerY + offset }),
              }}
              className={`absolute w-52 pointer-events-auto transition-all duration-200 ease-out ${
                isHovered ? "z-[14] scale-[1.02]" : "z-[12]"
              }`}
            >
              <NoteCard
                data={n}
                zoomLevel={zoomLevel}
                onClick={() => handleNoteClick(n.id)}
              />
            </div>
          );
        })}

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
                  ? { bottom: contentHeight - centerY + offset }
                  : { top: centerY + offset }),
              }}
              className={`absolute w-[260px] pointer-events-auto transition-all duration-200 ease-out ${
                isHovered ? "z-[14] scale-[1.02]" : "z-[12]"
              }`}
            >
              <MilestoneCard
                data={m}
                variant={isUpper ? "prophetic" : "earthly"}
                zoomLevel={zoomLevel}
                onClick={() => handleMilestoneClick(m.id, Boolean(m.isAiSuggested))}
              />
            </div>
          );
        })}

        {showCommentPins &&
          layoutComments.map((c) => {
            const isUpper = c.hemisphere === "UPPER_PROPHETIC";
            const pinOffset = PIN_OFFSET + c.stackIndex * 6;
            const isFocused = focusedCommentId === c.id;

            return (
              <div
                key={c.id}
                style={{
                  left: `${c.leftPixel}px`,
                  ...(isUpper
                    ? { top: centerY - pinOffset - 16 }
                    : { top: centerY + pinOffset - 16 }),
                }}
                className="absolute z-[15] -translate-x-1/2 pointer-events-auto"
              >
                <CommentPin
                  authorName={c.authorName}
                  isFocused={isFocused}
                  onClick={() => scrollToComment(c.id)}
                />
              </div>
            );
          })}

        {showCommentPins &&
          commentPinMode &&
          pendingCommentAnchor?.pinnedDate &&
          pendingCommentAnchor.hemisphere && (
            <div
              style={{
                left: `${
                  parseTargetDateFraction(pendingCommentAnchor.pinnedDate) *
                  baseWidthPerYear
                }px`,
                ...(pendingCommentAnchor.hemisphere === "UPPER_PROPHETIC"
                  ? { top: centerY - PIN_OFFSET - 16 }
                  : { top: centerY + PIN_OFFSET - 16 }),
              }}
              className="absolute z-[16] -translate-x-1/2 pointer-events-none"
            >
              <CommentPin authorName="Preview" isFocused isPreview />
            </div>
          )}

        <div
          className="absolute top-[50%] translate-y-[-50%] w-full h-20 bg-white/95 border-y-2 border-slate-300 shadow-md z-10 pointer-events-none"
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
