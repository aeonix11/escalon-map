"use client";

import type { VisualNote } from "@/lib/types";
import {
  PIN_OFFSET,
  getLaneOffset,
  pixelsToViewBoxY,
} from "@/lib/types";
import type { ZoomLevel } from "@/lib/types";

interface NoteAnchorLinesProps {
  notes: VisualNote[];
  canvasWidth: number;
  canvasHeight: number;
  zoomLevel: ZoomLevel;
  highlightedNoteId: string | null;
}

const VIEW_HEIGHT = 1000;

function noteColor(n: VisualNote): string {
  return n.hemisphere === "UPPER_PROPHETIC" ? "#f59e0b" : "#0ea5e9";
}

function NoteConnectorGroup({
  n,
  centerY,
  centerPx,
  canvasHeight,
  zoomLevel,
  highlighted,
  dimmed,
}: {
  n: VisualNote;
  centerY: number;
  centerPx: number;
  canvasHeight: number;
  zoomLevel: ZoomLevel;
  highlighted: boolean;
  dimmed: boolean;
}) {
  const color = noteColor(n);
  const pinX = n.leftPixel + PIN_OFFSET;
  const offsetPx = getLaneOffset(n.lane, zoomLevel);
  const isUpper = n.hemisphere === "UPPER_PROPHETIC";

  const cardEdgePx = isUpper ? centerPx - offsetPx : centerPx + offsetPx;
  const cardEdgeY = pixelsToViewBoxY(cardEdgePx, canvasHeight);

  const groupOpacity = highlighted ? 1 : dimmed ? 0.15 : 1;
  const hStroke = highlighted ? 5 : 3;
  const vStroke = highlighted ? 2.5 : 1.5;
  const dotR = highlighted ? 6 : 4;
  const halfTick = highlighted ? 18 : 14;

  return (
    <g
      opacity={groupOpacity}
      style={
        highlighted
          ? { filter: "drop-shadow(0 1px 3px rgba(15,23,42,0.35))" }
          : undefined
      }
    >
      <line
        x1={pinX - halfTick}
        y1={centerY}
        x2={pinX + halfTick}
        y2={centerY}
        stroke={color}
        strokeWidth={hStroke}
        strokeOpacity={highlighted ? 1 : 0.85}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={pinX}
        y1={centerY}
        x2={pinX}
        y2={cardEdgeY}
        stroke={color}
        strokeWidth={vStroke}
        strokeOpacity={highlighted ? 0.95 : 0.6}
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

export default function NoteAnchorLines({
  notes,
  canvasWidth,
  canvasHeight,
  zoomLevel,
  highlightedNoteId,
}: NoteAnchorLinesProps) {
  const centerY = VIEW_HEIGHT / 2;
  const centerPx = canvasHeight / 2;

  const baseNotes = highlightedNoteId
    ? notes.filter((n) => n.id !== highlightedNoteId)
    : notes;
  const highlightedNote = highlightedNoteId
    ? notes.find((n) => n.id === highlightedNoteId)
    : null;

  return (
    <svg
      className={`absolute inset-0 pointer-events-none ${
        highlightedNoteId ? "z-[13]" : "z-[11]"
      }`}
      width={canvasWidth}
      height="100%"
      viewBox={`0 0 ${canvasWidth} ${VIEW_HEIGHT}`}
      preserveAspectRatio="none"
    >
      {baseNotes.map((n) => (
        <NoteConnectorGroup
          key={n.id}
          n={n}
          centerY={centerY}
          centerPx={centerPx}
          canvasHeight={canvasHeight}
          zoomLevel={zoomLevel}
          highlighted={false}
          dimmed={highlightedNoteId !== null}
        />
      ))}
      {highlightedNote && (
        <NoteConnectorGroup
          key={`${highlightedNote.id}-highlight`}
          n={highlightedNote}
          centerY={centerY}
          centerPx={centerPx}
          canvasHeight={canvasHeight}
          zoomLevel={zoomLevel}
          highlighted
          dimmed={false}
        />
      )}
    </svg>
  );
}
