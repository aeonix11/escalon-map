import { NextRequest, NextResponse } from "next/server";
import type { ExportData } from "@/lib/types";
import { loadExportIntoDb } from "@/lib/loadExportIntoDb";
import { resolveOwnerMapContext } from "@/lib/mapContext";

const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveOwnerMapContext();
    if (!ctx.editable) {
      return NextResponse.json({ error: "Read-only map" }, { status: 403 });
    }

    const raw = await req.text();
    if (raw.length > MAX_IMPORT_BYTES) {
      return NextResponse.json(
        { error: "Map file is too large (max 25 MB)." },
        { status: 413 }
      );
    }

    let body: ExportData;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Invalid map file — not valid JSON." },
        { status: 400 }
      );
    }

    if (!body.narratives || !body.milestones) {
      return NextResponse.json(
        { error: "Invalid map file — missing timeline data." },
        { status: 400 }
      );
    }

    if (
      body.version !== undefined &&
      body.version !== 1 &&
      body.version !== 2
    ) {
      return NextResponse.json(
        { error: "Unsupported map file version." },
        { status: 400 }
      );
    }

    await loadExportIntoDb(ctx.db, ctx.mapId, body);

    return NextResponse.json({
      ok: true,
      map: {
        id: ctx.mapId,
        name: ctx.map.name,
        editable: true,
      },
    });
  } catch (error) {
    console.error("Import failed:", error);
    return NextResponse.json(
      { error: "Import failed — the server could not load this map file." },
      { status: 500 }
    );
  }
}
