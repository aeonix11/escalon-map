import { eq } from "drizzle-orm";
import type { AppDatabase } from "@/lib/db";
import {
  narratives,
  milestones,
  fragments,
  fragmentNarratives,
  milestoneNarratives,
  aiNewsSignals,
  rssFeeds,
  notes,
  milestoneSuggestions,
} from "@/lib/schema";
import type { ExportData } from "@/lib/types";

type MilestoneNarrativeRow = {
  milestoneId: string;
  narrativeId: string;
};

/** Merge junction rows + legacy per-milestone narrative fields (v1 SQLite exports). */
export function collectMilestoneNarrativeRows(
  data: ExportData
): MilestoneNarrativeRow[] {
  const rows = new Map<string, MilestoneNarrativeRow>();

  const add = (milestoneId: unknown, narrativeId: unknown) => {
    if (typeof milestoneId !== "string" || typeof narrativeId !== "string") {
      return;
    }
    if (!milestoneId || !narrativeId) return;
    rows.set(`${milestoneId}:${narrativeId}`, { milestoneId, narrativeId });
  };

  for (const row of data.milestoneNarratives ?? []) {
    const legacy = row as MilestoneNarrativeRow & {
      milestone_id?: string;
      narrative_id?: string;
    };
    add(
      legacy.milestoneId ?? legacy.milestone_id,
      legacy.narrativeId ?? legacy.narrative_id
    );
  }

  for (const m of data.milestones ?? []) {
    const legacy = m as typeof m & {
      narrativeIds?: string[];
      narrativeId?: string | null;
      narrative_id?: string | null;
    };
    const ids =
      legacy.narrativeIds ??
      (legacy.narrativeId
        ? [legacy.narrativeId]
        : legacy.narrative_id
          ? [legacy.narrative_id]
          : []);
    for (const narrativeId of ids) {
      add(m.id, narrativeId);
    }
  }

  return [...rows.values()];
}

function toBool(value: unknown, fallback = false): boolean {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return true;
  }
  if (value === false || value === 0 || value === "0" || value === "false") {
    return false;
  }
  return fallback;
}

function normalizeImportedMilestone(
  m: ExportData["milestones"][number],
  mapId: string
) {
  const legacy = m as typeof m & {
    mapId?: string;
    narrativeIds?: string[];
    narrativeId?: string | null;
    narrative_id?: string | null;
    is_personal?: boolean | number | string;
    is_fuzzy?: boolean | number | string;
    is_speculative?: boolean | number | string;
    target_date?: string;
    fuzzy_range_months?: number;
    linked_fragment_id?: string | null;
    created_at?: string;
  };

  return {
    id: legacy.id,
    mapId,
    title: legacy.title,
    description: legacy.description ?? null,
    targetDate: legacy.targetDate ?? legacy.target_date!,
    isFuzzy: toBool(legacy.isFuzzy ?? legacy.is_fuzzy),
    fuzzyRangeMonths: legacy.fuzzyRangeMonths ?? legacy.fuzzy_range_months ?? 3,
    isPersonal: toBool(legacy.isPersonal ?? legacy.is_personal),
    isSpeculative: toBool(legacy.isSpeculative ?? legacy.is_speculative),
    hemisphere: legacy.hemisphere,
    linkedFragmentId: legacy.linkedFragmentId ?? legacy.linked_fragment_id ?? null,
    createdAt: legacy.createdAt ?? legacy.created_at ?? new Date().toISOString(),
  };
}

function normalizeImportedNote(n: NonNullable<ExportData["notes"]>[number], mapId: string) {
  const legacy = n as typeof n & {
    mapId?: string;
    is_personal?: boolean | number | string;
    pinned_date?: string | null;
    created_at?: string;
    updated_at?: string;
  };

  return {
    id: legacy.id,
    mapId,
    title: legacy.title ?? "Untitled",
    content: legacy.content ?? "",
    isPersonal: toBool(legacy.isPersonal ?? legacy.is_personal),
    pinnedDate: legacy.pinnedDate ?? legacy.pinned_date ?? null,
    hemisphere: legacy.hemisphere ?? null,
    createdAt: legacy.createdAt ?? legacy.created_at ?? new Date().toISOString(),
    updatedAt:
      legacy.updatedAt ??
      legacy.updated_at ??
      legacy.createdAt ??
      legacy.created_at ??
      new Date().toISOString(),
  };
}

export async function loadExportIntoDb(
  db: AppDatabase,
  mapId: string,
  data: ExportData
) {
  const milestoneNarrativeRows = collectMilestoneNarrativeRows(data);

  await db.transaction(async (tx) => {
    await tx.delete(aiNewsSignals).where(eq(aiNewsSignals.mapId, mapId));
    await tx.delete(notes).where(eq(notes.mapId, mapId));
    await tx
      .delete(milestoneSuggestions)
      .where(eq(milestoneSuggestions.mapId, mapId));
    await tx.delete(milestones).where(eq(milestones.mapId, mapId));
    await tx.delete(fragments).where(eq(fragments.mapId, mapId));
    await tx.delete(rssFeeds).where(eq(rssFeeds.mapId, mapId));
    await tx.delete(narratives).where(eq(narratives.mapId, mapId));

    for (const n of data.narratives ?? []) {
      const { mapId: _omit, ...rest } = n as typeof n & { mapId?: string };
      await tx.insert(narratives).values({ ...rest, mapId });
    }
    for (const f of data.fragments ?? []) {
      const { mapId: _omit, ...rest } = f as typeof f & { mapId?: string };
      await tx.insert(fragments).values({ ...rest, mapId });
    }
    for (const fn of data.fragmentNarratives ?? []) {
      const legacy = fn as typeof fn & {
        fragment_id?: string;
        narrative_id?: string;
      };
      await tx.insert(fragmentNarratives).values({
        fragmentId: fn.fragmentId ?? legacy.fragment_id!,
        narrativeId: fn.narrativeId ?? legacy.narrative_id!,
      });
    }

    for (const m of data.milestones ?? []) {
      await tx.insert(milestones).values(normalizeImportedMilestone(m, mapId));
    }

    if (milestoneNarrativeRows.length > 0) {
      await tx.insert(milestoneNarratives).values(milestoneNarrativeRows);
    }

    for (const s of data.aiNewsSignals ?? []) {
      const { mapId: _omit, ...rest } = s as typeof s & { mapId?: string };
      await tx.insert(aiNewsSignals).values({ ...rest, mapId });
    }
    for (const f of data.rssFeeds ?? []) {
      const { mapId: _omit, ...rest } = f as typeof f & { mapId?: string };
      await tx.insert(rssFeeds).values({ ...rest, mapId });
    }
    for (const n of data.notes ?? []) {
      await tx.insert(notes).values(normalizeImportedNote(n, mapId));
    }
    for (const s of data.milestoneSuggestions ?? []) {
      const { mapId: _omit, ...rest } = s as typeof s & { mapId?: string };
      await tx.insert(milestoneSuggestions).values({ ...rest, mapId });
    }
  });
}
