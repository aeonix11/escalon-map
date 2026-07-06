import { NextRequest, NextResponse } from "next/server";
import type { ExportData } from "@/lib/types";
import { addSnapshotMap } from "@/lib/maps";

const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > MAX_IMPORT_BYTES) {
    return NextResponse.json(
      { error: "Map file is too large (max 25 MB)." },
      { status: 413 }
    );
  }

  let body: ExportData & { displayName?: string; ownerLabel?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Invalid map file — not valid JSON." },
      { status: 400 }
    );
  }

  const data = body;

  if (!data.narratives || !data.milestones) {
    return NextResponse.json(
      { error: "Invalid map file — missing timeline data." },
      { status: 400 }
    );
  }

  if (data.version !== undefined && data.version !== 1) {
    return NextResponse.json(
      { error: "Unsupported map file version." },
      { status: 400 }
    );
  }

  if (!Array.isArray(data.narratives) || !Array.isArray(data.milestones)) {
    return NextResponse.json(
      { error: "Invalid map file — malformed timeline data." },
      { status: 400 }
    );
  }

  const ownerLabel =
    data.ownerLabel?.trim() || body.ownerLabel?.trim() || "Shared map";
  const displayName =
    data.displayName?.trim() ||
    body.displayName?.trim() ||
    `${ownerLabel}'s map`;

  const entry = addSnapshotMap(displayName, ownerLabel, data);
  return NextResponse.json({
    ok: true,
    map: {
      id: entry.id,
      name: entry.name,
      editable: entry.editable,
      ownerLabel: entry.ownerLabel,
      kind: entry.kind,
    },
  });
}
