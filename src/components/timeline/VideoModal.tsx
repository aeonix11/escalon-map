"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Fragment } from "@/lib/schema";
import { formatTimestamp } from "@/lib/types";

const ReactPlayer = dynamic(() => import("react-player/youtube"), {
  ssr: false,
});

interface VideoModalProps {
  url: string;
  fragments: Fragment[];
  onClose: () => void;
  onRefresh: () => void;
  readOnly?: boolean;
}

export default function VideoModal({
  url,
  fragments,
  onClose,
  onRefresh,
  readOnly = false,
}: VideoModalProps) {
  const playerRef = useRef<{
    seekTo: (amount: number, type?: "seconds" | "fraction") => void;
  } | null>(null);
  const [activeFragmentId, setActiveFragmentId] = useState(
    fragments[0]?.id ?? null
  );

  const seekTo = (seconds: number, fragmentId: string) => {
    setActiveFragmentId(fragmentId);
    playerRef.current?.seekTo(seconds, "seconds");
  };

  const handleDeleteFragment = async (fragmentId: string) => {
    if (!window.confirm("Delete this video fragment permanently?")) return;
    await fetch("/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "fragment", id: fragmentId }),
    });
    onRefresh();
    if (fragments.length <= 1) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl bg-white p-4 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Video Sources</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 text-sm"
          >
            Close
          </button>
        </div>

        <div className="aspect-video w-full overflow-hidden rounded-lg bg-slate-900">
          <ReactPlayer
            ref={playerRef}
            url={url}
            width="100%"
            height="100%"
            controls
          />
        </div>

        <ul className="mt-4 space-y-2 max-h-48 overflow-y-auto">
          {fragments.map((f) => (
            <li key={f.id} className="flex gap-2">
              <button
                onClick={() => seekTo(f.timestampSeconds, f.id)}
                className={`flex-1 rounded-lg p-2 text-left text-xs transition-colors border ${
                  activeFragmentId === f.id
                    ? "bg-amber-50 border-amber-300"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className="font-mono text-amber-600">
                  {formatTimestamp(f.timestampSeconds)}
                </span>
                <span className="ml-2 text-slate-700">{f.speaker}</span>
                <p className="mt-1 text-slate-600">{f.rawText}</p>
              </button>
              {!readOnly && (
                <button
                  onClick={() => handleDeleteFragment(f.id)}
                  className="self-start rounded px-2 py-1 text-[10px] text-red-600 hover:bg-red-50"
                  title="Delete fragment"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
