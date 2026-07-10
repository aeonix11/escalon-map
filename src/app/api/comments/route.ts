import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { comments, profiles, maps } from "@/lib/schema";
import { getDb } from "@/lib/db";
import { resolvePublicMapContext } from "@/lib/mapContext";
import { getSessionUser, requireSessionUser } from "@/lib/auth";

const MAX_COMMENT_LENGTH = 2000;

export async function GET(req: NextRequest) {
  const shareSlug = req.nextUrl.searchParams.get("shareSlug");
  if (!shareSlug) {
    return NextResponse.json({ error: "shareSlug required" }, { status: 400 });
  }

  const ctx = await resolvePublicMapContext(shareSlug);
  if (!ctx) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      userId: comments.userId,
      displayName: profiles.displayName,
      email: profiles.email,
    })
    .from(comments)
    .innerJoin(profiles, eq(comments.userId, profiles.id))
    .where(eq(comments.mapId, ctx.mapId))
    .orderBy(desc(comments.createdAt));

  return NextResponse.json({
    comments: rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt,
      userId: r.userId,
      authorName: r.displayName ?? r.email?.split("@")[0] ?? "User",
    })),
    mapId: ctx.mapId,
    mapName: ctx.map.name,
  });
}

export async function POST(req: NextRequest) {
  const user = await requireSessionUser();
  const body = await req.json();
  const shareSlug = body.shareSlug as string | undefined;
  const text = (body.body as string | undefined)?.trim();

  if (!shareSlug) {
    return NextResponse.json({ error: "shareSlug required" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  }
  if (text.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      { error: `Comment too long (max ${MAX_COMMENT_LENGTH} chars)` },
      { status: 400 }
    );
  }

  const ctx = await resolvePublicMapContext(shareSlug);
  if (!ctx || ctx.map.visibility !== "public") {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  const db = getDb();
  const id = crypto.randomUUID();
  await db.insert(comments).values({
    id,
    mapId: ctx.mapId,
    userId: user.id,
    body: text,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  const user = await requireSessionUser();
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const db = getDb();
  const [comment] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1);

  if (!comment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [map] = await db
    .select()
    .from(maps)
    .where(eq(maps.id, comment.mapId))
    .limit(1);

  const isOwner = map?.ownerId === user.id;
  const isAuthor = comment.userId === user.id;

  if (!isOwner && !isAuthor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(comments).where(eq(comments.id, id));
  return NextResponse.json({ ok: true });
}
