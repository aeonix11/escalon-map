import { NextResponse } from "next/server";
import { fetchMapPayload } from "@/lib/mapData";
import { resolvePublicMapContext } from "@/lib/mapContext";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareSlug: string }> }
) {
  const { shareSlug } = await params;
  const ctx = await resolvePublicMapContext(shareSlug);

  if (!ctx) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  const payload = await fetchMapPayload(ctx.mapId);
  const user = await getSessionUser();

  return NextResponse.json({
    ...payload,
    map: {
      id: ctx.mapId,
      name: ctx.map.name,
      editable: false,
      visibility: ctx.map.visibility,
      shareSlug: ctx.map.shareSlug,
      ownerLabel: null,
    },
    viewer: user
      ? { id: user.id, email: user.email }
      : null,
  });
}
