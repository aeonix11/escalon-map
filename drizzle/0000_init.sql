-- Escalon Map — Supabase Postgres schema
-- Run in Supabase SQL Editor or via: npm run db:push

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  narrative_focus_mode TEXT NOT NULL DEFAULT 'fade',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maps (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Map',
  visibility TEXT NOT NULL DEFAULT 'private',
  share_slug TEXT NOT NULL UNIQUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS narratives (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  color_hex TEXT NOT NULL DEFAULT '#3b82f6',
  embedding BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fragments (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  timestamp_seconds INTEGER NOT NULL,
  speaker TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  embedding BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fragment_narratives (
  fragment_id TEXT NOT NULL REFERENCES fragments(id) ON DELETE CASCADE,
  narrative_id TEXT NOT NULL REFERENCES narratives(id) ON DELETE CASCADE,
  PRIMARY KEY (fragment_id, narrative_id)
);

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date TEXT NOT NULL,
  is_fuzzy BOOLEAN NOT NULL DEFAULT FALSE,
  fuzzy_range_months INTEGER NOT NULL DEFAULT 3,
  is_personal BOOLEAN NOT NULL DEFAULT FALSE,
  is_speculative BOOLEAN NOT NULL DEFAULT FALSE,
  hemisphere TEXT NOT NULL,
  linked_fragment_id TEXT REFERENCES fragments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS milestone_narratives (
  milestone_id TEXT NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  narrative_id TEXT NOT NULL REFERENCES narratives(id) ON DELETE CASCADE,
  PRIMARY KEY (milestone_id, narrative_id)
);

CREATE TABLE IF NOT EXISTS rss_feeds (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT NOT NULL,
  poll_interval_minutes INTEGER NOT NULL DEFAULT 60,
  last_fetched TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  is_personal BOOLEAN NOT NULL DEFAULT FALSE,
  pinned_date TEXT,
  hemisphere TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS milestone_suggestions (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  narrative_id TEXT REFERENCES narratives(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date TEXT NOT NULL,
  is_fuzzy BOOLEAN NOT NULL DEFAULT FALSE,
  fuzzy_range_months INTEGER NOT NULL DEFAULT 3,
  hemisphere TEXT NOT NULL,
  reasoning TEXT,
  sources_json TEXT NOT NULL DEFAULT '[]',
  tier TEXT NOT NULL DEFAULT 'inferred',
  confirms_milestone_id TEXT REFERENCES milestones(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deep_analysis_runs (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  analysis_text TEXT NOT NULL,
  suggestions_json TEXT NOT NULL DEFAULT '[]',
  health_json TEXT NOT NULL DEFAULT '[]',
  model TEXT,
  mode TEXT NOT NULL DEFAULT 'quick',
  scope_narrative_id TEXT,
  suggestion_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_news_signals (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  source_name TEXT,
  url TEXT,
  published_at TIMESTAMPTZ,
  embedding BYTEA,
  status TEXT NOT NULL DEFAULT 'PENDING',
  matched_narrative_id TEXT REFERENCES narratives(id) ON DELETE SET NULL,
  reasoning_note TEXT,
  feed_id TEXT REFERENCES rss_feeds(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_narratives_map_id ON narratives(map_id);
CREATE INDEX IF NOT EXISTS idx_milestones_map_id ON milestones(map_id);
CREATE INDEX IF NOT EXISTS idx_fragments_map_id ON fragments(map_id);
CREATE INDEX IF NOT EXISTS idx_comments_map_id ON comments(map_id);
CREATE INDEX IF NOT EXISTS idx_maps_share_slug ON maps(share_slug);
