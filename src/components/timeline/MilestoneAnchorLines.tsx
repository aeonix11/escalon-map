"use client";

import type { VisualMilestone } from "@/lib/types";
import {
  PIN_OFFSET,
  getLaneOffset,
  pixelsToViewBoxY,
} from "@/lib/types";
import type { ZoomLevel } from "@/lib/types";

interface MilestoneAnchorLinesProps {
  milestones: VisualMilestone[];
  canvasWidth: number;
  canvasHeight: number;
  zoomLevel: ZoomLevel;
  highlightedMilestoneId: string | null;
}

const VIEW_HEIGHT = 1000;

function milestoneColor(m: VisualMilestone): string {
  return (
    m.narrativeColor ??
    (m.hemisphere === "UPPER_PROPHETIC" ? "#f59e0b" : "#0ea5e9")
  );
}

function MilestoneConnectorGroup({
  m,
  centerY,
  centerPx,
  canvasHeight,
  zoomLevel,
  highlighted,
  dimmed,
}: {
  m: VisualMilestone;
  centerY: number;
  centerPx: number;
  canvasHeight: number;
  zoomLevel: ZoomLevel;
  highlighted: boolean;
  dimmed: boolean;
}) {
  const color = milestoneColor(m);
  const pinX = m.leftPixel + PIN_OFFSET;
  const offsetPx = getLaneOffset(m.lane, zoomLevel);
  const isUpper = m.hemisphere === "UPPER_PROPHETIC";

  const cardEdgePx = isUpper ? centerPx - offsetPx : centerPx + offsetPx;
  const cardEdgeY = pixelsToViewBoxY(cardEdgePx, canvasHeight);

  const groupOpacity = highlighted
    ? 1
    : dimmed
      ? m.opacity * 0.15
      : m.opacity;

  const hStroke = highlighted ? 6 : 4;
  const vStroke = highlighted ? 3 : 2;
  const capStroke = highlighted ? 3.5 : 2.5;
  const dotR = highlighted ? 7 : 5;
  const bandOpacity = highlighted ? 0.38 : 0.22;
  const vOpacity = highlighted ? 0.95 : 0.65;
  const hOpacity = highlighted ? 1 : 0.9;

  const isFuzzy =
    m.isFuzzy && m.fuzzyLeftPixel != null && m.fuzzyWidth != null;

  if (isFuzzy) {
    const x1 = m.fuzzyLeftPixel!;
    const x2 = m.fuzzyLeftPixel! + m.fuzzyWidth!;
    const capHeight = highlighted ? 20 : 16;

    return (
      <g
        opacity={groupOpacity}
        style={highlighted ? { filter: "drop-shadow(0 1px 3px rgba(15,23,42,0.35))" } : undefined}
      >
        <rect
          x={x1}
          y={centerY - (highlighted ? 9 : 7)}
          width={x2 - x1}
          height={highlighted ? 18 : 14}
          fill={color}
          fillOpacity={bandOpacity}
          rx={4}
        />
        <line
          x1={x1}
          y1={centerY}
          x2={x2}
          y2={centerY}
          stroke={color}
          strokeWidth={hStroke}
          strokeOpacity={hOpacity}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={x1}
          y1={centerY - capHeight / 2}
          x2={x1}
          y2={centerY + capHeight / 2}
          stroke={color}
          strokeWidth={capStroke + (highlighted ? 1 : 0.5)}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={x2}
          y1={centerY - capHeight / 2}
          x2={x2}
          y2={centerY + capHeight / 2}
          stroke={color}
          strokeWidth={capStroke}
          strokeOpacity={0.85}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={pinX}
          y1={centerY}
          x2={pinX}
          y2={cardEdgeY}
          stroke={color}
          strokeWidth={vStroke}
          strokeOpacity={vOpacity}
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={pinX}
          cy={centerY}
          r={dotR}
          fill={color}
          stroke="white"
          strokeWidth={highlighted ? 2.5 : 2}
        />
      </g>
    );
  }

  const halfTick = highlighted ? 22 : 16;

  return (
    <g
      opacity={groupOpacity}
      style={highlighted ? { filter: "drop-shadow(0 1px 3px rgba(15,23,42,0.35))" } : undefined}
    >
      <line
        x1={pinX - halfTick}
        y1={centerY}
        x2={pinX + halfTick}
        y2={centerY}
        stroke={color}
        strokeWidth={hStroke}
        strokeOpacity={hOpacity}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={pinX}
        y1={centerY}
        x2={pinX}
        y2={cardEdgeY}
        stroke={color}
        strokeWidth={vStroke}
        strokeOpacity={vOpacity}
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={pinX}
        cy={centerY}
        r={dotR}
        fill={color}
        stroke="white"
        strokeWidth={highlighted ? 2.5 : 2}
      />
    </g>
  );
}

export default function MilestoneAnchorLines({
  milestones,
  canvasWidth,
  canvasHeight,
  zoomLevel,
  highlightedMilestoneId,
}: MilestoneAnchorLinesProps) {
  const centerY = VIEW_HEIGHT / 2;
  const centerPx = canvasHeight / 2;

  const baseMilestones = highlightedMilestoneId
    ? milestones.filter((m) => m.id !== highlightedMilestoneId)
    : milestones;
  const highlightedMilestone = highlightedMilestoneId
    ? milestones.find((m) => m.id === highlightedMilestoneId)
    : null;

  return (
    <svg
      className={`absolute inset-0 pointer-events-none ${
        highlightedMilestoneId ? "z-[13]" : "z-[11]"
      }`}
      width={canvasWidth}
      height="100%"
      viewBox={`0 0 ${canvasWidth} ${VIEW_HEIGHT}`}
      preserveAspectRatio="none"
    >
      {baseMilestones.map((m) => (
        <MilestoneConnectorGroup
          key={m.id}
          m={m}
          centerY={centerY}
          centerPx={centerPx}
          canvasHeight={canvasHeight}
          zoomLevel={zoomLevel}
          highlighted={false}
          dimmed={highlightedMilestoneId !== null}
        />
      ))}
      {highlightedMilestone && (
        <MilestoneConnectorGroup
          key={`${highlightedMilestone.id}-highlight`}
          m={highlightedMilestone}
          centerY={centerY}
          centerPx={centerPx}
          canvasHeight={canvasHeight}
          zoomLevel={zoomLevel}
          highlighted={true}
          dimmed={false}
        />
      )}
    </svg>
  );
}
