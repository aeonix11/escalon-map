import { useMemo } from "react";
import type { Milestone, Narrative } from "@/lib/schema";
import {
  CARD_WIDTH,
  LANE_GAP,
  getZoomLevel,
  TIMELINE_START_YEAR,
  type VisualMilestone,
  type ZoomLevel,
} from "@/lib/types";

export function useTimelineLayout(
  milestones: Milestone[],
  narratives: Narrative[],
  zoomScale: number,
  activeNarrativeId: string | null
): { milestones: VisualMilestone[]; zoomLevel: ZoomLevel } {
  const zoomLevel = useMemo(() => getZoomLevel(zoomScale), [zoomScale]);

  const computed = useMemo(() => {
    const baseWidthPerYear = zoomScale * 12;
    const narrativeColorMap = new Map(
      narratives.map((n) => [n.id, n.colorHex])
    );

    const upperLaneOccupancy: Record<number, number[]> = {};
    const lowerLaneOccupancy: Record<number, number[]> = {};

    const sorted = [...milestones].sort((a, b) =>
      a.targetDate.localeCompare(b.targetDate)
    );

    return sorted.map((m) => {
      const dateObj = new Date(m.targetDate);
      const yearFraction =
        dateObj.getFullYear() -
        TIMELINE_START_YEAR +
        dateObj.getMonth() / 12;

      const leftPixel = yearFraction * baseWidthPerYear;

      let opacity = 1.0;
      if (activeNarrativeId && m.narrativeId !== activeNarrativeId) {
        opacity = 0.2;
      } else if (zoomLevel === "DECADAL" && !activeNarrativeId) {
        opacity = 0.5;
      } else if (zoomLevel === "YEARLY" && !activeNarrativeId) {
        opacity = 0.75;
      }

      const occupancyMap =
        m.hemisphere === "UPPER_PROPHETIC"
          ? upperLaneOccupancy
          : lowerLaneOccupancy;

      let assignedLane = 1;
      while (true) {
        const existingRightEdges = occupancyMap[assignedLane] || [];
        const hasCollision = existingRightEdges.some(
          (edge) => leftPixel < edge + LANE_GAP
        );
        if (!hasCollision) {
          if (!occupancyMap[assignedLane]) occupancyMap[assignedLane] = [];
          occupancyMap[assignedLane].push(leftPixel + CARD_WIDTH);
          break;
        }
        assignedLane++;
      }

      let fuzzyLeftPixel: number | undefined;
      let fuzzyWidth: number | undefined;
      if (m.isFuzzy) {
        const rangeYears = m.fuzzyRangeMonths / 12;
        fuzzyLeftPixel = leftPixel - rangeYears * baseWidthPerYear;
        fuzzyWidth = rangeYears * 2 * baseWidthPerYear;
      }

      return {
        ...m,
        leftPixel,
        lane: assignedLane,
        opacity,
        narrativeColor: m.narrativeId
          ? narrativeColorMap.get(m.narrativeId)
          : undefined,
        fuzzyLeftPixel,
        fuzzyWidth,
      };
    });
  }, [milestones, narratives, zoomScale, activeNarrativeId, zoomLevel]);

  return { milestones: computed, zoomLevel };
}
