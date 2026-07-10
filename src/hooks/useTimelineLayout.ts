import { useMemo } from "react";
import type { Narrative, MilestoneSuggestion, MilestoneWithNarratives } from "@/lib/schema";
import {
  CARD_WIDTH,
  LANE_GAP,
  getZoomLevel,
  parseTargetDateFraction,
  type VisualMilestone,
  type ZoomLevel,
} from "@/lib/types";

function suggestionToLayoutItem(s: MilestoneSuggestion): MilestoneWithNarratives & {
  isAiSuggested: true;
  suggestionId: string;
  suggestionReasoning: string | null;
  linkedFragmentId: null;
  isPersonal: false;
} {
  return {
    id: s.id,
    mapId: s.mapId,
    narrativeIds: s.narrativeId ? [s.narrativeId] : [],
    title: s.title,
    description: s.description,
    targetDate: s.targetDate,
    isFuzzy: s.isFuzzy,
    fuzzyRangeMonths: s.fuzzyRangeMonths,
    isPersonal: false,
    isSpeculative: s.tier === "speculative",
    hemisphere: s.hemisphere,
    linkedFragmentId: null,
    createdAt: s.createdAt,
    isAiSuggested: true,
    suggestionId: s.id,
    suggestionReasoning: s.reasoning,
  };
}

function milestoneMatchesActive(
  m: MilestoneWithNarratives,
  activeNarrativeId: string
): boolean {
  return m.narrativeIds.includes(activeNarrativeId);
}

export function useTimelineLayout(
  milestones: MilestoneWithNarratives[],
  suggestions: MilestoneSuggestion[],
  narratives: Narrative[],
  zoomScale: number,
  activeNarrativeId: string | null
): {
  milestones: VisualMilestone[];
  zoomLevel: ZoomLevel;
  maxUpperLane: number;
  maxLowerLane: number;
} {
  const zoomLevel = useMemo(() => getZoomLevel(zoomScale), [zoomScale]);
  const safeNarratives = Array.isArray(narratives) ? narratives : [];

  const computed = useMemo(() => {
    const baseWidthPerYear = zoomScale * 12;
    const narrativeColorMap = new Map(
      safeNarratives.map((n) => [n.id, n.colorHex])
    );

    const upperLaneOccupancy: Record<number, number[]> = {};
    const lowerLaneOccupancy: Record<number, number[]> = {};

    const layoutItems = [
      ...milestones.map((m) => ({ ...m, isAiSuggested: false as const })),
      ...suggestions.map(suggestionToLayoutItem),
    ];

    const sorted = [...layoutItems].sort((a, b) =>
      a.targetDate.localeCompare(b.targetDate)
    );

    return sorted.map((m) => {
      const yearFraction = parseTargetDateFraction(m.targetDate);
      const leftPixel = yearFraction * baseWidthPerYear;

      const matches =
        !activeNarrativeId ||
        milestoneMatchesActive(m, activeNarrativeId);

      let opacity = 1.0;
      if (activeNarrativeId && !matches) {
        opacity = m.isAiSuggested ? 0.55 : 0.2;
      }

      const narrativeColors = m.narrativeIds
        .map((id) => narrativeColorMap.get(id))
        .filter(Boolean) as string[];

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
        fuzzyLeftPixel = leftPixel;
        fuzzyWidth = rangeYears * baseWidthPerYear;
      }

      return {
        ...m,
        leftPixel,
        lane: assignedLane,
        opacity,
        narrativeColor: narrativeColors[0],
        narrativeColors,
        fuzzyLeftPixel,
        fuzzyWidth,
        suggestionId: m.isAiSuggested ? m.suggestionId : undefined,
        suggestionReasoning: m.isAiSuggested ? m.suggestionReasoning : undefined,
      };
    });
  }, [milestones, suggestions, safeNarratives, zoomScale, activeNarrativeId, zoomLevel]);

  const maxUpperLane = computed.reduce(
    (max, m) =>
      m.hemisphere === "UPPER_PROPHETIC" ? Math.max(max, m.lane) : max,
    0
  );
  const maxLowerLane = computed.reduce(
    (max, m) =>
      m.hemisphere === "LOWER_EARTHLY" ? Math.max(max, m.lane) : max,
    0
  );

  return { milestones: computed, zoomLevel, maxUpperLane, maxLowerLane };
}
