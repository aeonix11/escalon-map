"use client";

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
import { useRssPoll } from "@/hooks/useRssPoll";
import type { AiNewsSignal, RssFeed } from "@/lib/schema";

export default function DashboardContainer() {
  const {
    zoomScale,
    setZoomScale,
    setData,
    drawerMode,
    setDrawerMode,
    videoModalOpen,
    closeVideoModal,
    videoModalUrl,
    videoModalFragments,
    activeNarrativeId,
    setActiveNarrativeId,
    narratives,
    fragments,
  } = useMapStore();

  const [signals, setSignals] = useState<AiNewsSignal[]>([]);
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [showForms, setShowForms] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  const loadData = async () => {
    const res = await fetch("/api/data");
    const data = await res.json();
    setData({
      narratives: data.narratives,
      milestones: data.milestones,
      fragments: data.fragments,
    });
    setSignals(data.signals);
    setFeeds(data.feeds ?? []);
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  useRssPoll(refresh);

  const handleExport = async () => {
    const res = await fetch("/api/export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `escalon-map-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, mode: "merge" }),
    });
    setRefreshKey((k) => k + 1);
  };

  const handleDeleteNarrative = async (narrativeId: string, title: string) => {
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
            Prophecy &amp; narrative workspace · 2026–2075
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Zoom</label>
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
                <button
                  onClick={() => handleDeleteNarrative(n.id, n.title)}
                  className="ml-0.5 hidden rounded px-1 text-[10px] text-red-600 hover:bg-red-50 group-hover:inline"
                  title="Delete narrative"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowForms(!showForms)}
            className="rounded bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
          >
            {showForms ? "Hide Forms" : "Add Data"}
          </button>
          <button
            onClick={() =>
              setDrawerMode(drawerMode === "intelligence" ? null : "intelligence")
            }
            className="rounded bg-violet-100 px-3 py-1.5 text-xs text-violet-700 hover:bg-violet-200"
          >
            Map Intelligence
          </button>
          <button
            onClick={handleExport}
            className="rounded bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
          >
            Export
          </button>
          <label className="cursor-pointer rounded bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200">
            Import
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </label>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <SignalHub
          signals={signals}
          feeds={feeds}
          narratives={narratives}
          onRefresh={refresh}
        />

        <main className="flex-1 overflow-hidden">
          {showForms && (
            <div className="grid grid-cols-3 gap-3 border-b border-slate-200 bg-white p-4">
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
          <TimelineCanvas />
        </main>

        {drawerMode === "detail" && <DetailContextDrawer onRefresh={refresh} />}
        {drawerMode === "intelligence" && <MapIntelligencePanel />}
      </div>

      {videoModalOpen && videoModalUrl && (
        <VideoModal
          url={videoModalUrl}
          fragments={videoModalFragments}
          onClose={closeVideoModal}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
