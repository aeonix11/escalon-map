import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_DEEP_PROMPT_TEMPLATE,
  DEFAULT_QUICK_PROMPT_TEMPLATE,
  PROMPT_PLACEHOLDER_HINT,
  resolvePromptTemplate,
} from "@/lib/deepAnalysisPrompts";
import { readSettings, writeSettings } from "@/lib/settings";

export async function GET() {
  const settings = readSettings();
  return NextResponse.json({
    quick: {
      custom: settings.deepAnalysisQuickPrompt,
      effective: resolvePromptTemplate("quick", settings.deepAnalysisQuickPrompt),
      default: DEFAULT_QUICK_PROMPT_TEMPLATE,
      usingDefault: !settings.deepAnalysisQuickPrompt.trim(),
    },
    deep: {
      custom: settings.deepAnalysisDeepPrompt,
      effective: resolvePromptTemplate("deep", settings.deepAnalysisDeepPrompt),
      default: DEFAULT_DEEP_PROMPT_TEMPLATE,
      usingDefault: !settings.deepAnalysisDeepPrompt.trim(),
    },
    placeholderHint: PROMPT_PLACEHOLDER_HINT,
  });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as {
    quickPrompt?: string;
    deepPrompt?: string;
    resetQuick?: boolean;
    resetDeep?: boolean;
  };

  const current = readSettings();
  writeSettings({
    activeMapId: current.activeMapId,
    anthropicApiKey: current.anthropicApiKey,
    voyageApiKey: current.voyageApiKey,
    deepAnalysisQuickPrompt: body.resetQuick
      ? ""
      : body.quickPrompt !== undefined
        ? body.quickPrompt
        : current.deepAnalysisQuickPrompt,
    deepAnalysisDeepPrompt: body.resetDeep
      ? ""
      : body.deepPrompt !== undefined
        ? body.deepPrompt
        : current.deepAnalysisDeepPrompt,
  });

  return GET();
}
