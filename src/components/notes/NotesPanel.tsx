"use client";

import { useEffect, useState } from "react";
import { useMapStore } from "@/store/mapStore";
import { inputClass } from "@/components/forms/formStyles";

interface NotesPanelProps {
  onRefresh: () => void;
  readOnly?: boolean;
}

export default function NotesPanel({ onRefresh, readOnly = false }: NotesPanelProps) {
  const {
    notes,
    selectedNoteId,
    setSelectedNoteId,
    setDrawerMode,
  } = useMapStore();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinnedDate, setPinnedDate] = useState("");
  const [hemisphere, setHemisphere] = useState<
    "UPPER_PROPHETIC" | "LOWER_EARTHLY" | ""
  >("");
  const [isPersonal, setIsPersonal] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = notes.find((n) => n.id === selectedNoteId);

  useEffect(() => {
    if (selected) {
      setTitle(selected.title);
      setContent(selected.content);
      setPinnedDate(selected.pinnedDate ?? "");
      setHemisphere(selected.hemisphere ?? "");
      setIsPersonal(selected.isPersonal);
    } else {
      setTitle("");
      setContent("");
      setPinnedDate("");
      setHemisphere("");
      setIsPersonal(false);
    }
  }, [selected]);

  const saveNote = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (selected) {
        await fetch("/api/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "note",
            id: selected.id,
            data: {
              title: title.trim(),
              content,
              pinnedDate: pinnedDate || null,
              hemisphere: hemisphere || null,
              isPersonal,
            },
          }),
        });
      } else {
        await fetch("/api/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "note",
            data: {
              title: title.trim(),
              content,
              pinnedDate: pinnedDate || null,
              hemisphere: hemisphere || null,
              isPersonal,
            },
          }),
        });
      }
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async () => {
    if (!selected || !window.confirm("Delete this note?")) return;
    await fetch("/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "note", id: selected.id }),
    });
    setSelectedNoteId(null);
    onRefresh();
  };

  return (
    <aside className="w-80 shrink-0 border-l border-slate-200 bg-white shadow-lg flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 p-3">
        <h2 className="text-xs font-semibold text-slate-800">Notes</h2>
        <button
          onClick={() => {
            setSelectedNoteId(null);
            setDrawerMode(null);
          }}
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <ul className="space-y-1">
          {notes.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => setSelectedNoteId(n.id)}
                className={`w-full rounded px-2 py-1.5 text-left text-xs ${
                  selectedNoteId === n.id
                    ? "bg-amber-100 text-amber-900"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                {n.title}
                {n.pinnedDate && (
                  <span className="ml-1 text-[10px] text-slate-500">
                    · {n.pinnedDate}
                  </span>
                )}
              </button>
            </li>
          ))}
          {notes.length === 0 && (
            <p className="text-xs text-slate-500">No notes yet.</p>
          )}
        </ul>

        {!readOnly && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-[10px] font-medium text-slate-600">
              {selected ? "Edit note" : "New note"}
            </p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className={inputClass}
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Content..."
              className={`${inputClass} h-24`}
            />
            <input
              type="date"
              value={pinnedDate}
              onChange={(e) => setPinnedDate(e.target.value)}
              className={inputClass}
            />
            <select
              value={hemisphere}
              onChange={(e) =>
                setHemisphere(
                  e.target.value as "UPPER_PROPHETIC" | "LOWER_EARTHLY" | ""
                )
              }
              className={inputClass}
            >
              <option value="">Not on timeline</option>
              <option value="UPPER_PROPHETIC">Prophetic (upper)</option>
              <option value="LOWER_EARTHLY">Earthly (lower)</option>
            </select>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={isPersonal}
                onChange={(e) => setIsPersonal(e.target.checked)}
              />
              Personal
            </label>
            <div className="flex gap-2">
              <button
                onClick={saveNote}
                disabled={saving || !title.trim()}
                className="rounded bg-sky-600 px-3 py-1.5 text-xs text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {saving ? "Saving…" : selected ? "Save" : "Add note"}
              </button>
              {selected && (
                <button
                  onClick={deleteNote}
                  className="rounded bg-red-100 px-3 py-1.5 text-xs text-red-700 hover:bg-red-200"
                >
                  Delete
                </button>
              )}
              {!selected && (
                <button
                  onClick={() => setSelectedNoteId(null)}
                  className="rounded bg-slate-100 px-3 py-1.5 text-xs text-slate-700"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500">
              Set a date and hemisphere to pin the note on the timeline.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
