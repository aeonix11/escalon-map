"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "escalon_guest";

export interface GuestSession {
  guestId: string;
  guestName: string;
}

export function loadGuestSession(): GuestSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.guestId && parsed?.guestName) return parsed as GuestSession;
  } catch {
    // ignore
  }
  return null;
}

export function saveGuestSession(session: GuestSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function generateGuestId(): string {
  return crypto.randomUUID();
}

interface GuestNameModalProps {
  onConfirm: (session: GuestSession) => void;
  onCancel: () => void;
}

export default function GuestNameModal({ onConfirm, onCancel }: GuestNameModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const existing = loadGuestSession();
    if (existing) setName(existing.guestName);
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a display name.");
      return;
    }
    if (trimmed.length > 32) {
      setError("Name must be 32 characters or less.");
      return;
    }
    const existing = loadGuestSession();
    const session: GuestSession = {
      guestId: existing?.guestId ?? generateGuestId(),
      guestName: trimmed,
    };
    saveGuestSession(session);
    onConfirm(session);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-sm font-semibold text-slate-900">Choose a display name</h2>
        <p className="mt-1 text-xs text-slate-500">
          This is shown next to your comment. No email or account needed.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="e.g. DiscordUser42"
            maxLength={32}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 hover:bg-slate-700"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>

        <p className="mt-3 text-[10px] text-slate-400">
          Your name is saved in your browser. You can change it next time you comment.
        </p>
      </div>
    </div>
  );
}
