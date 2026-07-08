import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function GET(req: NextRequest) {
  const model = req.nextUrl.searchParams.get("model") ?? "claude-fable-5";

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const resp = await client.messages.create({
      model,
      max_tokens: 64,
      messages: [{ role: "user", content: "Say OK." }],
    });
    const text = resp.content.find((b) => b.type === "text")?.text ?? "(no text)";
    return NextResponse.json({ ok: true, model, text, stop_reason: resp.stop_reason });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, model, error: msg }, { status: 500 });
  }
}
