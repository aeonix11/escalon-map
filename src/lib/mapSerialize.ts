import type { Narrative, Milestone, Fragment } from "@/lib/schema";

export function serializeMapContext(
  allNarratives: Narrative[],
  allMilestones: Milestone[],
  allFragments: Fragment[]
): string {
  let text = "=== NARRATIVES ===\n";
  for (const n of allNarratives) {
    text += `[${n.id}] ${n.title}: ${n.description ?? ""}\n`;
  }
  text += "\n=== MILESTONES ===\n";
  for (const m of allMilestones) {
    text += `[${m.id}] ${m.targetDate} | ${m.hemisphere} | ${m.title}: ${m.description ?? ""} (narrative: ${m.narrativeId ?? "none"})\n`;
  }
  text += "\n=== FRAGMENTS ===\n";
  for (const f of allFragments) {
    text += `[${f.id}] ${f.speaker} @ ${f.timestampSeconds}s: ${f.rawText}\n`;
  }
  return text;
}
