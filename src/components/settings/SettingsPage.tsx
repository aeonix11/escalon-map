"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { inputClass } from "@/components/forms/formStyles";
import type { MapSummary } from "@/store/mapStore";

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
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [activeMapId, setActiveMapId] = useState("my-map");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [voyageKey, setVoyageKey] = useState("");
  const [ownerLabel, setOwnerLabel] = useState("");
  const [displayName, setDisplayName] = useState("");
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
    setActiveMapId(data.activeMapId);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveSettings = async (extra: Record<string, unknown> = {}) => {
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        activeMapId,
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
      setActiveMapId(data.activeMapId);
      setAnthropicKey("");
      setVoyageKey("");
      setMessage("Settings saved.");
    } catch {
      setMessage("Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSharedMap = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setMessage(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch("/api/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          ownerLabel: ownerLabel.trim() || undefined,
          displayName: displayName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setMessage(err.error ?? "Could not add map.");
        return;
      }
      setOwnerLabel("");
      setDisplayName("");
      setMessage("Shared map added. Select it below to view.");
      await loadSettings();
    } catch {
      setMessage("Invalid map file.");
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  const runExport = async (includePersonal: boolean) => {
    setExporting(true);
    try {
      const res = await fetch(
        `/api/export?mapId=my-map${includePersonal ? "&includePersonal=true" : ""}`
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
      setMessage("Map exported. Send this file to others so they can view your timeline.");
    } finally {
      setExporting(false);
    }
  };

  const removeSharedMap = async (mapId: string) => {
    if (!window.confirm("Remove this shared map from your list?")) return;
    await saveSettings({ removeMapId: mapId });
  };

  const sharedMaps =
    settings?.maps.filter((m) => !m.editable) ?? [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Settings</h1>
            <p className="text-xs text-slate-500">
              Switch maps, add shared timelines, and configure AI keys
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
          <h2 className="text-sm font-semibold">Which map are you viewing?</h2>
          <p className="mt-1 text-xs text-slate-600">
            Your own map is editable. Shared maps are view-only and never change
            your timeline.
          </p>
          <select
            value={activeMapId}
            onChange={(e) => setActiveMapId(e.target.value)}
            className={`${inputClass} mt-3`}
          >
            {settings?.maps.map((map) => (
              <option key={map.id} value={map.id}>
                {map.name}
                {map.editable ? " (yours)" : map.ownerLabel ? ` — ${map.ownerLabel}` : " (shared)"}
              </option>
            )) ?? <option value="my-map">My Map</option>}
          </select>
          <button
            onClick={() => saveSettings()}
            disabled={saving}
            className="mt-3 rounded bg-sky-600 px-4 py-2 text-xs text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Switch map"}
          </button>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Add someone else&apos;s map</h2>
          <p className="mt-1 text-xs text-slate-600">
            Upload a map file they sent you. It appears in the dropdown above —
            your own map stays untouched.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-slate-600">
              Their name (optional)
              <input
                value={ownerLabel}
                onChange={(e) => setOwnerLabel(e.target.value)}
                placeholder="David"
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="block text-xs text-slate-600">
              Label in dropdown (optional)
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="David's 2026 map"
                className={`${inputClass} mt-1`}
              />
            </label>
          </div>
          <label className="mt-4 inline-flex cursor-pointer rounded bg-slate-100 px-4 py-2 text-xs text-slate-700 hover:bg-slate-200">
            Choose map file (.json)
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleAddSharedMap}
            />
          </label>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Share your map</h2>
          <p className="mt-1 text-xs text-slate-600">
            Export your timeline as a file and send it to others. They add it in
            their Settings — no merging into their own map.
          </p>
          <button
            onClick={() => setShowExportDialog(true)}
            className="mt-3 rounded bg-slate-800 px-4 py-2 text-xs text-white hover:bg-slate-700"
          >
            Export my map
          </button>
        </section>

        {sharedMaps.length > 0 && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Shared maps on this computer</h2>
            <ul className="mt-3 space-y-2">
              {sharedMaps.map((map) => (
                <li
                  key={map.id}
                  className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                >
                  <span>
                    {map.name}
                    {map.ownerLabel ? ` (${map.ownerLabel})` : ""}
                  </span>
                  <button
                    onClick={() => removeSharedMap(map.id)}
                    className="text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">AI features (optional)</h2>
          <p className="mt-1 text-xs text-slate-600">
            Keys are stored locally on your computer in{" "}
            <code className="rounded bg-slate-100 px-1">data/settings.json</code>.
            The app works without them — timeline editing still works.
          </p>
          <div className="mt-4 space-y-3">
            <label className="block text-xs text-slate-600">
              Anthropic API key (Map Intelligence &amp; signal matching)
              {settings?.apiKeys.anthropicConfigured && (
                <span className="ml-2 text-emerald-600">
                  configured {settings.apiKeys.anthropicMasked}
                </span>
              )}
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder={
                  settings?.apiKeys.anthropicConfigured
                    ? "Enter new key to replace"
                    : "sk-ant-..."
                }
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="block text-xs text-slate-600">
              Voyage API key (semantic search)
              {settings?.apiKeys.voyageConfigured && (
                <span className="ml-2 text-emerald-600">
                  configured {settings.apiKeys.voyageMasked}
                </span>
              )}
              <input
                type="password"
                value={voyageKey}
                onChange={(e) => setVoyageKey(e.target.value)}
                placeholder={
                  settings?.apiKeys.voyageConfigured
                    ? "Enter new key to replace"
                    : "pa-..."
                }
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
      </main>

      {showExportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-sm font-semibold">Export my map</h2>
            <p className="mt-2 text-xs text-slate-600">
              Personal milestones and notes can be left out when sharing.
            </p>
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
                onClick={() => {
                  setShowExportDialog(false);
                  setIncludePersonalOnExport(false);
                }}
                disabled={exporting}
                className="rounded bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => runExport(includePersonalOnExport)}
                disabled={exporting}
                className="rounded bg-sky-600 px-3 py-1.5 text-xs text-white hover:bg-sky-500"
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
