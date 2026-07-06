/** Block private/local targets for server-side fetch (RSS feeds). */
export function isSafePublicHttpUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.") ||
    host === "[::1]"
  ) {
    return false;
  }

  const parts = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (parts) {
    const a = Number(parts[1]);
    const b = Number(parts[2]);
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 0) return false;
  }

  return true;
}
