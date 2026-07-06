import { useEffect, useRef } from "react";

/**
 * On app mount, fetch any RSS feeds that are stale (respecting per-feed intervals).
 * Background polling is handled by Windows Task Scheduler via poll-silent.vbs.
 */
export function useRssPoll(onRefresh: () => void) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const res = await fetch("/api/feeds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "fetch-all", force: false }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.totalAdded > 0) {
            onRefresh();
          }
        }
      } catch {
        // silent — catch-up is best-effort
      }
    })();
  }, [onRefresh]);
}
