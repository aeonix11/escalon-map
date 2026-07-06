import type { MapHealthIssue, MapMilestoneSuggestion } from "@/lib/mapAnalysis";
import { parseStoredSources } from "@/lib/mapAnalysis";
import type { Milestone, MilestoneSuggestion, SuggestionTier } from "@/lib/schema";
import type { DeepModelChoice } from "@/lib/anthropic";
import { serializeMapContext } from "@/lib/mapSerialize";
import type { Fragment, Narrative, Note } from "@/lib/schema";

export function defaultMaxSearches(model: DeepModelChoice): number {
  if (model === "fable-5") return 8;
  if (model === "sonnet-5") return 6;
  return 5;
}

export function estimateContextTokens(
  narratives: Narrative[],
  milestones: Milestone[],
  fragments: Fragment[],
  notes: Note[],
  scopeNarrativeId: string | null,
  fragmentNarrativeIds: Set<string>
): number {
  let scopedNarratives = narratives;
  let scopedMilestones = milestones;
  let scopedFragments = fragments;

  if (scopeNarrativeId) {
    scopedNarratives = narratives.filter((n) => n.id === scopeNarrativeId);
    scopedMilestones = milestones.filter((m) => m.narrativeId === scopeNarrativeId);
    scopedFragments = fragments.filter((f) => fragmentNarrativeIds.has(f.id));
  }

  const text = serializeMapContext(
    scopedNarratives,
    scopedMilestones,
    scopedFragments,
    notes
  );
  return Math.ceil(text.length / 4);
}

export function formatTokenEstimate(tokens: number): string {
  if (tokens >= 1000) return `~${(tokens / 1000).toFixed(1)}k tokens`;
  return `~${tokens} tokens`;
}

export function getCostHint(
  mode: "quick" | "deep",
  model: DeepModelChoice,
  maxSearches: number
): string {
  if (mode === "quick") return "Est. ~$0.05–0.40 per run";
  if (model === "fable-5") {
    return `Est. ~$1.50–3.00+ (${maxSearches} searches max)`;
  }
  if (model === "sonnet-5") {
    return `Est. ~$0.60–1.80 (${maxSearches} searches max)`;
  }
  return `Est. ~$0.40–1.20 (${maxSearches} searches max)`;
}

export function formatModelLabel(model: string | null | undefined): string {
  if (!model) return "";
  if (model.includes("fable")) return "Fable 5";
  if (model.includes("sonnet-5") || model === "claude-sonnet-5") return "Sonnet 5";
  if (model.includes("sonnet")) return "Sonnet 4.6";
  return model;
}

export function formatRunLabel(
  mode: "quick" | "deep",
  model: string | null,
  scopeTitle: string | null
): string {
  const parts = [mode === "deep" ? "Deep research" : "Quick"];
  if (mode === "deep" && model) parts.push(formatModelLabel(model));
  if (scopeTitle) parts.push(scopeTitle);
  return parts.join(" · ");
}

const TIER_STYLES: Record<SuggestionTier, string> = {
  sourced: "bg-emerald-100 text-emerald-800",
  inferred: "bg-slate-100 text-slate-700",
  speculative: "bg-violet-100 text-violet-800 border border-dashed border-violet-300",
};

