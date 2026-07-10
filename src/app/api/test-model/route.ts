import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireSessionUser } from "@/lib/auth";
import {
  loadUserApiKeys,
  missingAnthropicKeyResponse,
} from "@/lib/userApiKeys";

export async function GET(req: NextRequest) {
  const user = await requireSessionUser();
  const keys = await loadUserApiKeys(user.id);
  const model = req.nextUrl.searchParams.get("model") ?? "claude-fable-5";

  if (!keys.anthropicApiKey) {
    return NextResponse.json(missingAnthropicKeyResponse(), { status: 400 });
  }

  const client = new Anthropic({ apiKey: keys.anthropicApiKey });

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
