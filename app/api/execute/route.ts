import { NextRequest, NextResponse } from "next/server";
import { executeCode, isValidLanguage } from "@/lib/executor";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ExecuteRequest {
  code: string;
  language: string;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json(
      {
        output: "",
        error: "Unauthorized",
        exitCode: 1,
        executionTime: 0,
      },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as ExecuteRequest;
    const { code, language } = body ?? {};

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Code is required and must be a string" },
        { status: 400 }
      );
    }

    if (!language || !isValidLanguage(language)) {
      return NextResponse.json(
        {
          error: `Invalid language. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const result = await executeCode(code, language);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Execution error:", error);
    return NextResponse.json(
      {
        output: "",
        error: "Internal server error",
        exitCode: 1,
        executionTime: 0,
      },
      { status: 500 }
    );
  }
}
