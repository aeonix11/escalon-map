import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { maps, profiles } from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

function generateShareSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 12; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireSessionUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export async function ensureProfile(user: User) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (existing) return existing;

  try {
    const [created] = await db
      .insert(profiles)
      .values({
        id: user.id,
        email: user.email ?? "",
        displayName:
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email?.split("@")[0] ??
          "User",
      })
      .returning();

    return created;
  } catch (error) {
    if (isUniqueViolation(error)) {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1);
      if (profile) return profile;
    }
    throw error;
  }
}

export async function ensureUserMap(userId: string) {
  const db = getDb();
  const existing = await getUserMap(userId);
  if (existing) return existing;

  try {
    const [created] = await db
      .insert(maps)
      .values({
        id: crypto.randomUUID(),
        ownerId: userId,
        name: "My Map",
        visibility: "private",
        shareSlug: generateShareSlug(),
      })
      .returning();

    return created;
  } catch (error) {
    if (isUniqueViolation(error)) {
      const map = await getUserMap(userId);
      if (map) return map;
    }
    throw error;
  }
}

export async function getUserMap(userId: string) {
  const db = getDb();
  const [map] = await db
    .select()
    .from(maps)
    .where(eq(maps.ownerId, userId))
    .limit(1);
  return map ?? null;
}

export async function getMapByShareSlug(shareSlug: string) {
  const db = getDb();
  const [map] = await db
    .select()
    .from(maps)
    .where(eq(maps.shareSlug, shareSlug))
    .limit(1);
  return map ?? null;
}

export async function bootstrapUser(user: User) {
  await ensureProfile(user);
  return ensureUserMap(user.id);
}
