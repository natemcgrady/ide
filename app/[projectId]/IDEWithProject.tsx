"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  lazy,
  Suspense,
  useMemo,
  useTransition,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
import { queryKeys } from "@/lib/queries/keys";
import {
  createProjectFile,
  deleteProjectFile,
  fetchProjectFiles,
  type ProjectFile,
  updateProjectFile,
} from "@/lib/queries/projects";

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

interface IDEWithProjectProps {
  projectId: string;
  initialProjectName: string;
  initialFiles: ProjectFile[];
  canWrite: boolean;
  currentUser: CurrentUserInfo;
}

const MAX_CACHED_EDITORS = 5;

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

  const queryClient = useQueryClient();
  const filesQueryKey = queryKeys.projects.files(projectId);
  const { data: files = initialFiles } = useQuery({
    queryKey: filesQueryKey,
    queryFn: () => fetchProjectFiles(projectId),
    initialData: initialFiles,
    staleTime: 30_000,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [projectName] = useState<string>(initialProjectName);
  const [activeFileId, setActiveFileId] = useState<string | null>(
    initialFiles[0]?.id ?? null,
  );
  const [visibleFileId, setVisibleFileId] = useState<string | null>(
    initialFiles[0]?.id ?? null,
  );
  const [isSwitchPending, startSelectionTransition] = useTransition();
  const [mountedEditorFileIds, setMountedEditorFileIds] = useState<string[]>(
    initialFiles[0]?.id ? [initialFiles[0].id] : [],
  );
  const [readyEditorFileIds, setReadyEditorFileIds] = useState<
    Record<string, boolean>
  >({});
  const [collaboratorsByFileId, setCollaboratorsByFileId] = useState<
    Record<string, CollaboratorPresence[]>
  >({});

  const filesById = useMemo(
    () => new Map(files.map((file) => [file.id, file])),
    [files],
  );
  const activeFile = activeFileId ? (filesById.get(activeFileId) ?? null) : null;
  const visibleFile = visibleFileId
    ? (filesById.get(visibleFileId) ?? null)
    : null;
  const visibleCollaborators = visibleFileId
    ? (collaboratorsByFileId[visibleFileId] ?? [])
    : [];
  const isSwitchingFile =
    Boolean(activeFileId) && activeFileId !== visibleFileId;

  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [executionTime, setExecutionTime] = useState<number | undefined>(
    undefined,
  );
  const [shareOpen, setShareOpen] = useState(false);
  const codeRefByFileId = useRef<
    Map<string, React.MutableRefObject<(() => string) | null>>
  >(new Map());
  const eventSourceRef = useRef<EventSource | null>(null);
  const activeRunIdRef = useRef<string | null>(null);
  const lastEventIdRef = useRef(0);
  const reconnectAttemptsRef = useRef(0);
  const userCancelledRef = useRef(false);
  const canEditFiles = Boolean(projectId && canWrite);
  const selfCollaborator = visibleCollaborators.find((c) => c.isSelf);
  const hasOtherCollaborators = visibleCollaborators.some((c) => !c.isSelf);
  const userAvatarCollabColor =
    visibleFileId && hasOtherCollaborators ? selfCollaborator?.color : undefined;
  const otherCollaborators = visibleCollaborators.filter((c) => !c.isSelf);
  const showCollabGroup = Boolean(visibleFileId && canWrite);

  const getCodeRefForFile = useCallback((fileId: string) => {
    const existing = codeRefByFileId.current.get(fileId);
    if (existing) {
      return existing;
    }
    const next: React.MutableRefObject<(() => string) | null> = {
      current: null,
    };
    codeRefByFileId.current.set(fileId, next);
    return next;
  }, []);

  const mountEditorSession = useCallback(
    (fileId: string) => {
      setMountedEditorFileIds((current) => {
        if (current.includes(fileId)) {
          return current;
        }
        const next = [...current, fileId];
        if (next.length <= MAX_CACHED_EDITORS) {
          return next;
        }
        const removableId = next.find(
          (id) => id !== fileId && id !== visibleFileId,
        );
        if (!removableId) {
          return next;
        }
        return next.filter((id) => id !== removableId);
      });
    },
    [visibleFileId],
  );

  const createFileMutation = useMutation({
    mutationFn: (nextFileName: string) =>
      createProjectFile(projectId, {
        title: nextFileName,
        contentText: "",
      }),
    onSuccess: (file) => {
      queryClient.setQueryData<ProjectFile[]>(filesQueryKey, (current = []) => [
        file,
        ...current.filter((entry) => entry.id !== file.id),
      ]);
      setActiveFileId(file.id);
      mountEditorSession(file.id);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: filesQueryKey });
    },
  });

  const renameFileMutation = useMutation({
    mutationFn: ({ fileId, newTitle }: { fileId: string; newTitle: string }) =>
      updateProjectFile(fileId, { title: newTitle }),
    onMutate: async ({ fileId, newTitle }) => {
      await queryClient.cancelQueries({ queryKey: filesQueryKey });
      const previous = queryClient.getQueryData<ProjectFile[]>(filesQueryKey) ?? [];
      queryClient.setQueryData<ProjectFile[]>(filesQueryKey, (current = []) =>
        current.map((file) =>
          file.id === fileId ? { ...file, title: newTitle } : file,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(filesQueryKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: filesQueryKey });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => deleteProjectFile(fileId),
    onMutate: async (fileId) => {
      await queryClient.cancelQueries({ queryKey: filesQueryKey });
      const previous = queryClient.getQueryData<ProjectFile[]>(filesQueryKey) ?? [];
      const deletedIndex = previous.findIndex((file) => file.id === fileId);
      const remaining = previous.filter((file) => file.id !== fileId);

      queryClient.setQueryData<ProjectFile[]>(filesQueryKey, remaining);
      setMountedEditorFileIds((current) => current.filter((id) => id !== fileId));
      setReadyEditorFileIds((current) => {
        if (!(fileId in current)) return current;
        const { [fileId]: _removed, ...rest } = current;
        return rest;
      });
      setCollaboratorsByFileId((current) => {
        if (!(fileId in current)) return current;
        const { [fileId]: _removed, ...rest } = current;
        return rest;
      });
      codeRefByFileId.current.delete(fileId);

      const fallbackIndex = Math.max(0, Math.min(deletedIndex, remaining.length - 1));
      const fallbackFileId = remaining[fallbackIndex]?.id ?? null;

      if (activeFileId === fileId) {
        setActiveFileId(fallbackFileId);
      }
      if (visibleFileId === fileId) {
        setVisibleFileId(fallbackFileId);
      }

      return {
        previous,
        deletedFileId: fileId,
        activeBeforeDelete: activeFileId,
        visibleBeforeDelete: visibleFileId,
      };
    },
    onError: (_error, _fileId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(filesQueryKey, context.previous);
        const restored = context.previous.find(
          (file) => file.id === context.deletedFileId,
        );
        if (restored) {
          mountEditorSession(restored.id);
        }
        setActiveFileId(context.activeBeforeDelete ?? null);
        setVisibleFileId(context.visibleBeforeDelete ?? null);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: filesQueryKey });
    },
  });

  useEffect(() => {
    const existingIds = new Set(files.map((file) => file.id));

    setMountedEditorFileIds((current) =>
      current.filter((fileId) => existingIds.has(fileId)),
    );
    setReadyEditorFileIds((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([fileId]) => existingIds.has(fileId)),
      ),
    );
    setCollaboratorsByFileId((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([fileId]) => existingIds.has(fileId)),
      ),
    );
    for (const fileId of Array.from(codeRefByFileId.current.keys())) {
      if (!existingIds.has(fileId)) {
        codeRefByFileId.current.delete(fileId);
      }
    }

    if (!activeFileId && files[0]?.id) {
      setActiveFileId(files[0].id);
    } else if (activeFileId && !existingIds.has(activeFileId)) {
      const fallbackFileId = files[0]?.id ?? null;
      setActiveFileId(fallbackFileId);
      setVisibleFileId(fallbackFileId);
    }

    if (!visibleFileId && files[0]?.id) {
      setVisibleFileId(files[0].id);
    } else if (visibleFileId && !existingIds.has(visibleFileId)) {
      const fallbackFileId =
        activeFileId && existingIds.has(activeFileId)
          ? activeFileId
          : (files[0]?.id ?? null);
      setVisibleFileId(fallbackFileId);
    }
  }, [activeFileId, files, visibleFileId]);

  useEffect(() => {
    if (activeFileId) {
      mountEditorSession(activeFileId);
      if (readyEditorFileIds[activeFileId]) {
        setVisibleFileId(activeFileId);
      }
    }
  }, [activeFileId, mountEditorSession, readyEditorFileIds]);

  const closeStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const handleSelectFile = useCallback(
    (fileId: string) => {
      setActiveFileId(fileId);
      mountEditorSession(fileId);
      if (readyEditorFileIds[fileId]) {
        startSelectionTransition(() => {
          setVisibleFileId(fileId);
        });
      }
      setOutput("");
      setError("");
      setExecutionTime(undefined);
    },
    [mountEditorSession, readyEditorFileIds, startSelectionTransition],
  );

  const handleTitleChange = useCallback((fileId: string, newTitle: string) => {
    renameFileMutation.mutate({ fileId, newTitle });
  }, [renameFileMutation]);

  const handleCreateFile = useCallback(() => {
    if (!canWrite) return;
    const nextFileName = getUniqueUntitledFileName(files);
    createFileMutation.mutate(nextFileName);
  }, [canWrite, createFileMutation, files]);

  const handleDeleteFile = useCallback((fileId: string) => {
    if (!canWrite) return;
    deleteFileMutation.mutate(fileId);
  }, [canWrite, deleteFileMutation]);

  const preloadEditor = useCallback(() => {
    if (typeof window !== "undefined") {
      void import("@/components/CollaborativeEditor");
    }
  }, []);

  const handleEditorReady = useCallback(
    (fileId: string) => {
      setReadyEditorFileIds((current) =>
        current[fileId] ? current : { ...current, [fileId]: true },
      );
      if (activeFileId === fileId) {
        startSelectionTransition(() => {
          setVisibleFileId(fileId);
        });
      }
    },
    [activeFileId, startSelectionTransition],
  );

  const handlePresenceChange = useCallback(
    (fileId: string, users: CollaboratorPresence[]) => {
      setCollaboratorsByFileId((current) => ({
        ...current,
        [fileId]: users,
      }));
    },
    [],
  );

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
    if (isRunning || !visibleFile || isSwitchingFile) return;
    const code =
      codeRefByFileId.current.get(visibleFile.id)?.current?.() ??
      visibleFile.contentText;
    const language = inferLanguageFromTitle(visibleFile.title);
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
  }, [closeStream, connectToRunEvents, isRunning, isSwitchingFile, visibleFile]);

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
          {isSwitchingFile ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Opening…
            </span>
          ) : null}
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
                disabled={!handleCancel || !visibleFile || isSwitchingFile}
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
                disabled={!visibleFile || isSwitchingFile || isSwitchPending}
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
                <div className="relative h-full w-full">
                  {mountedEditorFileIds.map((fileId) => {
                    const file = filesById.get(fileId);
                    if (!file) return null;
                    const isVisible = fileId === visibleFileId;
                    return (
                      <div
                        key={file.id}
                        className={isVisible ? "h-full w-full" : "hidden h-full w-full"}
                        aria-hidden={!isVisible}
                      >
                        <CollaborativeEditor
                          fileId={file.id}
                          fileTitle={file.title}
                          initialCode={file.contentText}
                          onRun={handleRun}
                          readOnly={!canWrite}
                          onPresenceChange={(users) =>
                            handlePresenceChange(file.id, users)
                          }
                          onReady={handleEditorReady}
                          getCodeRef={getCodeRefForFile(file.id)}
                          currentUser={currentUser}
                        />
                      </div>
                    );
                  })}
                </div>
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
