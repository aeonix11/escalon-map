import type { Milestone, Narrative, Fragment } from "@/lib/schema";

export const TIMELINE_START_YEAR = 2026;
export const TIMELINE_END_YEAR = 2075;
export const CARD_WIDTH = 260;
export const LANE_GAP = 48;
export const GAP_FROM_AXIS = 20;
export const PIN_OFFSET = 12;
/** Matches CentralTimeAxis band (`h-16`) */
export const AXIS_BAND_HEIGHT = 64;
export const AXIS_HALF_HEIGHT = AXIS_BAND_HEIGHT / 2;

export function getLaneStep(zoomLevel: ZoomLevel): number {
  if (zoomLevel === "DECADAL") return 72;
  if (zoomLevel === "YEARLY") return 130;
  return 170;
}

/** Pixels from center line to card edge (clears axis band + gap + lane stack) */
export function getLaneOffset(lane: number, zoomLevel: ZoomLevel): number {
  return AXIS_HALF_HEIGHT + GAP_FROM_AXIS + (lane - 1) * getLaneStep(zoomLevel);
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

export interface VisualMilestone extends Milestone {
  leftPixel: number;
  lane: number;
  opacity: number;
  narrativeColor?: string;
  fuzzyLeftPixel?: number;
  fuzzyWidth?: number;
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
  aiNewsSignals: import("@/lib/schema").AiNewsSignal[];
  rssFeeds?: import("@/lib/schema").RssFeed[];
}
