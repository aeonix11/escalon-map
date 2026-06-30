"use client";

import { useState } from "react";
import { inputClass } from "./formStyles";

export default function AddNarrativeForm({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [colorHex, setColorHex] = useState("#3b82f6");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "narrative",
        data: { title, description, colorHex },
      }),
    });
    setTitle("");
    setDescription("");
    setLoading(false);
    onCreated();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
    >
      <h3 className="text-xs font-medium text-slate-600 mb-2">Add Narrative</h3>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className={`${inputClass} mb-2`}
        required
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className={`${inputClass} mb-2 h-16`}
      />
      <div className="flex items-center gap-2 mb-2">
        <input
          type="color"
          value={colorHex}
          onChange={(e) => setColorHex(e.target.value)}
          className="h-6 w-8"
        />
        <span className="text-xs text-slate-500">Narrative color</span>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-sky-600 px-3 py-1 text-xs text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Create Narrative"}
      </button>
    </form>
  );
}
