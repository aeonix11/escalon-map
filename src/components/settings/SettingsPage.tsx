"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "@/components/forms/formStyles";
import type { MapSummary, NarrativeFocusMode } from "@/store/mapStore";

interface SettingsResponse {
  activeMapId: string;
  maps: MapSummary[];
  apiKeys: {
    anthropicConfigured: boolean;
    voyageConfigured: boolean;
    anthropicMasked: string;
    voyageMasked: string;
  };
  readOnly: boolean;
  user?: { id: string; email?: string; displayName?: string };
  narrativeFocusMode?: NarrativeFocusMode;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [mapName, setMapName] = useState("My Map");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [shareSlug, setShareSlug] = useState("");
  const [narrativeFocusMode, setNarrativeFocusMode] =
    useState<NarrativeFocusMode>("fade");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [voyageKey, setVoyageKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [includePersonalOnExport, setIncludePersonalOnExport] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadSettings = async () => {
    const res = await fetch("/api/settings");
    if (!res.ok) {
      setMessage("Could not load settings. Try refreshing the page.");
      return;
    }
    const data = (await res.json()) as SettingsResponse;
    setSettings(data);
    const map = data.maps[0];
    if (map) {
      setMapName(map.name);
      setVisibility(map.visibility ?? "private");
      setShareSlug(map.shareSlug ?? "");
    }
    if (data.narrativeFocusMode) {
      setNarrativeFocusMode(data.narrativeFocusMode);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveSettings = async (extra: Record<string, unknown> = {}) => {
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        mapName,
        visibility,
        narrativeFocusMode,
        ...extra,
      };
      if (anthropicKey) body.anthropicApiKey = anthropicKey;
      if (voyageKey) body.voyageApiKey = voyageKey;

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setMessage("Could not save settings.");
        return;
      }
      const data = (await res.json()) as SettingsResponse;
      setSettings(data);
      const map = data.maps[0];
      if (map) {
        setMapName(map.name);
        setVisibility(map.visibility ?? "private");
        setShareSlug(map.shareSlug ?? "");
      }
      setAnthropicKey("");
      setVoyageKey("");
      setMessage("Settings saved.");
    } catch {
      setMessage("Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !window.confirm(
        "Import replaces all data in your cloud map. Continue?"
      )
    ) {
      e.target.value = "";
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      if (!file.name.toLowerCase().endsWith(".json")) {
        setMessage(
          "Invalid map file — choose a .json export, not a .db SQLite database."
        );
        return;
      }

      const text = await file.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        setMessage("Invalid map file — not valid JSON.");
        return;
      }

      const res = await fetch("/api/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        setMessage(err.error ?? "Could not import map.");
        return;
      }
      setMessage("Map imported. Reloading…");
      window.location.href = "/";
    } catch {
      setMessage("Import failed — check your connection and try again.");
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  const runExport = async (includePersonal: boolean) => {
    setExporting(true);
    try {
      const res = await fetch(
        `/api/export${includePersonal ? "?includePersonal=true" : ""}`
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `escalon-map-export${includePersonal ? "-full" : ""}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExportDialog(false);
      setIncludePersonalOnExport(false);
      setMessage("Map exported.");
    } finally {
      setExporting(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareSlug) return;
    const url = `${window.location.origin}/m/${shareSlug}`;
    await navigator.clipboard.writeText(url);
    setMessage("Share link copied to clipboard.");
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const shareUrl =
    shareSlug && typeof window !== "undefined"
      ? `${window.location.origin}/m/${shareSlug}`
      : shareSlug
        ? `/m/${shareSlug}`
        : "";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Settings</h1>
            <p className="text-xs text-slate-500">
              {settings?.user?.email ?? "Your account and map preferences"}
            </p>
          </div>
          <Link
            href="/"
            className="rounded bg-sky-600 px-3 py-1.5 text-xs text-white hover:bg-sky-500"
          >
            Back to map
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-6">
        {message && (
          <div className="rounded border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            {message}
          </div>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Your map</h2>
          <label className="mt-3 block text-xs text-slate-600">
            Map name
            <input
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </label>
          <button
            onClick={() => saveSettings()}
            disabled={saving}
            className="mt-3 rounded bg-sky-600 px-4 py-2 text-xs text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save map name"}
          </button>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Sharing</h2>
          <p className="mt-1 text-xs text-slate-600">
            Public maps can be viewed by anyone with the link. Viewers must log in to leave comments.
          </p>
          <div className="mt-3 flex gap-4">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                checked={visibility === "private"}
                onChange={() => setVisibility("private")}
              />
              Private
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                checked={visibility === "public"}
                onChange={() => setVisibility("public")}
              />
              Public
            </label>
          </div>
          {visibility === "public" && shareUrl && (
            <div className="mt-3 rounded border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                Share link
              </p>
              <p className="mt-1 break-all text-xs text-slate-700">{shareUrl}</p>
              <button
                type="button"
                onClick={copyShareLink}
                className="mt-2 rounded bg-slate-800 px-3 py-1 text-xs text-white"
              >
                Copy link
              </button>
            </div>
          )}
          <button
            onClick={() => saveSettings()}
            disabled={saving}
            className="mt-3 rounded bg-slate-800 px-4 py-2 text-xs text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Save visibility
          </button>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Timeline display</h2>
          <p className="mt-1 text-xs text-slate-600">
            When you click a narrative pill, choose whether other milestone boxes fade or hide completely.
          </p>
          <div className="mt-3 flex gap-4">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                checked={narrativeFocusMode === "fade"}
                onChange={() => setNarrativeFocusMode("fade")}
              />
              Fade others
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                checked={narrativeFocusMode === "hide"}
                onChange={() => setNarrativeFocusMode("hide")}
              />
              Hide others
            </label>
          </div>
          <button
            onClick={() => saveSettings()}
            disabled={saving}
            className="mt-3 rounded bg-amber-600 px-4 py-2 text-xs text-white hover:bg-amber-500 disabled:opacity-50"
          >
            Save display preference
          </button>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Backup &amp; import</h2>
          <p className="mt-1 text-xs text-slate-600">
            Export a JSON backup or import a map file from the old desktop app.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setShowExportDialog(true)}
              className="rounded bg-slate-800 px-4 py-2 text-xs text-white hover:bg-slate-700"
            >
              Export backup
            </button>
            <label className="inline-flex cursor-pointer rounded bg-slate-100 px-4 py-2 text-xs text-slate-700 hover:bg-slate-200">
              Import map file
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">AI features (optional)</h2>
          <p className="mt-1 text-xs text-slate-600">
            Set keys here or via environment variables on your host (Vercel).
          </p>
          <div className="mt-4 space-y-3">
            <label className="block text-xs text-slate-600">
              Anthropic API key
              {settings?.apiKeys.anthropicConfigured && (
                <span className="ml-2 text-emerald-600">
                  configured {settings.apiKeys.anthropicMasked}
                </span>
              )}
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="block text-xs text-slate-600">
              Voyage API key
              {settings?.apiKeys.voyageConfigured && (
                <span className="ml-2 text-emerald-600">
                  configured {settings.apiKeys.voyageMasked}
                </span>
              )}
              <input
                type="password"
                value={voyageKey}
                onChange={(e) => setVoyageKey(e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </label>
          </div>
          <button
            onClick={() => saveSettings()}
            disabled={saving}
            className="mt-4 rounded bg-violet-600 px-4 py-2 text-xs text-white hover:bg-violet-500 disabled:opacity-50"
          >
            Save API keys
          </button>
        </section>

        <section className="rounded-lg border border-red-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-red-900">Account</h2>
          <button
            onClick={handleLogout}
            className="mt-3 rounded border border-red-200 px-4 py-2 text-xs text-red-700 hover:bg-red-50"
          >
            Log out
          </button>
        </section>
      </main>

      {showExportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-sm font-semibold">Export backup</h2>
            <label className="mt-4 flex items-start gap-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={includePersonalOnExport}
                onChange={(e) => setIncludePersonalOnExport(e.target.checked)}
                className="mt-0.5"
              />
              <span>Include personal milestones and notes</span>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowExportDialog(false)}
                disabled={exporting}
                className="rounded bg-slate-100 px-3 py-1.5 text-xs text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => runExport(includePersonalOnExport)}
                disabled={exporting}
                className="rounded bg-sky-600 px-3 py-1.5 text-xs text-white"
              >
                {exporting ? "Exporting…" : "Download"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
