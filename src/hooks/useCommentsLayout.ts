import { useMemo } from "react";
import type { HemisphereType } from "@/lib/schema";
import {
  parseTargetDateFraction,
  type VisualMilestone,
} from "@/lib/types";
import type { MapComment } from "@/store/mapStore";

export interface VisualComment extends MapComment {
  leftPixel: number;
  hemisphere: HemisphereType;
  stackIndex: number;
}

const PIN_STAGGER = 14;

export function useCommentsLayout(
  comments: MapComment[],
  milestoneLayout: VisualMilestone[],
  zoomScale: number
): VisualComment[] {
  const baseWidthPerYear = zoomScale * 12;

  return useMemo(() => {
    const anchored = comments.filter(
      (c) =>
        c.milestoneId ||
        (c.pinnedDate && c.hemisphere)
    );

    const positionBuckets = new Map<string, number>();

    return anchored.map((c) => {
      let leftPixel: number;
      let hemisphere: HemisphereType;

      if (c.milestoneId) {
        const ms = milestoneLayout.find((m) => m.id === c.milestoneId);
        if (ms) {
          leftPixel = ms.leftPixel;
          hemisphere = ms.hemisphere;
        } else {
          leftPixel = 0;
          hemisphere = c.hemisphere ?? "LOWER_EARTHLY";
        }
      } else {
        leftPixel =
          parseTargetDateFraction(c.pinnedDate!) * baseWidthPerYear;
        hemisphere = c.hemisphere!;
      }

      const bucketKey = `${Math.round(leftPixel)}-${hemisphere}`;
      const stackIndex = positionBuckets.get(bucketKey) ?? 0;
      positionBuckets.set(bucketKey, stackIndex + 1);

      return {
        ...c,
        leftPixel: leftPixel + stackIndex * PIN_STAGGER,
        hemisphere,
        stackIndex,
      };
    });
  }, [comments, milestoneLayout, baseWidthPerYear]);
}
