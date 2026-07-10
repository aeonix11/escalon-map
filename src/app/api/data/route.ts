import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/lib/seed";
import { fetchMapPayload } from "@/lib/mapData";
import { resolveOwnerMapContext } from "@/lib/mapContext";

export async function GET() {
  const ctx = await resolveOwnerMapContext();
  await seedIfEmpty(ctx.db, ctx.mapId);
  const payload = await fetchMapPayload(ctx.mapId);

  return NextResponse.json({
    ...payload,
    map: {
      id: ctx.mapId,
      name: ctx.map.name,
      editable: ctx.editable,
      visibility: ctx.map.visibility,
      shareSlug: ctx.map.shareSlug,
      ownerLabel: null,
    },
  });
}
