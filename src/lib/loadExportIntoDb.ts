import type { Database as SqlJsDatabase } from "sql.js";
import type { AppDatabase } from "./db";
import {
  narratives,
  milestones,
  fragments,
  fragmentNarratives,
  aiNewsSignals,
  rssFeeds,
  notes,
} from "./schema";
import type { ExportData } from "./types";

export async function loadExportIntoDb(db: AppDatabase, data: ExportData) {
  await db.delete(aiNewsSignals);
  await db.delete(notes);
  await db.delete(milestones);
  await db.delete(fragmentNarratives);
  await db.delete(fragments);
  await db.delete(rssFeeds);
  await db.delete(narratives);

  for (const n of data.narratives ?? []) {
    await db.insert(narratives).values(n);
  }
  for (const f of data.fragments ?? []) {
    await db.insert(fragments).values(f);
  }
  for (const fn of data.fragmentNarratives ?? []) {
    await db.insert(fragmentNarratives).values(fn);
  }
  for (const m of data.milestones ?? []) {
    await db.insert(milestones).values(m);
  }
  for (const s of data.aiNewsSignals ?? []) {
    await db.insert(aiNewsSignals).values(s);
  }
  for (const f of data.rssFeeds ?? []) {
    await db.insert(rssFeeds).values(f);
  }
  for (const n of data.notes ?? []) {
    await db.insert(notes).values(n);
  }
}

export function loadExportIntoSqlite(sqlite: SqlJsDatabase, data: ExportData) {
  const insert = (sql: string, rows: Record<string, unknown>[]) => {
    if (rows.length === 0) return;
    const keys = Object.keys(rows[0]);
    const placeholders = keys.map(() => "?").join(", ");
    const stmt = sqlite.prepare(
      `INSERT INTO ${sql} (${keys.join(", ")}) VALUES (${placeholders})`
    );
    for (const row of rows) {
      stmt.run(keys.map((k) => row[k]));
    }
    stmt.free();
  };

  const narrativeRows = (data.narratives ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    description: n.description,
    color_hex: n.colorHex,
    embedding: n.embedding,
    created_at: n.createdAt,
  }));
  const fragmentRows = (data.fragments ?? []).map((f) => ({
    id: f.id,
    source_url: f.sourceUrl,
    timestamp_seconds: f.timestampSeconds,
    speaker: f.speaker,
    raw_text: f.rawText,
    embedding: f.embedding,
    created_at: f.createdAt,
  }));
  const milestoneRows = (data.milestones ?? []).map((m) => ({
    id: m.id,
    narrative_id: m.narrativeId,
    title: m.title,
    description: m.description,
    target_date: m.targetDate,
    is_fuzzy: m.isFuzzy ? 1 : 0,
    fuzzy_range_months: m.fuzzyRangeMonths,
    is_personal: m.isPersonal ? 1 : 0,
    is_speculative: m.isSpeculative ? 1 : 0,
    hemisphere: m.hemisphere,
    linked_fragment_id: m.linkedFragmentId,
    created_at: m.createdAt,
  }));
  const noteRows = (data.notes ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    is_personal: n.isPersonal ? 1 : 0,
    pinned_date: n.pinnedDate,
    hemisphere: n.hemisphere,
    created_at: n.createdAt,
    updated_at: n.updatedAt,
  }));

  insert("narratives", narrativeRows);
  insert("fragments", fragmentRows);
  insert(
    "fragment_narratives",
    (data.fragmentNarratives ?? []).map((fn) => ({
      fragment_id: fn.fragmentId,
      narrative_id: fn.narrativeId,
    }))
  );
  insert("milestones", milestoneRows);
  insert(
    "ai_news_signals",
    (data.aiNewsSignals ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      summary: s.summary,
      source_name: s.sourceName,
      url: s.url,
      published_at: s.publishedAt,
      embedding: s.embedding,
      status: s.status,
      matched_narrative_id: s.matchedNarrativeId,
      reasoning_note: s.reasoningNote,
      feed_id: s.feedId,
      created_at: s.createdAt,
    }))
  );
  insert(
    "rss_feeds",
    (data.rssFeeds ?? []).map((f) => ({
      id: f.id,
      url: f.url,
      label: f.label,
      poll_interval_minutes: f.pollIntervalMinutes,
      last_fetched: f.lastFetched,
      created_at: f.createdAt,
    }))
  );
  insert("notes", noteRows);
}
