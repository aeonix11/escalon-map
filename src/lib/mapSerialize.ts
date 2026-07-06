import type { Narrative, Milestone, Fragment, Note } from "@/lib/schema";

function formatNoteLine(n: Note): string {
  const pin =
    n.pinnedDate && n.hemisphere
      ? `pinned: ${n.pinnedDate} ${n.hemisphere}`
      : "unpinned";
  const personal = n.isPersonal ? " | personal" : "";
  const body = n.content.trim() ? `: ${n.content}` : "";
  return `[${n.id}] ${n.title}${personal} | ${pin}${body}`;
}

export function serializeMapContext(
  allNarratives: Narrative[],
  allMilestones: Milestone[],
  allFragments: Fragment[],
  allNotes: Note[] = []
): string {
  let text = "=== NARRATIVES ===\n";
  for (const n of allNarratives) {
    text += `[${n.id}] ${n.title}: ${n.description ?? ""}\n`;
  }
  text += "\n=== MILESTONES ===\n";
  for (const m of allMilestones) {
    text += `[${m.id}] ${m.targetDate} | ${m.hemisphere} | ${m.title}: ${m.description ?? ""} (narrative: ${m.narrativeId ?? "none"})\n`;
  }
  text += "\n=== NOTES ===\n";
  if (allNotes.length === 0) {
    text += "(none)\n";
  } else {
    for (const n of allNotes) {
      text += `${formatNoteLine(n)}\n`;
    }
  }
  text += "\n=== FRAGMENTS ===\n";
  for (const f of allFragments) {
    text += `[${f.id}] ${f.speaker} @ ${f.timestampSeconds}s: ${f.rawText}\n`;
  }
  return text;
}

export function formatNoteForRetrieval(n: Note): string {
  return `[Note] ${formatNoteLine(n)}`;
}
