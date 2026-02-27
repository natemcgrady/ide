import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { executeCode, isValidLanguage } from "@/lib/executor";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ExecuteRequest {
  code: string;
  language: string;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        {
          output: "",
          error: "Unauthorized",
          exitCode: 1,
          executionTime: 0,
        },
        { status: 401 },
      );
    }

    const body: ExecuteRequest = await request.json();
    const { code, language } = body;

    // Validate input
    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Code is required and must be a string" },
        { status: 400 },
      );
    }

    if (!language || !isValidLanguage(language)) {
      return NextResponse.json(
        {
          error: `Invalid language. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Execute the code
    const result = await executeCode(code, language);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Execution error:', error);
    return NextResponse.json(
      {
        output: "",
        error: "Internal server error",
        exitCode: 1,
        executionTime: 0,
      },
      { status: 500 },
    );
  }
}

