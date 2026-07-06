import fs from "fs";
import { ensureDataDirs, MY_MAP_ID, SETTINGS_PATH } from "./paths";

export interface AppSettings {
  activeMapId: string;
  anthropicApiKey: string;
  voyageApiKey: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  activeMapId: MY_MAP_ID,
  anthropicApiKey: "",
  voyageApiKey: "",
};

function readEnvFallback(): Partial<AppSettings> {
  return {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
    voyageApiKey: process.env.VOYAGE_API_KEY ?? "",
  };
}

function persistSettings(settings: AppSettings): AppSettings {
  ensureDataDirs();
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
  applySettingsToEnv(settings);
  return settings;
}

export function readSettings(): AppSettings {
  ensureDataDirs();
  if (!fs.existsSync(SETTINGS_PATH)) {
    const initial = { ...DEFAULT_SETTINGS, ...readEnvFallback() };
    return persistSettings(initial);
  }

  try {
    const parsed = JSON.parse(
      fs.readFileSync(SETTINGS_PATH, "utf8")
    ) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(partial: Partial<AppSettings>): AppSettings {
  const current = readSettings();
  const next: AppSettings = {
    activeMapId: partial.activeMapId ?? current.activeMapId,
    anthropicApiKey:
      partial.anthropicApiKey !== undefined
        ? partial.anthropicApiKey
        : current.anthropicApiKey,
    voyageApiKey:
      partial.voyageApiKey !== undefined ? partial.voyageApiKey : current.voyageApiKey,
  };
  return persistSettings(next);
}

export function applySettingsToEnv(settings: AppSettings) {
  if (settings.anthropicApiKey) {
    process.env.ANTHROPIC_API_KEY = settings.anthropicApiKey;
  }
  if (settings.voyageApiKey) {
    process.env.VOYAGE_API_KEY = settings.voyageApiKey;
  }
}

export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
