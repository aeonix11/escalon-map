"use client";

import { useEffect, useMemo, useState } from "react";
import { useMapStore } from "@/store/mapStore";
import { inputClass } from "@/components/forms/formStyles";
import type { Note } from "@/lib/schema";

interface NotesPanelProps {
  onRefresh: () => void;
  readOnly?: boolean;
}

function clearFormState() {
  return {
    title: "",
    content: "",
    pinnedDate: "",
    hemisphere: "" as "UPPER_PROPHETIC" | "LOWER_EARTHLY" | "",
    isPersonal: false,
  };
}

function loadFormFromNote(note: Note) {
  return {
    title: note.title,
    content: note.content,
    pinnedDate: note.pinnedDate ?? "",
    hemisphere: (note.hemisphere ?? "") as "UPPER_PROPHETIC" | "LOWER_EARTHLY" | "",
    isPersonal: note.isPersonal,
  };
}

export default function NotesPanel({ onRefresh, readOnly = false }: NotesPanelProps) {
  const {
    notes,
    selectedNoteId,
    setSelectedNoteId,
    setDrawerMode,
  } = useMapStore();

  const [mode, setMode] = useState<"new" | "edit">("new");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinnedDate, setPinnedDate] = useState("");
  const [hemisphere, setHemisphere] = useState<
    "UPPER_PROPHETIC" | "LOWER_EARTHLY" | ""
  >("");
  const [isPersonal, setIsPersonal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selected = notes.find((n) => n.id === selectedNoteId);

  const sortedNotes = useMemo(
    () =>
      [...notes].sort((a, b) =>
        (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)
      ),
    [notes]
  );

  const startNewNote = () => {
    setMode("new");
    setSelectedNoteId(null);
    const empty = clearFormState();
    setTitle(empty.title);
    setContent(empty.content);
    setPinnedDate(empty.pinnedDate);
    setHemisphere(empty.hemisphere);
    setIsPersonal(empty.isPersonal);
    setStatusMessage(null);
  };

  const selectNote = (id: string) => {
    setMode("edit");
    setSelectedNoteId(id);
    setStatusMessage(null);
  };

  useEffect(() => {
    if (mode === "edit" && selected) {
      const form = loadFormFromNote(selected);
      setTitle(form.title);
      setContent(form.content);
      setPinnedDate(form.pinnedDate);
      setHemisphere(form.hemisphere);
      setIsPersonal(form.isPersonal);
    }
  }, [mode, selected]);

  useEffect(() => {
    if (selectedNoteId && notes.some((n) => n.id === selectedNoteId)) {
      setMode("edit");
    }
  }, [selectedNoteId, notes]);

  const saveNote = async (addAnother = false) => {
    if (!title.trim()) return;
    setSaving(true);
    setStatusMessage(null);
    try {
      const payload = {
        title: title.trim(),
        content,
        pinnedDate: pinnedDate || null,
        hemisphere: hemisphere || null,
        isPersonal,
      };

      if (mode === "edit" && selected) {
        const res = await fetch("/api/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "note",
            id: selected.id,
            data: payload,
          }),
        });
        if (!res.ok) {
          setStatusMessage("Could not save note.");
          return;
        }
        setStatusMessage("Note saved.");
        onRefresh();
        if (addAnother) startNewNote();
      } else {
        const res = await fetch("/api/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "note",
            data: payload,
          }),
        });
        if (!res.ok) {
          setStatusMessage("Could not add note.");
          return;
        }
        onRefresh();
        if (addAnother) {
          startNewNote();
          setStatusMessage("Note added. Add another below.");
        } else {
          startNewNote();
          setStatusMessage("Note added.");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const duplicateNote = () => {
    if (!selected) return;
    setMode("new");
    setSelectedNoteId(null);
    setTitle(`${selected.title} (copy)`);
    setContent(selected.content);
    setPinnedDate(selected.pinnedDate ?? "");
    setHemisphere((selected.hemisphere ?? "") as "UPPER_PROPHETIC" | "LOWER_EARTHLY" | "");
    setIsPersonal(selected.isPersonal);
    setStatusMessage("Duplicated — save to create a new note.");
  };

  const deleteNote = async () => {
    if (!selected || !window.confirm("Delete this note?")) return;
    await fetch("/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "note", id: selected.id }),
    });
    startNewNote();
    onRefresh();
  };

  const isEditing = mode === "edit" && !!selected;

  return (
    <aside className="w-80 shrink-0 border-l border-slate-200 bg-white shadow-lg flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 p-3">
        <div>
          <h2 className="text-xs font-semibold text-slate-800">Notes</h2>
          <p className="text-[10px] text-slate-500">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              onClick={startNewNote}
              className="rounded bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-900 hover:bg-amber-200"
            >
              + New
            </button>
          )}
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
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <ul className="space-y-1">
          {sortedNotes.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => selectNote(n.id)}
                className={`w-full rounded px-2 py-1.5 text-left text-xs ${
                  isEditing && selectedNoteId === n.id
                    ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="font-medium">{n.title}</span>
                {n.pinnedDate && (
                  <span className="ml-1 text-[10px] text-slate-500">
                    · {n.pinnedDate}
                  </span>
                )}
                {n.content && (
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500">
                    {n.content}
                  </p>
                )}
              </button>
            </li>
          ))}
          {notes.length === 0 && (
            <p className="text-xs text-slate-500">
              No notes yet. Use the form below to add your first one.
            </p>
          )}
        </ul>

        {(readOnly ? isEditing : true) && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-[10px] font-medium text-slate-600">
              {readOnly
                ? "View note"
                : isEditing
                  ? "Edit note"
                  : "Add a new note"}
            </p>
            {readOnly && selected ? (
              <div className="space-y-2 text-xs text-slate-700">
                <p className="font-medium text-slate-900">{selected.title}</p>
                {selected.content && <p className="whitespace-pre-wrap">{selected.content}</p>}
                {selected.pinnedDate && (
                  <p className="text-[10px] text-slate-500">
                    Pinned: {selected.pinnedDate}
                    {selected.hemisphere === "UPPER_PROPHETIC"
                      ? " · Prophetic"
                      : selected.hemisphere === "LOWER_EARTHLY"
                        ? " · Earthly"
                        : ""}
                  </p>
                )}
              </div>
            ) : (
              !readOnly && (
                <>
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
                  {statusMessage && (
                    <p className="text-[10px] text-emerald-700">{statusMessage}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void saveNote(false)}
                      disabled={saving || !title.trim()}
                      className="rounded bg-sky-600 px-3 py-1.5 text-xs text-white hover:bg-sky-500 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : isEditing ? "Save changes" : "Add note"}
                    </button>
                    <button
                      onClick={() => void saveNote(true)}
                      disabled={saving || !title.trim()}
                      className="rounded bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : isEditing ? "Save & new" : "Add & another"}
                    </button>
                    {isEditing && (
                      <>
                        <button
                          onClick={duplicateNote}
                          className="rounded bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() => void deleteNote()}
                          className="rounded bg-red-100 px-3 py-1.5 text-xs text-red-700 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {!isEditing && (
                      <button
                        onClick={startNewNote}
                        className="rounded bg-slate-100 px-3 py-1.5 text-xs text-slate-700"
                      >
                        Clear
                      </button>
                    )}
                    {isEditing && (
                      <button
                        onClick={startNewNote}
                        className="rounded bg-slate-100 px-3 py-1.5 text-xs text-slate-700"
                      >
                        Cancel edit
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    You can keep as many notes as you like. Set a date and hemisphere to pin one on the timeline.
                  </p>
                </>
              )
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