export function TierBadge({ tier }: { tier: SuggestionTier }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-px text-[9px] font-medium uppercase tracking-wide ${TIER_STYLES[tier]}`}
    >
      {tier}
    </span>
  );
}

const HEALTH_LABELS: Record<MapHealthIssue["type"], string> = {
  gap: "Gap",
  contradiction: "Contradiction",
  orphaned_narrative: "Orphaned narrative",
  overdue_confirmation: "Overdue confirmation",
};

export function HealthPanel({ issues }: { issues: MapHealthIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-slate-800">
        Map health ({issues.length})
      </h3>
      {issues.map((issue, i) => (
        <div
          key={`${issue.type}-${issue.title}-${i}`}
          className="rounded border border-amber-200 bg-amber-50/80 p-2 text-xs"
        >
          <p className="font-medium text-amber-900">
            {HEALTH_LABELS[issue.type]}: {issue.title}
          </p>
          {issue.description && (
            <p className="mt-1 text-amber-800">{issue.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function SourceLinks({
  sources,
}: {
  sources: { url: string; title: string }[];
}) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-1 space-y-0.5">
      {sources.map((s) => (
        <a
          key={s.url}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-[10px] text-sky-600 hover:underline"
        >
          ↗ {s.title || s.url}
        </a>
      ))}
    </div>
  );
}

function ConfirmsTag({
  milestoneId,
  milestones,
}: {
  milestoneId: string | null | undefined;
  milestones: Milestone[];
}) {
  if (!milestoneId) return null;
  const m = milestones.find((x) => x.id === milestoneId);
  if (!m) return null;
  return (
    <p className="mt-1 text-[10px] text-emerald-700">
      Confirms: {m.title}
    </p>
  );
}

export function ParsedSuggestionCard({
  suggestion,
  milestones,
}: {
  suggestion: MapMilestoneSuggestion;
  milestones: Milestone[];
}) {
  return (
    <div className="rounded border border-violet-200 bg-violet-50/50 p-2 text-xs">
      <div className="flex flex-wrap items-center gap-1">
        <span className="font-medium text-slate-900">{suggestion.title}</span>
        <span className="text-slate-500">· {suggestion.targetDate}</span>
        <TierBadge tier={suggestion.tier} />
      </div>
      <span className="text-[10px] text-slate-400">
        {suggestion.hemisphere === "UPPER_PROPHETIC" ? "Prophetic" : "Earthly"}
      </span>
      {suggestion.description && (
        <p className="mt-1 text-slate-600">{suggestion.description}</p>
      )}
      {suggestion.reasoning && (
        <p className="mt-1 text-[10px] text-violet-700">{suggestion.reasoning}</p>
      )}
      <SourceLinks sources={suggestion.sources} />
      <ConfirmsTag
        milestoneId={suggestion.confirmsMilestoneId}
        milestones={milestones}
      />
    </div>
  );
}

export function StoredSuggestionCard({
  suggestion,
  milestones,
  checked,
  onToggle,
  readOnly,
}: {
  suggestion: MilestoneSuggestion;
  milestones: Milestone[];
  checked?: boolean;
  onToggle?: () => void;
  readOnly?: boolean;
}) {
  const sources = parseStoredSources(suggestion.sourcesJson);
  const tier = (suggestion.tier ?? "inferred") as SuggestionTier;
  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-1">
        <span className="font-medium text-slate-900">{suggestion.title}</span>
        <span className="text-slate-500">· {suggestion.targetDate}</span>
        <TierBadge tier={tier} />
      </div>
      <span className="text-[10px] text-slate-400">
        {suggestion.hemisphere === "UPPER_PROPHETIC" ? "Prophetic" : "Earthly"}
      </span>
      {suggestion.description && (
        <p className="mt-1 text-slate-600">{suggestion.description}</p>
      )}
      {suggestion.reasoning && (
        <p className="mt-1 text-[10px] text-violet-700">{suggestion.reasoning}</p>
      )}
      <SourceLinks sources={sources} />
      <ConfirmsTag
        milestoneId={suggestion.confirmsMilestoneId}
        milestones={milestones}
      />
    </>
  );

  if (onToggle) {
    return (
      <label className="flex gap-2 rounded border border-violet-200 bg-violet-50/50 p-2 text-xs cursor-pointer hover:bg-violet-50">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          disabled={readOnly}
          className="mt-0.5"
        />
        <span className="min-w-0 flex-1">{inner}</span>
      </label>
    );
  }

  return (
    <div className="rounded border border-violet-200 bg-violet-50/50 p-2 text-xs">
      {inner}
    </div>
  );
}
