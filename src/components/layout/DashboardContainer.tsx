"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMapStore } from "@/store/mapStore";
import TimelineCanvas from "@/components/timeline/TimelineCanvas";
import DetailContextDrawer from "@/components/layout/DetailContextDrawer";
import SignalHub from "@/components/signal-hub/SignalHub";
import MapIntelligencePanel from "@/components/ai-feed/MapIntelligencePanel";
import VideoModal from "@/components/timeline/VideoModal";
import AddNarrativeForm from "@/components/forms/AddNarrativeForm";
import AddMilestoneForm from "@/components/forms/AddMilestoneForm";
import AddFragmentForm from "@/components/forms/AddFragmentForm";
import NotesPanel from "@/components/notes/NotesPanel";
import { useRssPoll } from "@/hooks/useRssPoll";
import type { AiNewsSignal, RssFeed } from "@/lib/schema";

export default function DashboardContainer() {
  const {
    zoomScale,
    setZoomScale,
    setData,
    setMapContext,
    drawerMode,
    setDrawerMode,
    videoModalOpen,
    closeVideoModal,
    videoModalUrl,
    videoModalFragments,
    activeNarrativeId,
    setActiveNarrativeId,
    hidePersonalMilestones,
    toggleHidePersonalMilestones,
    narratives,
    milestones,
    fragments,
    notes,
    activeMapName,
    readOnly,
  } = useMapStore();

  const [signals, setSignals] = useState<AiNewsSignal[]>([]);
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [showForms, setShowForms] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = () => setRefreshKey((k) => k + 1);

  const loadSettings = async () => {
    const res = await fetch("/api/settings");
    if (!res.ok) {
      setLoadError("Could not load settings. Try refreshing the page.");
      return;
    }
    const data = await res.json();
    const activeMap =
      data.maps.find((m: { id: string }) => m.id === data.activeMapId) ??
      data.maps[0];
    setMapContext({
      activeMapId: data.activeMapId,
      activeMapName: activeMap?.name ?? "My Map",
      readOnly: data.readOnly,
      availableMaps: data.maps,
    });
  };

  const loadData = async () => {
    const res = await fetch("/api/data");
    if (!res.ok) {
      setLoadError("Could not load your map data. Try refreshing the page.");
      return;
    }
    const data = await res.json();
    if (!Array.isArray(data.narratives) || !Array.isArray(data.milestones)) {
      setLoadError("Map data looks corrupted. Try restarting the app.");
      return;
    }
    setLoadError(null);
    setData({
      narratives: data.narratives,
      milestones: data.milestones,
      milestoneSuggestions: data.milestoneSuggestions ?? [],
      fragments: data.fragments,
      notes: data.notes ?? [],
    });
    setSignals(data.signals);
    setFeeds(data.feeds ?? []);
    if (data.map) {
      setMapContext({
        activeMapId: data.map.id,
        activeMapName: data.map.name,
        readOnly: !data.map.editable,
        availableMaps: useMapStore.getState().availableMaps,
      });
    }
  };

  useEffect(() => {
    loadSettings().then(loadData);
  }, [refreshKey]);

  useRssPoll(readOnly ? () => {} : refresh);

  const personalMilestoneCount = milestones.filter((m) => m.isPersonal).length;
  const personalNoteCount = notes.filter((n) => n.isPersonal).length;
  const personalItemCount = personalMilestoneCount + personalNoteCount;

  const handleDeleteNarrative = async (narrativeId: string, title: string) => {
    if (readOnly) return;
    if (
      !window.confirm(
        `Delete narrative "${title}"? Linked milestones stay on the map but lose this narrative color.`
      )
    ) {
      return;
    }
    await fetch("/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "narrative", id: narrativeId }),
    });
    if (activeNarrativeId === narrativeId) {
      setActiveNarrativeId(null);
    }
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold tracking-wide text-slate-900">
            Escalon Map
          </h1>
          <p className="text-xs text-slate-500">
            {activeMapName}
            {readOnly ? " · view only" : " · your map"} · 2012–2075
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600" title="Ctrl + scroll wheel to zoom">
              Zoom
            </label>
            <input
              type="range"
              min={1}
              max={100}
              value={zoomScale}
              onChange={(e) => setZoomScale(Number(e.target.value))}
              className="w-32 accent-sky-500"
            />
            <span className="text-xs text-slate-500">{zoomScale}</span>
          </div>

          <div className="flex gap-1">
            {narratives.map((n) => (
              <div key={n.id} className="group relative flex items-center">
                <button
                  onClick={() => setActiveNarrativeId(n.id)}
                  className={`rounded px-2 py-1 text-xs transition-all ${
                    activeNarrativeId === n.id
                      ? "ring-2 ring-slate-400/50"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: n.colorHex + "40", color: n.colorHex }}
                >
                  {n.title}
                </button>
                {!readOnly && (
                  <button
                    onClick={() => handleDeleteNarrative(n.id, n.title)}
                    className="ml-0.5 hidden rounded px-1 text-[10px] text-red-600 hover:bg-red-50 group-hover:inline"
                    title="Delete narrative"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {!readOnly && (
            <button
              onClick={() => setShowForms(!showForms)}
              className="rounded bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
            >
              {showForms ? "Hide Forms" : "Add Data"}
            </button>
          )}
          {!readOnly && (
            <button
              onClick={() =>
                setDrawerMode(drawerMode === "notes" ? null : "notes")
              }
              className={`rounded px-3 py-1.5 text-xs ${
                drawerMode === "notes"
                  ? "bg-amber-200 text-amber-900 ring-2 ring-amber-300"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              Notes
            </button>
          )}
          <button
            onClick={() =>
              setDrawerMode(drawerMode === "intelligence" ? null : "intelligence")
            }
            className="rounded bg-violet-100 px-3 py-1.5 text-xs text-violet-700 hover:bg-violet-200"
          >
            Map Intelligence
          </button>
          <button
            onClick={toggleHidePersonalMilestones}
            disabled={personalItemCount === 0}
            title={
              personalItemCount === 0
                ? "No personal milestones or notes to hide"
                : hidePersonalMilestones
                  ? "Show personal milestones and notes on the timeline"
                  : "Hide personal milestones and notes from the timeline"
            }
            className={`rounded px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
              hidePersonalMilestones
                ? "bg-violet-200 text-violet-900 ring-2 ring-violet-300"
                : "bg-violet-50 text-violet-800 hover:bg-violet-100"
            }`}
          >
            {hidePersonalMilestones ? "Show personal" : "Hide personal"}
            {personalItemCount > 0 && (
              <span className="ml-1 opacity-70">({personalItemCount})</span>
            )}
          </button>
          <Link
            href="/settings"
            className="rounded bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700"
          >
            Settings
          </Link>
        </div>
      </header>

      {readOnly && (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-center text-xs text-amber-900">
          You are viewing a shared map — read only. Switch to <strong>My Map</strong> in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>{" "}
          to edit your own timeline.
        </div>
      )}

      {loadError && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-center text-xs text-red-900">
          {loadError}
        </div>
      )}

      <div className="relative flex flex-1 overflow-hidden">
        <SignalHub
          signals={signals}
          feeds={feeds}
          narratives={narratives}
          onRefresh={refresh}
          readOnly={readOnly}
        />

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {showForms && !readOnly && (
            <div className="grid grid-cols-3 gap-3 border-b border-slate-200 bg-white p-4 shrink-0">
              <AddNarrativeForm onCreated={() => setRefreshKey((k) => k + 1)} />
              <AddMilestoneForm
                narratives={narratives}
                fragments={fragments}
                onCreated={() => setRefreshKey((k) => k + 1)}
              />
              <AddFragmentForm
                narratives={narratives}
                onCreated={() => setRefreshKey((k) => k + 1)}
              />
            </div>
          )}
          <div className="min-h-0 flex-1">
            <TimelineCanvas />
          </div>
        </main>

        {drawerMode === "detail" && !readOnly && (
          <DetailContextDrawer onRefresh={refresh} />
        )}
        {drawerMode === "intelligence" && (
          <MapIntelligencePanel onRefresh={loadData} readOnly={readOnly} />
        )}
        {drawerMode === "notes" && (
          <NotesPanel onRefresh={refresh} readOnly={readOnly} />
        )}
      </div>

      {videoModalOpen && videoModalUrl && (
        <VideoModal
          url={videoModalUrl}
          fragments={videoModalFragments}
          onClose={closeVideoModal}
          onRefresh={refresh}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
