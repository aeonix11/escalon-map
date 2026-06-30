import type { AppDatabase } from "./db";
import { narratives, milestones, fragments, aiNewsSignals } from "./schema";
import { nowIso } from "./types";

export async function seedIfEmpty(db: AppDatabase) {
  const existing = await db.select().from(narratives).limit(1);
  if (existing.length > 0) return;

  const n1 = crypto.randomUUID();
  const n2 = crypto.randomUUID();
  const n3 = crypto.randomUUID();

  await db.insert(narratives).values([
    {
      id: n1,
      title: "2026 Wealth Transfer",
      description:
        "A systemic shift in global capital flows, currency devaluation, and wealth redistribution beginning in 2026.",
      colorHex: "#f59e0b",
      createdAt: nowIso(),
    },
    {
      id: n2,
      title: "Beast System Financial Control",
      description:
        "Central bank digital currencies, biometric payment systems, and regulatory frameworks enabling total financial surveillance.",
      colorHex: "#8b5cf6",
      createdAt: nowIso(),
    },
    {
      id: n3,
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
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      timestampSeconds: 1485,
      speaker: "Prophet A",
      rawText:
        "The wealth transfer begins in 2026 — those who are positioned will see unprecedented gains while the unprepared face collapse.",
      createdAt: nowIso(),
    },
    {
      id: f2,
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      timestampSeconds: 2100,
      speaker: "Prophet A",
      rawText:
        "Digital currency mandates will roll out through regulatory acts — CLARITY, GENIUS — watch the Senate floor.",
      createdAt: nowIso(),
    },
  ]);

  await db.insert(milestones).values([
    {
      id: crypto.randomUUID(),
      narrativeId: n1,
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
      id: crypto.randomUUID(),
      narrativeId: n2,
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
      id: crypto.randomUUID(),
      narrativeId: n2,
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
      id: crypto.randomUUID(),
      narrativeId: n3,
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
      id: crypto.randomUUID(),
      narrativeId: n1,
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

  await db.insert(aiNewsSignals).values([
    {
      id: crypto.randomUUID(),
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
