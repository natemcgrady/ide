import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { executionRunStore } from "@/lib/execution-runs";
import { isValidLanguage } from "@/lib/executor";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createRunSchema = z.object({
  code: z.string().min(1),
  language: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createRunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isValidLanguage(parsed.data.language)) {
    return NextResponse.json(
      {
        error: `Invalid language. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const runId = executionRunStore.createRun({
    code: parsed.data.code,
    language: parsed.data.language,
  });

  return NextResponse.json({
    runId,
    status: "queued",
  });
}
