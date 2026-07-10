import type { HemisphereType } from "@/lib/schema";
import { parseTargetDateFraction, TIMELINE_START_YEAR } from "@/lib/types";

export interface CommentAnchorInput {
  milestoneId?: string | null;
  pinnedDate?: string | null;
  hemisphere?: HemisphereType | null;
}

export function validatePinnedDate(pinnedDate: string): boolean {
  if (!/^\d{4}-\d{2}/.test(pinnedDate)) return false;
  const fraction = parseTargetDateFraction(pinnedDate);
  return Number.isFinite(fraction);
}

export function fractionToPinnedDate(yearFraction: number): string {
  const clamped = Math.max(0, Math.min(63, yearFraction));
  const year = Math.floor(TIMELINE_START_YEAR + clamped);
  const monthFrac = clamped - (year - TIMELINE_START_YEAR);
  const month = Math.min(11, Math.max(0, Math.floor(monthFrac * 12)));
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function pixelToTimelineAnchor(
  leftPixel: number,
  clickY: number,
  centerY: number,
  baseWidthPerYear: number
): { pinnedDate: string; hemisphere: HemisphereType } {
  const yearFraction = leftPixel / baseWidthPerYear;
  const hemisphere: HemisphereType =
    clickY < centerY ? "UPPER_PROPHETIC" : "LOWER_EARTHLY";
  return {
    pinnedDate: fractionToPinnedDate(yearFraction),
    hemisphere,
  };
}

export function buildAnchorLabel(
  milestoneId: string | null | undefined,
  milestoneTitle: string | null | undefined,
  pinnedDate: string | null | undefined,
  hemisphere: HemisphereType | null | undefined
): string | null {
  if (milestoneId && milestoneTitle) return `On: ${milestoneTitle}`;
  if (pinnedDate && hemisphere) {
    const year = pinnedDate.slice(0, 4);
    const label = hemisphere === "UPPER_PROPHETIC" ? "Prophetic" : "Earthly";
    return `At: ${year} · ${label}`;
  }
  return null;
}

export function validateCommentAnchor(
  anchor: CommentAnchorInput
): { ok: true } | { ok: false; error: string } {
  const { milestoneId, pinnedDate, hemisphere } = anchor;

  if (milestoneId && (pinnedDate || hemisphere)) {
    return { ok: false, error: "Use milestone or timeline anchor, not both." };
  }

  if (pinnedDate) {
    if (!validatePinnedDate(pinnedDate)) {
      return { ok: false, error: "Invalid pinned date format." };
    }
    if (!hemisphere) {
      return { ok: false, error: "Hemisphere required for timeline anchor." };
    }
    if (
      hemisphere !== "UPPER_PROPHETIC" &&
      hemisphere !== "LOWER_EARTHLY"
    ) {
      return { ok: false, error: "Invalid hemisphere." };
    }
  }

  if (hemisphere && !pinnedDate && !milestoneId) {
    return { ok: false, error: "Hemisphere requires a timeline anchor." };
  }

  return { ok: true };
}
