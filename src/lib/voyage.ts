const VOYAGE_EMBED_URL = "https://api.voyageai.com/v1/embeddings";
const EMBED_MODEL = "voyage-4-large";

interface VoyageEmbedResponse {
  data?: Array<{ embedding?: number[] }>;
}

async function callVoyageEmbed(
  input: string[],
  inputType: "document" | "query"
): Promise<Float32Array[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey || input.length === 0) return [];

  const response = await fetch(VOYAGE_EMBED_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input,
      model: EMBED_MODEL,
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Voyage embed failed:", response.status, detail);
    return [];
  }

  const result = (await response.json()) as VoyageEmbedResponse;
  return (result.data ?? [])
    .filter((d) => d.embedding && d.embedding.length > 0)
    .map((d) => new Float32Array(d.embedding!));
}

export async function embedText(text: string): Promise<Float32Array | null> {
  if (!process.env.VOYAGE_API_KEY) return null;
  const embeddings = await callVoyageEmbed([text], "document");
  return embeddings[0] ?? null;
}

export async function embedQuery(text: string): Promise<Float32Array | null> {
  if (!process.env.VOYAGE_API_KEY) return null;
  const embeddings = await callVoyageEmbed([text], "query");
  return embeddings[0] ?? null;
}

export async function embedBatch(texts: string[]): Promise<Float32Array[]> {
  if (!process.env.VOYAGE_API_KEY || texts.length === 0) return [];
  return callVoyageEmbed(texts, "document");
}

export function embeddingToBuffer(embedding: Float32Array): Buffer {
  return Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);
}

export function bufferToEmbedding(buffer: Buffer | Uint8Array): Float32Array {
  const bytes =
    buffer instanceof Buffer
      ? buffer
      : Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return new Float32Array(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength / 4
  );
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
