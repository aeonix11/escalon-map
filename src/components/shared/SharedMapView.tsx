"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMapStore } from "@/store/mapStore";
import TimelineCanvas from "@/components/timeline/TimelineCanvas";
import MapIntelligencePanel from "@/components/ai-feed/MapIntelligencePanel";
import CommentsPanel from "@/components/comments/CommentsPanel";
import NarrativeFilterBar from "@/components/shared/NarrativeFilterBar";
import type { AiNewsSignal, RssFeed } from "@/lib/schema";

interface SharedMapViewProps {
  shareSlug: string;
}

export default function SharedMapView({ shareSlug }: SharedMapViewProps) {
  const {
    setData,
    setMapContext,
    setNarrativeFocusMode,
    drawerMode,
    setDrawerMode,
    activeMapName,
    readOnly,
    viewerLoggedIn,
    narratives,
    activeNarrativeId,
    setActiveNarrativeId,
  } = useMapStore();

  const [signals, setSignals] = useState<AiNewsSignal[]>([]);
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/public/${shareSlug}`);
      if (!res.ok) {
        setLoadError("This shared map could not be found or is private.");
        return;
      }
      const data = await res.json();
      setData({
        narratives: data.narratives,
        milestones: data.milestones,
        milestoneSuggestions: data.milestoneSuggestions ?? [],
        fragments: data.fragments,
        notes: data.notes ?? [],
      });
      setSignals(data.signals ?? []);
      setFeeds(data.feeds ?? []);
      setMapContext({
        activeMapId: data.map.id,
        activeMapName: data.map.name,
        readOnly: true,
        shareSlug: data.map.shareSlug,
        visibility: data.map.visibility,
        availableMaps: [],
        viewerLoggedIn: Boolean(data.viewer),
      });
      if (data.narrativeFocusMode) {
        setNarrativeFocusMode(data.narrativeFocusMode);
      }
    };
    load();
  }, [shareSlug, setData, setMapContext, setNarrativeFocusMode]);

  return (
    <div className="flex h-screen w-full flex-col bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold tracking-wide text-slate-900">
            {activeMapName}
          </h1>
          <p className="text-xs text-slate-500">Shared map · view only · 2012–2075</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setDrawerMode(drawerMode === "comments" ? null : "comments")
            }
            className="rounded bg-sky-100 px-3 py-1.5 text-xs text-sky-800 hover:bg-sky-200"
          >
            Comments
          </button>
          <button
            onClick={() =>
              setDrawerMode(drawerMode === "intelligence" ? null : "intelligence")
            }
            className="rounded bg-violet-100 px-3 py-1.5 text-xs text-violet-700 hover:bg-violet-200"
          >
            Map Intelligence
          </button>
          {!viewerLoggedIn ? (
            <Link
              href={`/login?next=/m/${shareSlug}`}
              className="rounded bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700"
            >
              Log in to comment
            </Link>
          ) : (
            <Link
              href="/"
              className="rounded bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
            >
              My map
            </Link>
          )}
        </div>
      </header>

      {!loadError && (
        <NarrativeFilterBar
          narratives={narratives}
          activeNarrativeId={activeNarrativeId}
          onSelect={setActiveNarrativeId}
        />
      )}

      {loadError && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-center text-xs text-red-900">
          {loadError}
        </div>
      )}

      {!loadError && (
        <div className="relative flex flex-1 overflow-hidden">
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1">
              <TimelineCanvas />
            </div>
          </main>
          {drawerMode === "intelligence" && (
            <MapIntelligencePanel onRefresh={() => {}} readOnly={readOnly} />
          )}
          {drawerMode === "comments" && (
            <CommentsPanel mode="viewer" shareSlug={shareSlug} />
          )}
        </div>
      )}
    </div>
  );
}
