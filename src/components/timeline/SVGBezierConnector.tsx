"use client";

import type { VisualMilestone, ZoomLevel } from "@/lib/types";
import { PIN_OFFSET, getLaneOffset, pixelsToViewBoxY } from "@/lib/types";

interface SVGBezierConnectorProps {
  milestones: VisualMilestone[];
  narrativeColor: string;
  canvasWidth: number;
  canvasHeight: number;
  zoomLevel: ZoomLevel;
}

const VIEW_HEIGHT = 1000;

export default function SVGBezierConnector({
  milestones,
  narrativeColor,
  canvasWidth,
  canvasHeight,
  zoomLevel,
}: SVGBezierConnectorProps) {
  const sorted = [...milestones].sort((a, b) => a.leftPixel - b.leftPixel);

  if (sorted.length < 2) return null;

  const centerY = VIEW_HEIGHT / 2;
  const centerPx = canvasHeight / 2;

  const pathParts: string[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];

    const fromOffset = getLaneOffset(from.lane, zoomLevel);
    const toOffset = getLaneOffset(to.lane, zoomLevel);

    const x1 = from.leftPixel + PIN_OFFSET;
    const y1 =
      from.hemisphere === "UPPER_PROPHETIC"
        ? pixelsToViewBoxY(centerPx - fromOffset, canvasHeight)
        : pixelsToViewBoxY(centerPx + fromOffset, canvasHeight);
    const x2 = to.leftPixel + PIN_OFFSET;
    const y2 =
      to.hemisphere === "UPPER_PROPHETIC"
        ? pixelsToViewBoxY(centerPx - toOffset, canvasHeight)
        : pixelsToViewBoxY(centerPx + toOffset, canvasHeight);

    const cx1 = x1 + (x2 - x1) * 0.4;
    const cx2 = x1 + (x2 - x1) * 0.6;

    pathParts.push(
      `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`
    );
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[6]"
      width={canvasWidth}
      height="100%"
      viewBox={`0 0 ${canvasWidth} ${VIEW_HEIGHT}`}
      preserveAspectRatio="none"
    >
      <path
        d={pathParts.join(" ")}
        fill="none"
        stroke={narrativeColor}
        strokeWidth="2"
        strokeOpacity="0.45"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
