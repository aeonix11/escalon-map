"use client";

import { useState } from "react";
import { useMapStore } from "@/store/mapStore";
import { formatTimestamp } from "@/lib/types";
import { inputClass } from "@/components/forms/formStyles";
import type { Fragment } from "@/lib/schema";

interface DetailContextDrawerProps {
  onRefresh: () => void;
}

function fragmentLabel(f: Fragment): string {
  const preview =
    f.rawText.length > 35 ? `${f.rawText.slice(0, 35)}…` : f.rawText;
  return `${formatTimestamp(f.timestampSeconds)} · ${f.speaker} — ${preview}`;
}

export default function DetailContextDrawer({ onRefresh }: DetailContextDrawerProps) {
  const {
    selectedMilestoneId,
    milestones,
    narratives,
    fragments,
    setDrawerMode,
    setSelectedMilestoneId,
    openVideoModal,
  } = useMapStore();
  const [deleting, setDeleting] = useState(false);
  const [linkFragmentId, setLinkFragmentId] = useState("");
  const [linking, setLinking] = useState(false);

  const milestone = milestones.find((m) => m.id === selectedMilestoneId);
  const narrative = milestone?.narrativeId
    ? narratives.find((n) => n.id === milestone.narrativeId)
    : null;
  const linkedFragment = milestone?.linkedFragmentId
    ? fragments.find((f) => f.id === milestone.linkedFragmentId)
    : null;

  const relatedFragments = fragments.filter(
    (f) =>
      milestone?.linkedFragmentId === f.id ||
      (linkedFragment && f.sourceUrl === linkedFragment.sourceUrl)
  );

  const handleDeleteMilestone = async () => {
    if (!milestone) return;
    if (
      !window.confirm(
        `Delete milestone "${milestone.title}"? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "milestone", id: milestone.id }),
      });
      setSelectedMilestoneId(null);
      setDrawerMode(null);
      onRefresh();
    } finally {
      setDeleting(false);
    }
  };

  const handleLinkFragment = async (fragmentId: string | null) => {
    if (!milestone) return;
    setLinking(true);
    try {
      await fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "milestone",
          id: milestone.id,
          data: { linkedFragmentId: fragmentId },
        }),
      });
      setLinkFragmentId("");
      onRefresh();
    } finally {
      setLinking(false);
    }
  };

  if (!milestone) {
    return (
      <aside className="w-80 border-l border-slate-200 bg-white p-4 shadow-sm">
        <button
          onClick={() => setDrawerMode(null)}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          Close
        </button>
        <p className="mt-4 text-sm text-slate-500">
          Select a milestone to view details.
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-80 border-l border-slate-200 bg-white p-4 shadow-sm overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Milestone Detail</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDeleteMilestone}
            disabled={deleting}
            className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={() => setDrawerMode(null)}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Close
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div
          className="rounded border p-3 bg-white"
          style={{
            borderColor: narrative?.colorHex ?? "#cbd5e1",
            backgroundColor: (narrative?.colorHex ?? "#94a3b8") + "12",
          }}
        >
          <p className="text-xs text-slate-500">{milestone.targetDate}</p>
          <h3 className="font-medium text-slate-900">{milestone.title}</h3>
          {milestone.description && (
            <p className="mt-1 text-sm text-slate-600">{milestone.description}</p>
          )}
          {narrative && (
            <p className="mt-2 text-xs" style={{ color: narrative.colorHex }}>
              Narrative: {narrative.title}
            </p>
          )}
        </div>

        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <h4 className="text-xs font-medium text-slate-700">Video source</h4>
          {linkedFragment ? (
            <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2">
              <p className="text-[10px] font-medium text-amber-800">
                {formatTimestamp(linkedFragment.timestampSeconds)} · {linkedFragment.speaker}
              </p>
              <p className="mt-1 text-[10px] text-slate-600 line-clamp-2">
                {linkedFragment.rawText}
              </p>
              <button
                onClick={() =>
                  openVideoModal(
                    linkedFragment.sourceUrl,
                    relatedFragments.length > 0
                      ? relatedFragments
                      : [linkedFragment]
                  )
                }
                className="mt-2 text-[10px] text-sky-600 hover:underline"
              >
                Play at {formatTimestamp(linkedFragment.timestampSeconds)}
              </button>
            </div>
          ) : (
            <p className="mt-1 text-[10px] text-slate-500">No video linked yet.</p>
          )}

          {fragments.length > 0 ? (
            <div className="mt-2 space-y-2">
              <select
                value={linkFragmentId}
                onChange={(e) => setLinkFragmentId(e.target.value)}
                className={inputClass}
              >
                <option value="">Choose a fragment to link…</option>
                {fragments.map((f) => (
                  <option key={f.id} value={f.id}>
                    {fragmentLabel(f)}
                  </option>
                ))}
              </select>
              <div className="flex gap-1">
                <button
                  onClick={() => linkFragmentId && handleLinkFragment(linkFragmentId)}
                  disabled={!linkFragmentId || linking}
                  className="rounded bg-sky-600 px-2 py-1 text-[10px] text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {linking ? "Linking…" : linkedFragment ? "Change link" : "Link source"}
                </button>
                {linkedFragment && (
                  <button
                    onClick={() => handleLinkFragment(null)}
                    disabled={linking}
                    className="rounded bg-slate-200 px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                  >
                    Remove link
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[10px] text-slate-400">
              Add a video fragment via Add Data first.
            </p>
          )}
        </div>

        {relatedFragments.length > 1 && (
          <div>
            <h4 className="text-xs font-medium text-slate-600">
              Other clips from same video
            </h4>
            <ul className="mt-2 space-y-2">
              {relatedFragments
                .filter((f) => f.id !== linkedFragment?.id)
                .map((f) => (
                  <li key={f.id}>
                    <button
                      onClick={() =>
                        openVideoModal(
                          f.sourceUrl,
                          relatedFragments.filter(
                            (rf) => rf.sourceUrl === f.sourceUrl
                          )
                        )
                      }
                      className="w-full rounded border border-slate-200 bg-white p-2 text-left text-xs hover:bg-slate-100"
                    >
                      <span className="text-amber-600">
                        {formatTimestamp(f.timestampSeconds)}
                      </span>
                      <span className="ml-2 text-slate-700">{f.speaker}</span>
                      <p className="mt-1 text-slate-600 line-clamp-2">{f.rawText}</p>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
