import {
  pgTable,
  text,
  integer,
  boolean,
  customType,
  timestamp,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const pgBytea = customType<{ data: Buffer | null; driverData: Buffer | null }>({
  dataType() {
    return "bytea";
  },
});

export type HemisphereType = "UPPER_PROPHETIC" | "LOWER_EARTHLY";
export type SignalStatus = "PENDING" | "ACCEPTED" | "DISMISSED" | "MATCHED";
export type MapVisibility = "private" | "public";
export type SuggestionTier = "sourced" | "inferred" | "speculative";
export type DeepAnalysisMode = "quick" | "deep";

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  narrativeFocusMode: text("narrative_focus_mode")
    .$type<"fade" | "hide">()
    .notNull()
    .default("fade"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const maps = pgTable(
  "maps",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("My Map"),
    visibility: text("visibility")
      .$type<MapVisibility>()
      .notNull()
      .default("private"),
    shareSlug: text("share_slug").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("maps_owner_id_unique").on(t.ownerId)]
);

export const narratives = pgTable("narratives", {
  id: text("id").primaryKey(),
  mapId: text("map_id")
    .notNull()
    .references(() => maps.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  colorHex: text("color_hex").notNull().default("#3b82f6"),
  embedding: pgBytea("embedding"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const fragments = pgTable("fragments", {
  id: text("id").primaryKey(),
  mapId: text("map_id")
    .notNull()
    .references(() => maps.id, { onDelete: "cascade" }),
  sourceUrl: text("source_url").notNull(),
  timestampSeconds: integer("timestamp_seconds").notNull(),
  speaker: text("speaker").notNull(),
  rawText: text("raw_text").notNull(),
  embedding: pgBytea("embedding"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const fragmentNarratives = pgTable(
  "fragment_narratives",
  {
    fragmentId: text("fragment_id")
      .notNull()
      .references(() => fragments.id, { onDelete: "cascade" }),
    narrativeId: text("narrative_id")
      .notNull()
      .references(() => narratives.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.fragmentId, t.narrativeId] })]
);

export const milestones = pgTable("milestones", {
  id: text("id").primaryKey(),
  mapId: text("map_id")
    .notNull()
    .references(() => maps.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: text("target_date").notNull(),
  isFuzzy: boolean("is_fuzzy").notNull().default(false),
  fuzzyRangeMonths: integer("fuzzy_range_months").notNull().default(3),
  isPersonal: boolean("is_personal").notNull().default(false),
  isSpeculative: boolean("is_speculative").notNull().default(false),
  hemisphere: text("hemisphere").$type<HemisphereType>().notNull(),
  linkedFragmentId: text("linked_fragment_id").references(() => fragments.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const milestoneNarratives = pgTable(
  "milestone_narratives",
  {
    milestoneId: text("milestone_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    narrativeId: text("narrative_id")
      .notNull()
      .references(() => narratives.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.milestoneId, t.narrativeId] })]
);

export const rssFeeds = pgTable("rss_feeds", {
  id: text("id").primaryKey(),
  mapId: text("map_id")
    .notNull()
    .references(() => maps.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  label: text("label").notNull(),
  pollIntervalMinutes: integer("poll_interval_minutes").notNull().default(60),
  lastFetched: timestamp("last_fetched", {
    withTimezone: true,
    mode: "string",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  mapId: text("map_id")
    .notNull()
    .references(() => maps.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Untitled"),
  content: text("content").notNull().default(""),
  isPersonal: boolean("is_personal").notNull().default(false),
  pinnedDate: text("pinned_date"),
  hemisphere: text("hemisphere").$type<HemisphereType>(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const milestoneSuggestions = pgTable("milestone_suggestions", {
  id: text("id").primaryKey(),
  mapId: text("map_id")
    .notNull()
    .references(() => maps.id, { onDelete: "cascade" }),
  narrativeId: text("narrative_id").references(() => narratives.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: text("target_date").notNull(),
  isFuzzy: boolean("is_fuzzy").notNull().default(false),
  fuzzyRangeMonths: integer("fuzzy_range_months").notNull().default(3),
  hemisphere: text("hemisphere").$type<HemisphereType>().notNull(),
  reasoning: text("reasoning"),
  sourcesJson: text("sources_json").notNull().default("[]"),
  tier: text("tier").$type<SuggestionTier>().notNull().default("inferred"),
  confirmsMilestoneId: text("confirms_milestone_id").references(
    () => milestones.id,
    { onDelete: "set null" }
  ),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const deepAnalysisRuns = pgTable("deep_analysis_runs", {
  id: text("id").primaryKey(),
  mapId: text("map_id")
    .notNull()
    .references(() => maps.id, { onDelete: "cascade" }),
  analysisText: text("analysis_text").notNull(),
  suggestionsJson: text("suggestions_json").notNull().default("[]"),
  healthJson: text("health_json").notNull().default("[]"),
  model: text("model"),
  mode: text("mode").$type<DeepAnalysisMode>().notNull().default("quick"),
  scopeNarrativeId: text("scope_narrative_id"),
  suggestionCount: integer("suggestion_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const aiNewsSignals = pgTable("ai_news_signals", {
  id: text("id").primaryKey(),
  mapId: text("map_id")
    .notNull()
    .references(() => maps.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary"),
  sourceName: text("source_name"),
  url: text("url"),
  publishedAt: timestamp("published_at", {
    withTimezone: true,
    mode: "string",
  }),
  embedding: pgBytea("embedding"),
  status: text("status").$type<SignalStatus>().notNull().default("PENDING"),
  matchedNarrativeId: text("matched_narrative_id").references(
    () => narratives.id,
    { onDelete: "set null" }
  ),
  reasoningNote: text("reasoning_note"),
  feedId: text("feed_id").references(() => rssFeeds.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const comments = pgTable("comments", {
  id: text("id").primaryKey(),
  mapId: text("map_id")
    .notNull()
    .references(() => maps.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type Map = typeof maps.$inferSelect;
export type Narrative = typeof narratives.$inferSelect;
export type Fragment = typeof fragments.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type MilestoneSuggestion = typeof milestoneSuggestions.$inferSelect;
export type DeepAnalysisRun = typeof deepAnalysisRuns.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type RssFeed = typeof rssFeeds.$inferSelect;
export type AiNewsSignal = typeof aiNewsSignals.$inferSelect;
export type Comment = typeof comments.$inferSelect;

/** Client-facing milestone with joined narrative ids */
export type MilestoneWithNarratives = Milestone & {
  narrativeIds: string[];
};
