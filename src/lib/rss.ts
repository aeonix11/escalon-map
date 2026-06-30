export interface RssItem {
  title: string;
  link: string;
  description: string | null;
  publishedAt: string | null;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i")
  );
  return match ? decodeXmlEntities(match[1]) : null;
}

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

export function parseRssXml(xml: string): RssItem[] {
  const items: RssItem[] = [];

  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link =
      extractTag(block, "link") ??
      extractTag(block, "guid") ??
      null;

    if (!title || !link) continue;

    const description =
      extractTag(block, "description") ??
      extractTag(block, "content") ??
      extractTag(block, "summary") ??
      null;

    const publishedAt =
      normalizeDate(extractTag(block, "pubDate")) ??
      normalizeDate(extractTag(block, "published")) ??
      normalizeDate(extractTag(block, "updated")) ??
      null;

    items.push({
      title,
      link,
      description,
      publishedAt,
    });
  }

  if (items.length === 0) {
    const entryRegex = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = extractTag(block, "title");
      const linkMatch = block.match(/<link[^>]*href=["']([^"']+)["']/i);
      const link = linkMatch?.[1] ?? extractTag(block, "id");
      if (!title || !link) continue;

      const description =
        extractTag(block, "summary") ??
        extractTag(block, "content") ??
        null;

      const publishedAt =
        normalizeDate(extractTag(block, "published")) ??
        normalizeDate(extractTag(block, "updated")) ??
        null;

      items.push({ title, link, description, publishedAt });
    }
  }

  return items;
}
