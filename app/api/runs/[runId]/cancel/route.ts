import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { executionRunStore } from "@/lib/execution-runs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;
  const cancelled = executionRunStore.cancel(runId);
  if (!cancelled) {
    return NextResponse.json(
      { error: "Run not found or already finished" },
      { status: 409 },
    );
  }

  return NextResponse.json({ runId, status: "cancelled" });
}
