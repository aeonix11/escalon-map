"use client";

import { useState } from "react";
import type { RssFeed } from "@/lib/schema";
import { inputClass } from "@/components/forms/formStyles";

interface FeedsTabProps {
  feeds: RssFeed[];
  onRefresh: () => void;
  expanded?: boolean;
}

function formatLastFetched(value: string | null): string {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString();
}

export default function FeedsTab({
  feeds,
  onRefresh,
  expanded = false,
}: FeedsTabProps) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [pollInterval, setPollInterval] = useState(60);
  const [fetching, setFetching] = useState(false);
  const [status, setStatus] = useState("");

  const handleAdd = async () => {
    if (!url || !label) return;
    await fetch("/api/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        url,
        label,
        pollIntervalMinutes: pollInterval,
      }),
    });
    setUrl("");
    setLabel("");
    onRefresh();
  };

  const handleFetchOne = async (feedId: string) => {
    setFetching(true);
    setStatus("Fetching...");
    const res = await fetch("/api/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "fetch-one", feedId, force: true }),
    });
    const data = await res.json();
    setStatus(
      data.error
        ? `Error: ${data.error}`
        : `Added ${data.added ?? 0} new signal(s)`
    );
    setFetching(false);
    onRefresh();
  };

  const handleFetchAll = async () => {
    setFetching(true);
    setStatus("Fetching all feeds...");
    const res = await fetch("/api/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "fetch-all", force: true }),
    });
    const data = await res.json();
    setStatus(`Added ${data.totalAdded ?? 0} new signal(s) total`);
    setFetching(false);
    onRefresh();
  };

  const handleRemove = async (feedId: string, feedLabel: string) => {
    if (!window.confirm(`Remove feed "${feedLabel}"?`)) return;
    await fetch("/api/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", feedId }),
    });
    onRefresh();
  };

  const mostRecentFetch = feeds.reduce<string | null>((latest, feed) => {
    if (!feed.lastFetched) return latest;
    if (!latest) return feed.lastFetched;
    return Date.parse(feed.lastFetched) > Date.parse(latest)
      ? feed.lastFetched
      : latest;
  }, null);

  const cardGridClass = expanded
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
    : "space-y-2";

  const addForm = (
    <div className="space-y-2">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Feed label (e.g. BBC World)"
        className={inputClass}
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="RSS feed URL"
        className={inputClass}
      />
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-slate-600">Poll every</label>
        <select
          value={pollInterval}
          onChange={(e) => setPollInterval(Number(e.target.value))}
          className={`${inputClass} flex-1`}
        >
          <option value={30}>30 min</option>
          <option value={60}>60 min</option>
          <option value={120}>2 hours</option>
          <option value={240}>4 hours</option>
        </select>
      </div>
      <button
        onClick={handleAdd}
        className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500"
      >
        Add Feed
      </button>
    </div>
  );

  const feedCards = (
    <>
      {feeds.length === 0 && (
        <p className="text-xs text-slate-500">
          No feeds yet. Add an RSS URL to start collecting news.
        </p>
      )}
      <div className={cardGridClass}>
        {feeds.map((feed) => (
          <div
            key={feed.id}
            className="rounded-lg border border-slate-200 bg-slate-50 p-2 h-full"
          >
            <p className="text-xs font-medium text-slate-800">{feed.label}</p>
            <p className="mt-0.5 text-[10px] text-slate-500 truncate">{feed.url}</p>
            <p className="mt-1 text-[10px] text-slate-500">
              Poll: every {feed.pollIntervalMinutes} min · Last:{" "}
              {formatLastFetched(feed.lastFetched)}
            </p>
            <div className="mt-2 flex gap-1">
              <button
                onClick={() => handleFetchOne(feed.id)}
                disabled={fetching}
                className="rounded bg-sky-600 px-2 py-0.5 text-[10px] text-white hover:bg-sky-500 disabled:opacity-50"
              >
                Fetch now
              </button>
              <button
                onClick={() => handleRemove(feed.id, feed.label)}
                className="rounded bg-red-100 px-2 py-0.5 text-[10px] text-red-700 hover:bg-red-200"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-slate-500">
            Last fetch: {formatLastFetched(mostRecentFetch)}
          </p>
          <button
            onClick={handleFetchAll}
            disabled={fetching || feeds.length === 0}
            className="rounded bg-sky-600 px-2 py-1 text-[10px] text-white hover:bg-sky-500 disabled:opacity-50"
          >
            Fetch All
          </button>
        </div>
        {status && (
          <p className="text-[10px] text-slate-600 bg-slate-50 rounded p-1 border border-slate-100">
            {status}
          </p>
        )}
      </div>

      {expanded ? (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="w-72 shrink-0 border-r border-slate-200 p-3 overflow-y-auto">
            {addForm}
          </div>
          <div className="flex-1 overflow-y-auto p-3">{feedCards}</div>
        </div>
      ) : (
        <>
          <div className="border-b border-slate-200 p-3">{addForm}</div>
          <div className="flex-1 overflow-y-auto p-3">{feedCards}</div>
        </>
      )}
    </div>
  );
}
