import { eq } from "drizzle-orm";
import type { AppDatabase } from "./db";
import {
  narratives,
  milestones,
  milestoneNarratives,
  fragments,
  aiNewsSignals,
  rssFeeds,
} from "./schema";
import { nowIso } from "./types";

export async function seedIfEmpty(db: AppDatabase, mapId: string) {
  const feeds = await db
    .select()
    .from(rssFeeds)
    .where(eq(rssFeeds.mapId, mapId))
    .limit(1);
  if (feeds.length > 0) return;

  const existing = await db
    .select()
    .from(narratives)
    .where(eq(narratives.mapId, mapId))
    .limit(1);
  if (existing.length > 0) return;

  const n1 = crypto.randomUUID();
  const n2 = crypto.randomUUID();
  const n3 = crypto.randomUUID();

  await db.insert(narratives).values([
    {
      id: n1,
      mapId,
      title: "2026 Wealth Transfer",
      description:
        "A systemic shift in global capital flows, currency devaluation, and wealth redistribution beginning in 2026.",
      colorHex: "#f59e0b",
      createdAt: nowIso(),
    },
    {
      id: n2,
      mapId,
      title: "Beast System Financial Control",
      description:
        "Central bank digital currencies, biometric payment systems, and regulatory frameworks enabling total financial surveillance.",
      colorHex: "#8b5cf6",
      createdAt: nowIso(),
    },
    {
      id: n3,
      mapId,
      title: "Middle East Escalation",
      description:
        "Regional conflict expansion, supply chain disruption, and geopolitical realignment in the Levant.",
      colorHex: "#ef4444",
      createdAt: nowIso(),
    },
  ]);

  const f1 = crypto.randomUUID();
  const f2 = crypto.randomUUID();

  await db.insert(fragments).values([
    {
      id: f1,
      mapId,
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      timestampSeconds: 1485,
      speaker: "Prophet A",
      rawText:
        "The wealth transfer begins in 2026 — those who are positioned will see unprecedented gains while the unprepared face collapse.",
      createdAt: nowIso(),
    },
    {
      id: f2,
      mapId,
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      timestampSeconds: 2100,
      speaker: "Prophet A",
      rawText:
        "Digital currency mandates will roll out through regulatory acts — CLARITY, GENIUS — watch the Senate floor.",
      createdAt: nowIso(),
    },
  ]);

  const m1 = crypto.randomUUID();
  const m2 = crypto.randomUUID();
  const m3 = crypto.randomUUID();
  const m4 = crypto.randomUUID();
  const m5 = crypto.randomUUID();

  await db.insert(milestones).values([
    {
      id: m1,
      mapId,
      title: "Wealth Transfer Window Opens",
      description: "Initial capital flow shift predicted for mid-2026.",
      targetDate: "2026-06-15",
      isFuzzy: true,
      fuzzyRangeMonths: 6,
      hemisphere: "UPPER_PROPHETIC",
      linkedFragmentId: f1,
      createdAt: nowIso(),
    },
    {
      id: m2,
      mapId,
      title: "GENIUS Act Advances",
      description: "Stablecoin regulatory framework passes committee.",
      targetDate: "2026-03-01",
      isFuzzy: false,
      fuzzyRangeMonths: 3,
      hemisphere: "LOWER_EARTHLY",
      linkedFragmentId: null,
      createdAt: nowIso(),
    },
    {
      id: m3,
      mapId,
      title: "CBDC Pilot Expansion",
      description: "Central bank digital currency trials expand to 12 nations.",
      targetDate: "2027-09-01",
      isFuzzy: true,
      fuzzyRangeMonths: 4,
      hemisphere: "LOWER_EARTHLY",
      linkedFragmentId: null,
      createdAt: nowIso(),
    },
    {
      id: m4,
      mapId,
      title: "Regional Conflict Escalation",
      description: "Supply chain disruption across Red Sea corridor.",
      targetDate: "2026-11-01",
      isFuzzy: true,
      fuzzyRangeMonths: 3,
      hemisphere: "UPPER_PROPHETIC",
      linkedFragmentId: null,
      createdAt: nowIso(),
    },
    {
      id: m5,
      mapId,
      title: "Market Correction Peak",
      description: "Predicted correction window aligning with wealth transfer.",
      targetDate: "2028-03-01",
      isFuzzy: true,
      fuzzyRangeMonths: 6,
      hemisphere: "UPPER_PROPHETIC",
      linkedFragmentId: f2,
      createdAt: nowIso(),
    },
  ]);

  await db.insert(milestoneNarratives).values([
    { milestoneId: m1, narrativeId: n1 },
    { milestoneId: m2, narrativeId: n2 },
    { milestoneId: m3, narrativeId: n2 },
    { milestoneId: m4, narrativeId: n3 },
    { milestoneId: m5, narrativeId: n1 },
  ]);

  await db.insert(aiNewsSignals).values([
    {
      id: crypto.randomUUID(),
      mapId,
      title: "Senate Committee Advances Digital Asset Framework",
      summary:
        "The CLARITY Act moves to full Senate vote, establishing federal oversight of digital asset markets and stablecoin issuers.",
      sourceName: "Reuters",
      url: "https://example.com/clarity-act",
      publishedAt: "2026-02-15T00:00:00.000Z",
      status: "PENDING",
      createdAt: nowIso(),
    },
    {
      id: crypto.randomUUID(),
      mapId,
      title: "Global CBDC Coalition Announces 2027 Timeline",
      summary:
        "Twelve central banks commit to interoperable digital currency standards by Q3 2027.",
      sourceName: "Financial Times",
      url: "https://example.com/cbdc-coalition",
      publishedAt: "2026-01-20T00:00:00.000Z",
      status: "PENDING",
      createdAt: nowIso(),
    },
  ]);
}
