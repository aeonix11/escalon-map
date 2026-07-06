import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";

export type HemisphereType = "UPPER_PROPHETIC" | "LOWER_EARTHLY";
export type SignalStatus = "PENDING" | "ACCEPTED" | "DISMISSED" | "MATCHED";

export const narratives = sqliteTable("narratives", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  colorHex: text("color_hex").notNull().default("#3b82f6"),
  embedding: blob("embedding", { mode: "buffer" }),
  createdAt: text("created_at").notNull(),
});

export const fragments = sqliteTable("fragments", {
  id: text("id").primaryKey(),
  sourceUrl: text("source_url").notNull(),
  timestampSeconds: integer("timestamp_seconds").notNull(),
  speaker: text("speaker").notNull(),
  rawText: text("raw_text").notNull(),
  embedding: blob("embedding", { mode: "buffer" }),
  createdAt: text("created_at").notNull(),
});

export const fragmentNarratives = sqliteTable("fragment_narratives", {
  fragmentId: text("fragment_id")
    .notNull()
    .references(() => fragments.id, { onDelete: "cascade" }),
  narrativeId: text("narrative_id")
    .notNull()
    .references(() => narratives.id, { onDelete: "cascade" }),
});

export const milestones = sqliteTable("milestones", {
  id: text("id").primaryKey(),
  narrativeId: text("narrative_id").references(() => narratives.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: text("target_date").notNull(),
  isFuzzy: integer("is_fuzzy", { mode: "boolean" }).notNull().default(false),
  fuzzyRangeMonths: integer("fuzzy_range_months").notNull().default(3),
  isPersonal: integer("is_personal", { mode: "boolean" }).notNull().default(false),
  hemisphere: text("hemisphere").$type<HemisphereType>().notNull(),
  linkedFragmentId: text("linked_fragment_id").references(() => fragments.id, {
    onDelete: "set null",
  }),
  createdAt: text("created_at").notNull(),
});

export const rssFeeds = sqliteTable("rss_feeds", {
  id: text("id").primaryKey(),
  url: text("url").notNull().unique(),
  label: text("label").notNull(),
  pollIntervalMinutes: integer("poll_interval_minutes").notNull().default(60),
  lastFetched: text("last_fetched"),
  createdAt: text("created_at").notNull(),
});

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("Untitled"),
  content: text("content").notNull().default(""),
  isPersonal: integer("is_personal", { mode: "boolean" }).notNull().default(false),
  pinnedDate: text("pinned_date"),
  hemisphere: text("hemisphere").$type<HemisphereType>(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type SuggestionTier = "sourced" | "inferred" | "speculative";
export type DeepAnalysisMode = "quick" | "deep";

export const milestoneSuggestions = sqliteTable("milestone_suggestions", {
  id: text("id").primaryKey(),
  narrativeId: text("narrative_id").references(() => narratives.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: text("target_date").notNull(),
  isFuzzy: integer("is_fuzzy", { mode: "boolean" }).notNull().default(false),
  fuzzyRangeMonths: integer("fuzzy_range_months").notNull().default(3),
  hemisphere: text("hemisphere").$type<HemisphereType>().notNull(),
  reasoning: text("reasoning"),
  sourcesJson: text("sources_json").notNull().default("[]"),
  tier: text("tier").$type<SuggestionTier>().notNull().default("inferred"),
  confirmsMilestoneId: text("confirms_milestone_id").references(
    () => milestones.id,
    { onDelete: "set null" }
  ),
  createdAt: text("created_at").notNull(),
});

export const deepAnalysisRuns = sqliteTable("deep_analysis_runs", {
  id: text("id").primaryKey(),
  analysisText: text("analysis_text").notNull(),
  suggestionsJson: text("suggestions_json").notNull().default("[]"),
  healthJson: text("health_json").notNull().default("[]"),
  model: text("model"),
  mode: text("mode").$type<DeepAnalysisMode>().notNull().default("quick"),
  scopeNarrativeId: text("scope_narrative_id"),
  suggestionCount: integer("suggestion_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const aiNewsSignals = sqliteTable("ai_news_signals", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  sourceName: text("source_name"),
  url: text("url").unique(),
  publishedAt: text("published_at"),
  embedding: blob("embedding", { mode: "buffer" }),
  status: text("status").$type<SignalStatus>().notNull().default("PENDING"),
  matchedNarrativeId: text("matched_narrative_id").references(
    () => narratives.id,
    { onDelete: "set null" }
  ),
  reasoningNote: text("reasoning_note"),
  feedId: text("feed_id").references(() => rssFeeds.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
});

export type Narrative = typeof narratives.$inferSelect;
export type Fragment = typeof fragments.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type MilestoneSuggestion = typeof milestoneSuggestions.$inferSelect;
export type DeepAnalysisRun = typeof deepAnalysisRuns.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type RssFeed = typeof rssFeeds.$inferSelect;
export type AiNewsSignal = typeof aiNewsSignals.$inferSelect;
