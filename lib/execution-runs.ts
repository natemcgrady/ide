import { randomUUID } from "crypto";
import type { Language, ExecutionResult } from "@/lib/executor";
import { executeCode } from "@/lib/executor";

export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type RunEventType =
  | "queued"
  | "running"
  | "log"
  | "completed"
  | "failed"
  | "cancelled";

export interface RunEvent {
  id: number;
  runId: string;
  type: RunEventType;
  timestamp: string;
  data?: unknown;
}

interface CreateRunInput {
  code: string;
  language: Language;
}

interface RunRecord {
  id: string;
  status: RunStatus;
  code: string;
  language: Language;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  events: RunEvent[];
  nextEventId: number;
  listeners: Set<(event: RunEvent) => void>;
  abortController: AbortController;
}

const RUN_TTL_MS = 10 * 60 * 1000;

class ExecutionRunStore {
  private readonly runs = new Map<string, RunRecord>();

  createRun(input: CreateRunInput): string {
    const id = randomUUID();
    const record: RunRecord = {
      id,
      status: "queued",
      code: input.code,
      language: input.language,
      createdAt: Date.now(),
      events: [],
      nextEventId: 1,
      listeners: new Set(),
      abortController: new AbortController(),
    };
    this.runs.set(id, record);
    this.emit(record, "queued", { message: "Execution queued" });
    queueMicrotask(() => {
      void this.startRun(id);
    });
    this.gc();
    return id;
  }

  getStatus(runId: string): RunStatus | null {
    return this.runs.get(runId)?.status ?? null;
  }

  getEventsSince(runId: string, lastSeenEventId: number): RunEvent[] {
    const run = this.runs.get(runId);
    if (!run) return [];
    return run.events.filter((event) => event.id > lastSeenEventId);
  }

  subscribe(runId: string, listener: (event: RunEvent) => void): (() => void) | null {
    const run = this.runs.get(runId);
    if (!run) return null;
    run.listeners.add(listener);
    return () => {
      run.listeners.delete(listener);
    };
  }

  cancel(runId: string): boolean {
    const run = this.runs.get(runId);
    if (!run) return false;
    if (run.status === "completed" || run.status === "failed" || run.status === "cancelled") {
      return false;
    }
    run.abortController.abort();
    run.status = "cancelled";
    run.finishedAt = Date.now();
    this.emit(run, "cancelled", { message: "Execution cancelled" });
    return true;
  }

  private async startRun(runId: string): Promise<void> {
    const run = this.runs.get(runId);
    if (!run || run.status !== "queued") return;

    run.status = "running";
    run.startedAt = Date.now();
    this.emit(run, "running", {
      language: run.language,
      message: "Execution started",
    });

    try {
      const result = await executeCode(run.code, run.language, {
        signal: run.abortController.signal,
        onLog: ({ stream, chunk }) => {
          this.emit(run, "log", { stream, chunk });
        },
      });

      if (run.abortController.signal.aborted) {
        if (run.status !== "cancelled") {
          run.status = "cancelled";
          this.emit(run, "cancelled", { message: "Execution cancelled" });
        }
        run.finishedAt = Date.now();
        return;
      }

      run.status = "completed";
      run.finishedAt = Date.now();
      this.emit(run, "completed", result as ExecutionResult);
    } catch (error) {
      if (run.abortController.signal.aborted) {
        if (run.status !== "cancelled") {
          run.status = "cancelled";
          this.emit(run, "cancelled", { message: "Execution cancelled" });
        }
      } else {
        run.status = "failed";
        this.emit(run, "failed", {
          message:
            error instanceof Error ? error.message : "Execution failed unexpectedly",
        });
      }
      run.finishedAt = Date.now();
    } finally {
      this.gc();
    }
  }

  private emit(run: RunRecord, type: RunEventType, data?: unknown): void {
    const event: RunEvent = {
      id: run.nextEventId++,
      runId: run.id,
      type,
      timestamp: new Date().toISOString(),
      data,
    };
    run.events.push(event);
    for (const listener of run.listeners) {
      listener(event);
    }
  }

  private gc(): void {
    const now = Date.now();
    for (const [runId, run] of this.runs.entries()) {
      const age = now - (run.finishedAt ?? run.createdAt);
      if (age > RUN_TTL_MS) {
        this.runs.delete(runId);
      }
    }
  }
}

const globalForRuns = globalThis as unknown as {
  __executionRunStore?: ExecutionRunStore;
};

export const executionRunStore =
  globalForRuns.__executionRunStore ?? new ExecutionRunStore();

if (!globalForRuns.__executionRunStore) {
  globalForRuns.__executionRunStore = executionRunStore;
}
