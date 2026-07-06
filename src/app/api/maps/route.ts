import { NextRequest, NextResponse } from "next/server";
import type { ExportData } from "@/lib/types";
import { addSnapshotMap } from "@/lib/maps";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = body as ExportData & {
    displayName?: string;
    ownerLabel?: string;
  };

  if (!data.narratives || !data.milestones) {
    return NextResponse.json(
      { error: "Invalid map file — missing timeline data." },
      { status: 400 }
    );
  }

  const ownerLabel =
    data.ownerLabel?.trim() ||
    body.ownerLabel?.trim() ||
    "Shared map";
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
