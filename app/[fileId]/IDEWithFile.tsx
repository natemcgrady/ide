"use client";

import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import type { Language } from "@/lib/executor";
import Console from "@/components/Console";
import { AppSidebar } from "@/components/app-sidebar";
import type { CollaboratorPresence } from "@/components/CollaborativeEditor";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import LanguageSelector from "@/components/LanguageSelector";
import ShareDialog from "@/components/ShareDialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Loader2, Play, Share2 } from "lucide-react";

const CollaborativeEditor = lazy(
  () => import("@/components/CollaborativeEditor"),
);

function EditorLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <span className="text-sm text-muted-foreground">Loading editor...</span>
    </div>
  );
}

interface ExecutionResult {
  output: string;
  error: string;
  exitCode: number;
  executionTime: number;
}

interface RunEvent {
  id: number;
  runId: string;
  type: "queued" | "running" | "log" | "completed" | "failed" | "cancelled";
  timestamp: string;
  data?: unknown;
}

interface CurrentUserInfo {
  id: string;
  name: string;
  avatar: string | null;
}

interface IDEWithFileProps {
  fileId: string;
  initialTitle: string;
  initialLanguage: Language;
  initialCode: string;
  canWrite: boolean;
  currentUser: CurrentUserInfo;
}

export default function IDEWithFile({
  fileId,
  initialTitle,
  initialLanguage,
  initialCode,
  canWrite,
  currentUser,
}: IDEWithFileProps) {
  const [editorMounted, setEditorMounted] = useState(false);
  useEffect(() => setEditorMounted(true), []);

  const [isRunning, setIsRunning] = useState(false);
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [fileTitle, setFileTitle] = useState<string>(initialTitle);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [executionTime, setExecutionTime] = useState<number | undefined>(
    undefined,
  );
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>(
    [],
  );
  const [shareOpen, setShareOpen] = useState(false);
  const getCodeRef = useRef<(() => string) | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const activeRunIdRef = useRef<string | null>(null);
  const lastEventIdRef = useRef(0);
  const reconnectAttemptsRef = useRef(0);
  const userCancelledRef = useRef(false);
  const canEditTitle = Boolean(fileId && canWrite);
  const selfCollaborator = collaborators.find((c) => c.isSelf);
  const hasOtherCollaborators = collaborators.some((c) => !c.isSelf);
  const userAvatarCollabColor =
    fileId && hasOtherCollaborators ? selfCollaborator?.color : undefined;
  const otherCollaborators = collaborators.filter((c) => !c.isSelf);
  const showCollabGroup = Boolean(fileId && canWrite);

  const closeStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const handleTitleChange = useCallback(
    async (newTitle: string) => {
      const previousTitle = fileTitle;
      setFileTitle(newTitle);
      try {
        await fetch(`/api/files/${fileId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });
      } catch {
        setFileTitle(previousTitle);
      }
    },
    [fileId, fileTitle],
  );

  const preloadEditor = useCallback(() => {
    if (typeof window !== "undefined") {
      void import("@/components/Editor");
    }
  }, []);

  const handleLanguageChange = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage);
    setOutput("");
    setError("");
    setExecutionTime(undefined);
  }, []);

  const connectToRunEvents = useCallback(
    (runId: string, cursor: number) => {
      const params = new URLSearchParams();
      if (cursor > 0) params.set("cursor", String(cursor));
      const qs = params.toString();
      const url = qs
        ? `/api/runs/${runId}/events?${qs}`
        : `/api/runs/${runId}/events`;
      const source = new EventSource(url);
      eventSourceRef.current = source;

      source.onmessage = (event) => {
        const parsed = JSON.parse(event.data) as RunEvent;
        lastEventIdRef.current = Math.max(lastEventIdRef.current, parsed.id);
        reconnectAttemptsRef.current = 0;

        if (parsed.type === "log") {
          const payload = parsed.data as { stream?: string; chunk?: string };
          const chunk = typeof payload.chunk === "string" ? payload.chunk : "";
          if (!chunk) return;
          if (payload.stream === "stderr") {
            setError((prev) => prev + chunk);
          } else {
            setOutput((prev) => prev + chunk);
          }
          return;
        }

        if (parsed.type === "completed") {
          const result = parsed.data as ExecutionResult;
          setOutput((prev) => prev || result.output || "");
          setError((prev) => prev || result.error || "");
          setExecutionTime(result.executionTime);
          setIsRunning(false);
          activeRunIdRef.current = null;
          closeStream();
          return;
        }

        if (parsed.type === "failed") {
          const payload = parsed.data as { message?: string } | undefined;
          setError(payload?.message ?? "Execution failed");
          setIsRunning(false);
          activeRunIdRef.current = null;
          closeStream();
          return;
        }

        if (parsed.type === "cancelled") {
          setError((prev) => prev || "Execution cancelled");
          setIsRunning(false);
          activeRunIdRef.current = null;
          closeStream();
        }
      };

      source.onerror = () => {
        closeStream();
        if (userCancelledRef.current || !activeRunIdRef.current || !isRunning) {
          return;
        }
        if (reconnectAttemptsRef.current >= 3) {
          setError((prev) => prev || "Lost connection to execution stream.");
          setIsRunning(false);
          return;
        }
        reconnectAttemptsRef.current += 1;
        const nextCursor = lastEventIdRef.current;
        setTimeout(() => {
          if (!activeRunIdRef.current || userCancelledRef.current) return;
          connectToRunEvents(runId, nextCursor);
        }, 600);
      };
    },
    [closeStream, isRunning],
  );

  const handleRun = useCallback(() => {
    if (isRunning) return;
    const code = getCodeRef.current?.() ?? initialCode;
    userCancelledRef.current = false;
    closeStream();
    setOutput("");
    setError("");
    setExecutionTime(undefined);
    setIsRunning(true);
    lastEventIdRef.current = 0;
    reconnectAttemptsRef.current = 0;

    void (async () => {
      try {
        const response = await fetch("/api/runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? "Failed to start execution");
        }
        const data = (await response.json()) as { runId: string };
        activeRunIdRef.current = data.runId;
        connectToRunEvents(data.runId, 0);
      } catch (err) {
        setIsRunning(false);
        activeRunIdRef.current = null;
        const message =
          err instanceof Error ? err.message : "Failed to execute code";
        setError(message);
      }
    })();
  }, [closeStream, connectToRunEvents, initialCode, isRunning, language]);

  const handleCancel = useCallback(() => {
    const runId = activeRunIdRef.current;
    if (!runId || !isRunning) return;
    userCancelledRef.current = true;
    void fetch(`/api/runs/${runId}/cancel`, { method: "POST" });
  }, [isRunning]);

  const handleClear = useCallback(() => {
    setOutput("");
    setError("");
    setExecutionTime(undefined);
  }, []);

  useEffect(() => {
    return () => {
      closeStream();
    };
  }, [closeStream]);

  const CONSOLE_MIN_HEIGHT = 120;
  const CONSOLE_DEFAULT_HEIGHT = 280;
  const CONSOLE_MAX_HEIGHT = 600;

  const [consoleHeight, setConsoleHeight] = useState(CONSOLE_DEFAULT_HEIGHT);
  const isResizingRef = useRef(false);
  const lastYRef = useRef(0);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    lastYRef.current = e.clientY;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  }, []);

  const handleResizeDoubleClick = useCallback(() => {
    setConsoleHeight(CONSOLE_DEFAULT_HEIGHT);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = lastYRef.current - e.clientY;
      lastYRef.current = e.clientY;
      setConsoleHeight((h) =>
        Math.max(
          CONSOLE_MIN_HEIGHT,
          Math.min(CONSOLE_MAX_HEIGHT, Math.round(h + delta)),
        ),
      );
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar
        user={currentUser}
        currentFile={{ title: fileTitle, language }}
        canEditFileName={canEditTitle}
        onRenameFile={handleTitleChange}
      />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-1 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb className="min-w-0">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbPage className="text-muted-foreground">
                  Files
                </BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="max-w-64 truncate font-semibold text-foreground">
                  {fileTitle || "Untitled"}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSelector
              language={language}
              onChange={handleLanguageChange}
              disabled={!canWrite}
            />
            {showCollabGroup && (
              <AvatarGroup aria-label="Active collaborators">
                {otherCollaborators.map((c) => (
                  <Avatar
                    key={c.clientId}
                    title={c.name}
                    className="size-8 ring-2 ring-offset-2 ring-offset-background"
                    style={{ boxShadow: `0 0 0 2px ${c.color}` }}
                  >
                    {c.avatar ? (
                      <AvatarImage
                        src={c.avatar}
                        alt={c.name}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <AvatarFallback style={{ color: c.color }}>
                        {c.name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                ))}
                <AvatarGroupCount
                  aria-label="Share file"
                  title="Share file"
                  onClick={() => setShareOpen(true)}
                  style={{
                    borderColor: userAvatarCollabColor,
                    boxShadow: userAvatarCollabColor
                      ? `0 0 0 2px ${userAvatarCollabColor}`
                      : undefined,
                  }}
                >
                  <Share2 className="size-4" />
                </AvatarGroupCount>
              </AvatarGroup>
            )}
            {isRunning ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancel}
                disabled={!handleCancel}
              >
                <Loader2 className="size-4 animate-spin" />
                Cancel
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleRun}
                onMouseEnter={preloadEditor}
                onFocus={preloadEditor}
              >
                <Play className="size-4" />
                Run
              </Button>
            )}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col bg-background">
          <div className="min-h-0 flex-1 overflow-hidden">
            {editorMounted ? (
              <Suspense fallback={<EditorLoading />}>
                <CollaborativeEditor
                  fileId={fileId}
                  language={language}
                  initialCode={initialCode}
                  onRun={handleRun}
                  readOnly={!canWrite}
                  onPresenceChange={setCollaborators}
                  getCodeRef={getCodeRef}
                  currentUser={currentUser}
                />
              </Suspense>
            ) : (
              <EditorLoading />
            )}
          </div>

          <div
            role="separator"
            aria-label="Resize console"
            className="flex shrink-0 cursor-ns-resize select-none items-center justify-center border-t border-border py-1"
            style={{ minHeight: 10 }}
            onMouseDown={handleResizeMouseDown}
            onDoubleClick={handleResizeDoubleClick}
          >
            <div className="h-px w-12 rounded-full bg-muted-foreground" />
          </div>

          <div
            className="shrink-0 overflow-hidden"
            style={{ height: consoleHeight, minHeight: CONSOLE_MIN_HEIGHT }}
          >
            <Console
              output={output}
              error={error}
              isRunning={isRunning}
              executionTime={executionTime}
              onClear={handleClear}
            />
          </div>
        </div>
      </SidebarInset>
      {shareOpen && fileId && (
        <ShareDialog fileId={fileId} onClose={() => setShareOpen(false)} />
      )}
    </SidebarProvider>
  );
}
