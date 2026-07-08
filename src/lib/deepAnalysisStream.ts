/** Regex that matches inline status markers emitted by streamMapDeepAnalysis. */
export const DEEP_STATUS_MARKER = /__STATUS__[^_]+__/g;

export function formatDeepStatus(status: string): string {
  if (status === "thinking") {
    return "Reasoning and planning (Fable/Sonnet 5 can take several minutes before text appears)…";
  }
  if (status.startsWith("search:")) {
    const [, count, max] = status.split(":");
    return `Web search ${count} of ${max}…`;
  }
  if (status.startsWith("model:")) {
    return `Starting ${status.slice("model:".length)} deep research…`;
  }
  return status;
}
