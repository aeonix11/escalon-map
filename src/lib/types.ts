import type { Milestone, Narrative, Fragment, Note, MilestoneSuggestion } from "@/lib/schema";

export const TIMELINE_START_YEAR = 2012;
export const TIMELINE_END_YEAR = 2075;
export const CARD_WIDTH = 260;
export const NOTE_CARD_WIDTH = 208;
export const LANE_GAP = 48;
export const GAP_FROM_AXIS = 20;
export const PIN_OFFSET = 12;
/** Matches CentralTimeAxis band (`h-16`) */
export const AXIS_BAND_HEIGHT = 64;
export const AXIS_HALF_HEIGHT = AXIS_BAND_HEIGHT / 2;

/** Parse YYYY-MM-DD (or ISO) into timeline year fraction without timezone drift. */
export function parseTargetDateFraction(targetDate: string): number {
  const match = targetDate.match(/^(\d{4})-(\d{2})/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    return year - TIMELINE_START_YEAR + month / 12;
  }
  const dateObj = new Date(targetDate);
  return (
    dateObj.getFullYear() -
    TIMELINE_START_YEAR +
    dateObj.getMonth() / 12
  );
}

/** Current local date as a timeline fraction (includes day within month). */
export function getNowTimelineFraction(now = new Date()): number {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return year - TIMELINE_START_YEAR + (month + (day - 1) / daysInMonth) / 12;
}

export function isNowInTimelineRange(now = new Date()): boolean {
  const year = now.getFullYear();
  return year >= TIMELINE_START_YEAR && year <= TIMELINE_END_YEAR;
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Fixed locale-independent date label (avoids SSR hydration mismatch). */
export function formatTimelineDate(date: Date): string {
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function getLaneStep(zoomLevel: ZoomLevel): number {
  if (zoomLevel === "DECADAL") return 72;
  if (zoomLevel === "YEARLY") return 130;
  return 170;
}

/** Pixels from center line to card edge (clears axis band + gap + lane stack) */
export function getLaneOffset(lane: number, zoomLevel: ZoomLevel): number {
  return AXIS_HALF_HEIGHT + GAP_FROM_AXIS + (lane - 1) * getLaneStep(zoomLevel);
}

const ESTIMATED_CARD_HEIGHT = 96;
const TIMELINE_VERTICAL_PADDING = 48;

/** Tall enough to fit stacked lanes above/below the axis with room to scroll. */
export function getTimelineContentHeight(
  viewportHeight: number,
  maxUpperLane: number,
  maxLowerLane: number,
  zoomLevel: ZoomLevel
): number {
  const upperReach =
    maxUpperLane > 0
      ? getLaneOffset(maxUpperLane, zoomLevel) + ESTIMATED_CARD_HEIGHT
      : 0;
  const lowerReach =
    maxLowerLane > 0
      ? getLaneOffset(maxLowerLane, zoomLevel) + ESTIMATED_CARD_HEIGHT
      : 0;
  const halfSpan =
    Math.max(upperReach, lowerReach, AXIS_HALF_HEIGHT + GAP_FROM_AXIS + 80) +
    TIMELINE_VERTICAL_PADDING;
  const contentMin = halfSpan * 2 + AXIS_BAND_HEIGHT;
  return Math.max(viewportHeight, contentMin, 520);
}

export function pixelsToViewBoxY(pixels: number, containerHeight: number): number {
  if (containerHeight <= 0) return 500;
  return (pixels / containerHeight) * 1000;
}

export type ZoomLevel = "DECADAL" | "YEARLY" | "SEASONAL";

export function getZoomLevel(zoomScale: number): ZoomLevel {
  if (zoomScale < 30) return "DECADAL";
  if (zoomScale < 75) return "YEARLY";
  return "SEASONAL";
}

export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Parse mm:ss, h:mm:ss, or plain seconds into total seconds. */
export function parseTimeInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return 0;

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const parts = trimmed.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || Number.isNaN(Number(p)))) {
    return null;
  }

  if (parts.length === 2) {
    const [m, s] = parts.map(Number);
    if (s >= 60) return null;
    return m * 60 + s;
  }

  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    if (m >= 60 || s >= 60) return null;
    return h * 3600 + m * 60 + s;
  }

  return null;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export interface VisualNote extends Note {
  leftPixel: number;
  lane: number;
}

export interface VisualMilestone extends Milestone {
  leftPixel: number;
  lane: number;
  opacity: number;
  narrativeColor?: string;
  fuzzyLeftPixel?: number;
  fuzzyWidth?: number;
  isAiSuggested?: boolean;
  suggestionId?: string;
  suggestionReasoning?: string | null;
}

export interface MilestoneWithNarrative extends Milestone {
  narrative?: Narrative | null;
  linkedFragment?: Fragment | null;
}

export interface ExportData {
  version: 1;
  exportedAt: string;
  narratives: Narrative[];
  fragments: Fragment[];
  fragmentNarratives: { fragmentId: string; narrativeId: string }[];
  milestones: Milestone[];
  milestoneSuggestions?: MilestoneSuggestion[];
  aiNewsSignals: import("@/lib/schema").AiNewsSignal[];
  rssFeeds?: import("@/lib/schema").RssFeed[];
  notes?: Note[];
}
