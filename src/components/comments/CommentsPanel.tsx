"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CommentRow {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  authorName: string;
}

interface CommentsPanelProps {
  shareSlug: string;
}

export default function CommentsPanel({ shareSlug }: CommentsPanelProps) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [mapName, setMapName] = useState("");
  const [body, setBody] = useState("");
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadComments = async () => {
    const res = await fetch(`/api/comments?shareSlug=${encodeURIComponent(shareSlug)}`);
    if (!res.ok) return;
    const data = await res.json();
    setComments(data.comments ?? []);
    setMapName(data.mapName ?? "");
  };

  useEffect(() => {
    loadComments();
    fetch("/api/settings")
      .then((r) => setLoggedIn(r.ok))
      .catch(() => setLoggedIn(false));
  }, [shareSlug]);

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareSlug, body: body.trim() }),
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

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Comments</h2>
        <p className="text-xs text-slate-500">{mapName || "Shared map"}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {comments.length === 0 && (
          <p className="text-xs text-slate-500">No comments yet.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-700">{c.authorName}</p>
              <p className="text-[10px] text-slate-400">
                {new Date(c.createdAt).toLocaleString()}
              </p>
            </div>
            <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{c.body}</p>
            {loggedIn && (
              <button
                onClick={() => deleteComment(c.id)}
                className="mt-2 text-[10px] text-red-600 hover:underline"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 p-4">
        {loggedIn === false && (
          <p className="mb-2 text-xs text-slate-600">
            <Link href={`/login?next=/m/${shareSlug}`} className="underline">
              Log in
            </Link>{" "}
            to leave a comment.
          </p>
        )}
        {loggedIn && (
          <form onSubmit={postComment} className="space-y-2">
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
    </aside>
  );
}
