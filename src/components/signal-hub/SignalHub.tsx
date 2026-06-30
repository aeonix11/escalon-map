"use client";

import { useState } from "react";
import type { AiNewsSignal, Narrative, RssFeed } from "@/lib/schema";
import InboxTab from "./InboxTab";
import FeedsTab from "./FeedsTab";
import HistoryTab from "./HistoryTab";

type HubTab = "inbox" | "feeds" | "history";

interface SignalHubProps {
  signals: AiNewsSignal[];
  feeds: RssFeed[];
  narratives: Narrative[];
  onRefresh: () => void;
}

export default function SignalHub({
  signals,
  feeds,
  narratives,
  onRefresh,
}: SignalHubProps) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<HubTab>("inbox");

  const pendingCount = signals.filter(
    (s) => s.status === "PENDING" || s.status === "MATCHED"
  ).length;

  const tabs: { id: HubTab; label: string }[] = [
    { id: "inbox", label: `Inbox (${pendingCount})` },
    { id: "feeds", label: `Feeds (${feeds.length})` },
    { id: "history", label: "History" },
  ];

  const panelClass = expanded
    ? "fixed inset-0 z-40 flex flex-col bg-white shadow-2xl"
    : "w-72 border-r border-slate-200 bg-white flex flex-col shadow-sm shrink-0";

  return (
    <aside className={panelClass}>
      <div className="border-b border-slate-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-slate-800">Signal Hub</h2>
            <p className="text-[10px] text-slate-500">
              {pendingCount} pending · {feeds.length} feeds
            </p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-200"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>

        <div className="mt-3 flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded px-2 py-1 text-[10px] transition-colors ${
                tab === t.id
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "inbox" && (
          <InboxTab
            signals={signals}
            narratives={narratives}
            onRefresh={onRefresh}
            expanded={expanded}
          />
        )}
        {tab === "feeds" && (
          <FeedsTab feeds={feeds} onRefresh={onRefresh} expanded={expanded} />
        )}
        {tab === "history" && (
          <HistoryTab
            signals={signals}
            narratives={narratives}
            expanded={expanded}
          />
        )}
      </div>
    </aside>
  );
}
