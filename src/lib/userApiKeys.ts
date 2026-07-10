import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { eq } from "drizzle-orm";
import { profiles } from "@/lib/schema";
import { getDb } from "@/lib/db";
import { maskApiKey, readSettings } from "@/lib/settings";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export interface UserApiKeys {
  anthropicApiKey?: string;
  voyageApiKey?: string;
}

export interface MaskedUserApiKeys {
  anthropicConfigured: boolean;
  voyageConfigured: boolean;
  anthropicMasked: string;
  voyageMasked: string;
}

function isHosted(): boolean {
  return process.env.VERCEL === "1";
}

function getEncryptionSecret(): string | null {
  return process.env.API_KEY_ENCRYPTION_SECRET?.trim() || null;
}

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, "escalon-map-api-keys", KEY_LENGTH);
}

export function requireEncryptionSecret(): string {
  const secret = getEncryptionSecret();
  if (!secret) {
    if (isHosted()) {
      throw new Error("API_KEY_ENCRYPTION_SECRET is not configured.");
    }
    throw new Error("API_KEY_ENCRYPTION_SECRET is required to store API keys.");
  }
  return secret;
}

export function encryptSecret(plaintext: string): string {
  const secret = requireEncryptionSecret();
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(ciphertext: string): string {
  const secret = requireEncryptionSecret();
  const key = deriveKey(secret);
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

function safeDecrypt(ciphertext: string | null | undefined): string | undefined {
  if (!ciphertext) return undefined;
  try {
    return decryptSecret(ciphertext);
  } catch {
    return undefined;
  }
}

function localDevFallback(): UserApiKeys {
  if (isHosted()) return {};
  const settings = readSettings();
  const keys: UserApiKeys = {};
  if (settings.anthropicApiKey) keys.anthropicApiKey = settings.anthropicApiKey;
  if (settings.voyageApiKey) keys.voyageApiKey = settings.voyageApiKey;
  if (!keys.anthropicApiKey && process.env.ANTHROPIC_API_KEY) {
    keys.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  }
  if (!keys.voyageApiKey && process.env.VOYAGE_API_KEY) {
    keys.voyageApiKey = process.env.VOYAGE_API_KEY;
  }
  return keys;
}

export async function loadUserApiKeys(userId: string): Promise<UserApiKeys> {
  const db = getDb();
  const [profile] = await db
    .select({
      anthropicApiKeyEnc: profiles.anthropicApiKeyEnc,
      voyageApiKeyEnc: profiles.voyageApiKeyEnc,
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  const keys: UserApiKeys = {};
  const anthropic = safeDecrypt(profile?.anthropicApiKeyEnc);
  const voyage = safeDecrypt(profile?.voyageApiKeyEnc);
  if (anthropic) keys.anthropicApiKey = anthropic;
  if (voyage) keys.voyageApiKey = voyage;

  if (!keys.anthropicApiKey && !keys.voyageApiKey) {
    const fallback = localDevFallback();
    if (fallback.anthropicApiKey) keys.anthropicApiKey = fallback.anthropicApiKey;
    if (fallback.voyageApiKey) keys.voyageApiKey = fallback.voyageApiKey;
  } else {
    if (!keys.anthropicApiKey) {
      const fallback = localDevFallback();
      if (fallback.anthropicApiKey) keys.anthropicApiKey = fallback.anthropicApiKey;
    }
    if (!keys.voyageApiKey) {
      const fallback = localDevFallback();
      if (fallback.voyageApiKey) keys.voyageApiKey = fallback.voyageApiKey;
    }
  }

  return keys;
}

export async function saveUserApiKeys(
  userId: string,
  partial: { anthropicApiKey?: string; voyageApiKey?: string }
): Promise<void> {
  const updates: {
    anthropicApiKeyEnc?: string | null;
    voyageApiKeyEnc?: string | null;
  } = {};

  if (partial.anthropicApiKey !== undefined) {
    const trimmed = partial.anthropicApiKey.trim();
    updates.anthropicApiKeyEnc = trimmed ? encryptSecret(trimmed) : null;
  }

  if (partial.voyageApiKey !== undefined) {
    const trimmed = partial.voyageApiKey.trim();
    updates.voyageApiKeyEnc = trimmed ? encryptSecret(trimmed) : null;
  }

  if (Object.keys(updates).length === 0) return;

  const db = getDb();
  await db.update(profiles).set(updates).where(eq(profiles.id, userId));
}

export async function getMaskedUserApiKeys(
  userId: string
): Promise<MaskedUserApiKeys> {
  const keys = await loadUserApiKeys(userId);
  return {
    anthropicConfigured: Boolean(keys.anthropicApiKey),
    voyageConfigured: Boolean(keys.voyageApiKey),
    anthropicMasked: maskApiKey(keys.anthropicApiKey ?? ""),
    voyageMasked: maskApiKey(keys.voyageApiKey ?? ""),
  };
}

export function missingAnthropicKeyResponse() {
  return {
    error: "Add your Anthropic API key in Settings to use this feature.",
  };
}

export function missingVoyageKeyResponse() {
  return {
    error: "Add your Voyage API key in Settings to use this feature.",
  };
}
