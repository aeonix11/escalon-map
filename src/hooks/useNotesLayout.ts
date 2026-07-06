import { useMemo } from "react";
import type { Note } from "@/lib/schema";
import {
  LANE_GAP,
  NOTE_CARD_WIDTH,
  getZoomLevel,
  parseTargetDateFraction,
  type VisualNote,
  type ZoomLevel,
} from "@/lib/types";

export function useNotesLayout(
  notes: Note[],
  zoomScale: number
): { notes: VisualNote[]; zoomLevel: ZoomLevel } {
  const zoomLevel = useMemo(() => getZoomLevel(zoomScale), [zoomScale]);

  const computed = useMemo(() => {
    const baseWidthPerYear = zoomScale * 12;
    const upperLaneOccupancy: Record<number, number[]> = {};
    const lowerLaneOccupancy: Record<number, number[]> = {};

    const pinned = notes.filter((n) => n.pinnedDate && n.hemisphere);
    const sorted = [...pinned].sort((a, b) =>
      (a.pinnedDate ?? "").localeCompare(b.pinnedDate ?? "")
    );

    return sorted.map((n) => {
      const leftPixel =
        parseTargetDateFraction(n.pinnedDate!) * baseWidthPerYear;

      const occupancyMap =
        n.hemisphere === "UPPER_PROPHETIC"
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
          occupancyMap[assignedLane].push(leftPixel + NOTE_CARD_WIDTH);
          break;
        }
        assignedLane++;
      }

      return {
        ...n,
        leftPixel,
        lane: assignedLane,
      };
    });
  }, [notes, zoomScale, zoomLevel]);

  return { notes: computed, zoomLevel };
}
