"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMapStore, type MapComment, type CommentAnchorMode } from "@/store/mapStore";

interface CommentsPanelProps {
  mode: "owner" | "viewer";
  shareSlug?: string;
  mapId?: string;
  onCommentCountChange?: (count: number) => void;
}

export default function CommentsPanel({
  mode,
  shareSlug,
  mapId,
  onCommentCountChange,
}: CommentsPanelProps) {
  const [comments, setComments] = useState<MapComment[]>([]);
  const [mapName, setMapName] = useState("");
  const [body, setBody] = useState("");
  const [loggedIn, setLoggedIn] = useState<boolean | null>(mode === "owner" ? true : null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const {
    milestones,
    commentAnchorMode,
    pendingCommentAnchor,
    focusedCommentId,
    setMapComments,
    setCommentAnchorMode,
    setPendingCommentAnchor,
    scrollToComment,
  } = useMapStore();

  const commentsUrl =
    mode === "viewer" && shareSlug
      ? `/api/comments?shareSlug=${encodeURIComponent(shareSlug)}`
      : mapId
        ? `/api/comments?mapId=${encodeURIComponent(mapId)}`
        : "/api/comments";

  const loadComments = async () => {
    const res = await fetch(commentsUrl);
    if (!res.ok) return;
    const data = await res.json();
    const rows: MapComment[] = data.comments ?? [];
    setComments(rows);
    setMapComments(rows);
    setMapName(data.mapName ?? "");
    onCommentCountChange?.(rows.length);
  };

  useEffect(() => {
    loadComments();
    if (mode === "viewer") {
      fetch("/api/settings")
        .then((r) => setLoggedIn(r.ok))
        .catch(() => setLoggedIn(false));
    }
  }, [shareSlug, mapId, mode]);

  useEffect(() => {
    if (!focusedCommentId) return;
    const el = itemRefs.current[focusedCommentId];
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusedCommentId]);

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !shareSlug) return;

    if (commentAnchorMode === "timeline" && !pendingCommentAnchor?.pinnedDate) {
      setMessage("Click the map to place your comment pin first.");
      return;
    }
    if (commentAnchorMode === "milestone" && !pendingCommentAnchor?.milestoneId) {
      setMessage("Select a milestone to attach your comment.");
      return;
    }

    setLoading(true);
    setMessage(null);

    const payload: Record<string, string | null> = {
      shareSlug,
      body: body.trim(),
    };
    if (pendingCommentAnchor?.milestoneId) {
      payload.milestoneId = pendingCommentAnchor.milestoneId;
    }
    if (pendingCommentAnchor?.pinnedDate) {
      payload.pinnedDate = pendingCommentAnchor.pinnedDate;
      payload.hemisphere = pendingCommentAnchor.hemisphere ?? null;
    }

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (res.status === 401) {
      setMessage("Log in to leave a comment.");
      return;
    }
    if (!res.ok) {
      const err = await res.json();
      setMessage(err.error ?? "Could not post comment.");
      return;
    }
    setBody("");
    setCommentAnchorMode("general");
    setPendingCommentAnchor(null);
    await loadComments();
  };

  const deleteComment = async (id: string) => {
    const res = await fetch("/api/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) await loadComments();
  };

  const handleAnchorModeChange = (next: CommentAnchorMode) => {
    setCommentAnchorMode(next);
    if (next === "general") {
      setPendingCommentAnchor(null);
    } else if (next === "milestone") {
      setPendingCommentAnchor(null);
    } else {
      setPendingCommentAnchor(null);
    }
  };

  const handleCommentClick = (c: MapComment) => {
    const hasAnchor =
      c.milestoneId || (c.pinnedDate && c.hemisphere);
    if (!hasAnchor) return;
    scrollToComment(c.id);
  };

  const visibleMilestones = milestones.filter((m) => !m.isPersonal);

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Comments</h2>
        <p className="text-xs text-slate-500">
          {mapName || (mode === "owner" ? "Your map" : "Shared map")}
        </p>
        {mode === "owner" && (
          <p className="mt-1 text-[10px] text-slate-500">
            Feedback from viewers on your shared map. Click a pinned comment to jump to its location.
          </p>
        )}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {comments.length === 0 && (
          <p className="text-xs text-slate-500">No comments yet.</p>
        )}
        {comments.map((c) => {
          const hasAnchor =
            c.milestoneId || (c.pinnedDate && c.hemisphere);
          const isFocused = focusedCommentId === c.id;
          return (
            <div
              key={c.id}
              ref={(el) => {
                itemRefs.current[c.id] = el;
              }}
              onClick={() => handleCommentClick(c)}
              className={`rounded-lg border p-3 transition-colors ${
                hasAnchor ? "cursor-pointer hover:border-sky-200" : ""
              } ${
                isFocused
                  ? "border-sky-400 bg-sky-50 ring-1 ring-sky-200"
                  : "border-slate-100 bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-700">{c.authorName}</p>
                <p className="text-[10px] text-slate-400">
                  {new Date(c.createdAt).toLocaleString()}
                </p>
              </div>
              {c.anchorLabel && (
                <p className="mt-1 text-[10px] font-medium text-sky-700">
                  {c.anchorLabel}
                </p>
              )}
              <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{c.body}</p>
              {loggedIn && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteComment(c.id);
                  }}
                  className="mt-2 text-[10px] text-red-600 hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
          );
        })}
      </div>

      {mode === "viewer" && (
        <div className="border-t border-slate-100 p-4">
          {loggedIn === false && (
            <p className="mb-2 text-xs text-slate-600">
              <Link
                href={`/login?next=/m/${shareSlug}`}
                className="underline"
              >
                Log in
              </Link>{" "}
              to leave a comment.
            </p>
          )}
          {loggedIn && (
            <form onSubmit={postComment} className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ["general", "General"],
                    ["timeline", "Pin to map"],
                    ["milestone", "On milestone"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleAnchorModeChange(value)}
                    className={`rounded px-2 py-1 text-[10px] ${
                      commentAnchorMode === value
                        ? "bg-sky-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {commentAnchorMode === "timeline" && (
                <p className="text-[10px] text-sky-700">
                  {pendingCommentAnchor?.pinnedDate
                    ? `Pinned at ${pendingCommentAnchor.label ?? pendingCommentAnchor.pinnedDate}`
                    : "Click the timeline to place your comment pin."}
                </p>
              )}

              {commentAnchorMode === "milestone" && (
                <div className="space-y-1">
                  <p className="text-[10px] text-sky-700">
                    {pendingCommentAnchor?.milestoneId
                      ? `Attached to ${pendingCommentAnchor.label ?? "milestone"}`
                      : "Click a milestone on the map to attach your comment."}
                  </p>
                  <select
                    value={pendingCommentAnchor?.milestoneId ?? ""}
                    onChange={(e) => {
                      const id = e.target.value || null;
                      const ms = visibleMilestones.find((m) => m.id === id);
                      setPendingCommentAnchor(
                        id
                          ? {
                              milestoneId: id,
                              label: ms ? `On: ${ms.title}` : null,
                            }
                          : null
                      );
                    }}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  >
                    <option value="">Or pick from list…</option>
                    {visibleMilestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.targetDate.slice(0, 7)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Add a comment…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={loading || !body.trim()}
                className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                {loading ? "Posting…" : "Post comment"}
              </button>
            </form>
          )}
          {message && <p className="mt-2 text-xs text-red-600">{message}</p>}
        </div>
      )}
    </aside>
  );
}
