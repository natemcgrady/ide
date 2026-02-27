import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { executionRunStore, type RunEvent, type RunStatus } from "@/lib/execution-runs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TERMINAL_STATUSES: ReadonlySet<RunStatus> = new Set([
  "completed",
  "failed",
  "cancelled",
]);

function formatSseEvent(event: RunEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;
  const status = executionRunStore.getStatus(runId);
  if (!status) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const cursorParam = request.nextUrl.searchParams.get("cursor");
  const cursor = Number.parseInt(cursorParam ?? "0", 10);
  const lastSeenEventId = Number.isFinite(cursor) && cursor > 0 ? cursor : 0;

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let unsubscribe: (() => void) | null = null;
      let heartbeat: ReturnType<typeof setInterval> | null = null;

      const safeClose = () => {
        if (closed) return;
        closed = true;
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        controller.close();
      };
      cleanup = safeClose;

      const sendEvent = (event: RunEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(formatSseEvent(event)));
        const currentStatus = executionRunStore.getStatus(runId);
        if (currentStatus && TERMINAL_STATUSES.has(currentStatus)) {
          safeClose();
        }
      };

      const initialEvents = executionRunStore.getEventsSince(runId, lastSeenEventId);
      for (const event of initialEvents) {
        sendEvent(event);
      }

      const currentStatus = executionRunStore.getStatus(runId);
      if (currentStatus && TERMINAL_STATUSES.has(currentStatus)) {
        safeClose();
        return;
      }

      unsubscribe = executionRunStore.subscribe(runId, sendEvent);
      if (!unsubscribe) {
        safeClose();
        return;
      }

      heartbeat = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, 15_000);
    },
    cancel() {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
