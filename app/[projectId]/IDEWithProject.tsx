"use client";

import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
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
import ShareDialog from "@/components/ShareDialog";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Loader2, Play, Share2 } from "lucide-react";
import { inferLanguageFromTitle } from "@/lib/languages";

const CollaborativeEditor = lazy(() => import("@/components/CollaborativeEditor"));

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

interface ProjectFile {
  id: string;
  title: string;
  contentText: string;
}

interface IDEWithProjectProps {
  projectId: string;
  initialProjectName: string;
  initialFiles: ProjectFile[];
  canWrite: boolean;
  currentUser: CurrentUserInfo;
}

function getUniqueUntitledFileName(files: ProjectFile[]): string {
  const existing = new Set(files.map((file) => file.title.toLowerCase()));
  if (!existing.has("untitled.py")) {
    return "untitled.py";
  }

  let index = 1;
  while (existing.has(`untitled-${index}.py`)) {
    index += 1;
  }
  return `untitled-${index}.py`;
}

export default function IDEWithProject({
  projectId,
  initialProjectName,
  initialFiles,
  canWrite,
  currentUser,
}: IDEWithProjectProps) {
  const [editorMounted, setEditorMounted] = useState(false);
  useEffect(() => setEditorMounted(true), []);

  const [isRunning, setIsRunning] = useState(false);
  const [projectName] = useState<string>(initialProjectName);
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles);
  const [activeFileId, setActiveFileId] = useState<string | null>(
    initialFiles[0]?.id ?? null
  );
  const activeFile = files.find((file) => file.id === activeFileId) ?? null;

  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [executionTime, setExecutionTime] = useState<number | undefined>(
    undefined
  );
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>(
    []
  );
  const [shareOpen, setShareOpen] = useState(false);
  const getCodeRef = useRef<(() => string) | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const activeRunIdRef = useRef<string | null>(null);
  const lastEventIdRef = useRef(0);
  const reconnectAttemptsRef = useRef(0);
  const userCancelledRef = useRef(false);
  const canEditFiles = Boolean(projectId && canWrite);
  const selfCollaborator = collaborators.find((c) => c.isSelf);
  const hasOtherCollaborators = collaborators.some((c) => !c.isSelf);
  const userAvatarCollabColor =
    activeFileId && hasOtherCollaborators ? selfCollaborator?.color : undefined;
  const otherCollaborators = collaborators.filter((c) => !c.isSelf);
  const showCollabGroup = Boolean(activeFileId && canWrite);

  useEffect(() => {
    setCollaborators([]);
  }, [activeFileId]);

  const closeStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const handleSelectFile = useCallback((fileId: string) => {
    setActiveFileId(fileId);
    setOutput("");
    setError("");
    setExecutionTime(undefined);
  }, []);

  const handleTitleChange = useCallback(
    async (fileId: string, newTitle: string) => {
      const previousFiles = files;
      setFiles((current) =>
        current.map((file) =>
          file.id === fileId ? { ...file, title: newTitle } : file
        )
      );
      try {
        await fetch(`/api/files/${fileId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });
      } catch {
        setFiles(previousFiles);
      }
    },
    [files]
  );

  const handleCreateFile = useCallback(async () => {
    if (!canWrite) return;
    const nextFileName = getUniqueUntitledFileName(files);
    try {
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: nextFileName,
          contentText: "",
        }),
      });
      if (!response.ok) {
        return;
      }
      const file = (await response.json()) as ProjectFile;
      setFiles((current) => [file, ...current]);
      setActiveFileId(file.id);
    } catch {
      // Ignore create errors to keep UX responsive.
    }
  }, [canWrite, files, projectId]);

  const handleDeleteFile = useCallback(
    async (fileId: string) => {
      if (!canWrite) return;
      const previousFiles = files;
      const deletedIndex = files.findIndex((file) => file.id === fileId);
      const remainingFiles = files.filter((file) => file.id !== fileId);
      setFiles(remainingFiles);

      if (activeFileId === fileId) {
        const fallbackIndex = Math.max(0, Math.min(deletedIndex, remainingFiles.length - 1));
        setActiveFileId(remainingFiles[fallbackIndex]?.id ?? null);
      }

      try {
        const response = await fetch(`/api/files/${fileId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Failed to delete file");
        }
      } catch {
        setFiles(previousFiles);
        if (activeFileId === fileId) {
          setActiveFileId(fileId);
        }
      }
    },
    [activeFileId, canWrite, files]
  );

  const preloadEditor = useCallback(() => {
    if (typeof window !== "undefined") {
      void import("@/components/Editor");
    }
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
    [closeStream, isRunning]
  );

  const handleRun = useCallback(() => {
    if (isRunning || !activeFile) return;
    const code = getCodeRef.current?.() ?? activeFile.contentText;
    const language = inferLanguageFromTitle(activeFile.title);
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
  }, [activeFile, closeStream, connectToRunEvents, isRunning]);

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
          Math.min(CONSOLE_MAX_HEIGHT, Math.round(h + delta))
        )
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
        projectName={projectName}
        files={files.map((file) => ({ id: file.id, title: file.title }))}
        activeFileId={activeFileId}
        canEditFiles={canEditFiles}
        onSelectFile={handleSelectFile}
        onRenameFile={handleTitleChange}
        onCreateFile={handleCreateFile}
        onDeleteFile={handleDeleteFile}
      />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-1 data-[orientation=vertical]:h-4"
          />
          <span className="min-w-0 max-w-64 truncate font-semibold text-foreground">
            {activeFile?.title ?? "No file selected"}
          </span>
          <div className="ml-auto flex items-center gap-2">
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
                  aria-label="Share project"
                  title="Share project"
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
                disabled={!handleCancel || !activeFile}
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
                disabled={!activeFile}
              >
                <Play className="size-4" />
                Run
              </Button>
            )}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col bg-background">
          <div className="min-h-0 flex-1 overflow-hidden">
            {!activeFile ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Create or select a file to start editing.
              </div>
            ) : editorMounted ? (
              <Suspense fallback={<EditorLoading />}>
                <CollaborativeEditor
                  key={activeFile.id}
                  fileId={activeFile.id}
                  fileTitle={activeFile.title}
                  initialCode={activeFile.contentText}
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
      {shareOpen && projectId && (
        <ShareDialog projectId={projectId} onClose={() => setShareOpen(false)} />
      )}
    </SidebarProvider>
  );
}
