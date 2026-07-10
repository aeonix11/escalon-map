import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and, gte, count } from "drizzle-orm";
import { comments, profiles, maps, milestones } from "@/lib/schema";
import type { HemisphereType } from "@/lib/schema";
import { getDb } from "@/lib/db";
import { resolveOwnerMapContext, resolvePublicMapContext } from "@/lib/mapContext";
import { getSessionUser, requireSessionUser } from "@/lib/auth";
import {
  buildAnchorLabel,
  validateCommentAnchor,
} from "@/lib/commentAnchors";

const MAX_COMMENT_LENGTH = 2000;
const MAX_COMMENTS_PER_MAP_PER_HOUR = 10;

function serializeComment(
  row: {
    id: string;
    body: string;
    createdAt: string;
    userId: string;
    milestoneId: string | null;
    pinnedDate: string | null;
    hemisphere: HemisphereType | null;
    displayName: string | null;
    email: string;
    milestoneTitle: string | null;
  }
) {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt,
    userId: row.userId,
    authorName: row.displayName ?? row.email?.split("@")[0] ?? "User",
    milestoneId: row.milestoneId,
    pinnedDate: row.pinnedDate,
    hemisphere: row.hemisphere,
    milestoneTitle: row.milestoneTitle,
    anchorLabel: buildAnchorLabel(
      row.milestoneId,
      row.milestoneTitle,
      row.pinnedDate,
      row.hemisphere
    ),
  };
}

async function fetchCommentsForMap(mapId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      userId: comments.userId,
      milestoneId: comments.milestoneId,
      pinnedDate: comments.pinnedDate,
      hemisphere: comments.hemisphere,
      displayName: profiles.displayName,
      email: profiles.email,
      milestoneTitle: milestones.title,
    })
    .from(comments)
    .innerJoin(profiles, eq(comments.userId, profiles.id))
    .leftJoin(milestones, eq(comments.milestoneId, milestones.id))
    .where(eq(comments.mapId, mapId))
    .orderBy(desc(comments.createdAt));

  return rows.map(serializeComment);
}

export async function GET(req: NextRequest) {
  const shareSlug = req.nextUrl.searchParams.get("shareSlug");
  const mapIdParam = req.nextUrl.searchParams.get("mapId");

  if (shareSlug) {
    const ctx = await resolvePublicMapContext(shareSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }
    const commentRows = await fetchCommentsForMap(ctx.mapId);
    return NextResponse.json({
      comments: commentRows,
      mapId: ctx.mapId,
      mapName: ctx.map.name,
    });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (mapIdParam) {
    const db = getDb();
    const [map] = await db
      .select()
      .from(maps)
      .where(eq(maps.id, mapIdParam))
      .limit(1);
    if (!map || map.ownerId !== user.id) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }
    const commentRows = await fetchCommentsForMap(map.id);
    return NextResponse.json({
      comments: commentRows,
      mapId: map.id,
      mapName: map.name,
    });
  }

  const ctx = await resolveOwnerMapContext();
  const commentRows = await fetchCommentsForMap(ctx.mapId);
  return NextResponse.json({
    comments: commentRows,
    mapId: ctx.mapId,
    mapName: ctx.map.name,
  });
}

export async function POST(req: NextRequest) {
  const user = await requireSessionUser();
  const body = await req.json();
  const shareSlug = body.shareSlug as string | undefined;
  const text = (body.body as string | undefined)?.trim();
  const milestoneId = (body.milestoneId as string | undefined) || null;
  const pinnedDate = (body.pinnedDate as string | undefined)?.trim() || null;
  const hemisphere = (body.hemisphere as HemisphereType | undefined) || null;

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

  const anchorCheck = validateCommentAnchor({
    milestoneId,
    pinnedDate,
    hemisphere,
  });
  if (!anchorCheck.ok) {
    return NextResponse.json({ error: anchorCheck.error }, { status: 400 });
  }

  const ctx = await resolvePublicMapContext(shareSlug);
  if (!ctx || ctx.map.visibility !== "public") {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  const db = getDb();

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [rateRow] = await db
    .select({ total: count() })
    .from(comments)
    .where(
      and(
        eq(comments.mapId, ctx.mapId),
        eq(comments.userId, user.id),
        gte(comments.createdAt, oneHourAgo)
      )
    );
  if ((rateRow?.total ?? 0) >= MAX_COMMENTS_PER_MAP_PER_HOUR) {
    return NextResponse.json(
      { error: "Comment limit reached. Try again in an hour." },
      { status: 429 }
    );
  }

  if (milestoneId) {
    const [ms] = await db
      .select()
      .from(milestones)
      .where(eq(milestones.id, milestoneId))
      .limit(1);
    if (!ms || ms.mapId !== ctx.mapId) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 400 });
    }
    if (ms.isPersonal) {
      return NextResponse.json(
        { error: "Cannot anchor comments to personal milestones." },
        { status: 400 }
      );
    }
  }

  const id = crypto.randomUUID();
  await db.insert(comments).values({
    id,
    mapId: ctx.mapId,
    userId: user.id,
    body: text,
    milestoneId,
    pinnedDate,
    hemisphere,
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
