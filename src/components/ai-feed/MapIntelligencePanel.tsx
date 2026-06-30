"use client";

import { useState } from "react";
import { useMapChat } from "@/hooks/useMapChat";
import { useMapStore } from "@/store/mapStore";
import { inputClass } from "@/components/forms/formStyles";

export default function MapIntelligencePanel() {
  const { setDrawerMode } = useMapStore();
  const { messages, loading, contextMode, sendMessage, clearChat } = useMapChat();
  const [input, setInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const q = input;
    setInput("");
    await sendMessage(q);
  };

  const suggestions = [
    "What year do the most milestones converge?",
    "Summarize the 2027–2030 window across both hemispheres",
    "Which narratives have the strongest real-world signal coverage?",
    "Are there patterns or gaps in my map?",
  ];

  return (
    <aside className="w-96 border-l border-slate-200 bg-white flex flex-col shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 p-3">
        <div>
          <h2 className="text-sm font-semibold text-violet-700">Map Intelligence</h2>
          {contextMode && (
            <p className="text-[10px] text-slate-500">
              Context: {contextMode === "full" ? "Full map" : "Retrieved slice"}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearChat}
            className="text-[10px] text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
          <button
            onClick={() => setDrawerMode(null)}
            className="text-[10px] text-slate-500 hover:text-slate-700"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Ask about your timeline:</p>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-left text-xs text-slate-700 hover:bg-slate-100"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg p-2 text-xs ${
              m.role === "user"
                ? "bg-sky-50 text-slate-800 ml-4 border border-sky-100"
                : "bg-violet-50 text-slate-700 mr-4 border border-violet-100"
            }`}
          >
            <span className="text-[10px] text-slate-500 block mb-1">
              {m.role === "user" ? "You" : "Claude"}
            </span>
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
        {loading && (
          <p className="text-xs text-slate-500 animate-pulse">Thinking...</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your prophecy map..."
          className={`${inputClass} h-20 resize-none`}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="mt-2 w-full rounded bg-violet-600 py-2 text-xs text-white hover:bg-violet-500 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </aside>
  );
}
