"use client";

import { useState, useCallback, useTransition, useRef } from "react";
import dynamic from "next/dynamic";
import type { Language } from "@/lib/executor";
import Console from "@/components/Console";
import Toolbar from "@/components/Toolbar";
import type { CollaboratorPresence } from "@/components/CollaborativeEditor";

const CollaborativeEditor = dynamic(
  () => import("@/components/CollaborativeEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Loading editor...</span>
      </div>
    ),
  }
);

interface ExecutionResult {
  output: string;
  error: string;
  exitCode: number;
  executionTime: number;
}

interface IDEWithFileProps {
  fileId: string;
  initialTitle: string;
  initialLanguage: Language;
  initialCode: string;
  canWrite: boolean;
}

export default function IDEWithFile({
  fileId,
  initialTitle,
  initialLanguage,
  initialCode,
  canWrite,
}: IDEWithFileProps) {
  const [isPending, startTransition] = useTransition();
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [executionTime, setExecutionTime] = useState<number | undefined>(
    undefined
  );
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const getCodeRef = useRef<(() => string) | null>(null);

  const handleLanguageChange = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage);
    setOutput("");
    setError("");
    setExecutionTime(undefined);
  }, []);

  const handleRun = useCallback(() => {
    if (isPending) return;
    const code = getCodeRef.current?.() ?? initialCode;
    startTransition(async () => {
      setOutput("");
      setError("");
      setExecutionTime(undefined);

      try {
        const response = await fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language }),
        });

        const result: ExecutionResult = await response.json();

        startTransition(() => {
          setOutput(result.output);
          setError(result.error);
          setExecutionTime(result.executionTime);
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to execute code";
        startTransition(() => setError(message));
      }
    });
  }, [language, isPending, initialCode]);

  const handleClear = useCallback(() => {
    setOutput("");
    setError("");
    setExecutionTime(undefined);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background">
      <Toolbar
        fileId={fileId}
        fileTitle={initialTitle}
        language={language}
        onLanguageChange={handleLanguageChange}
        onRun={handleRun}
        isRunning={isPending}
        canWrite={canWrite}
        collaborators={collaborators}
      />

      <div className="grid min-h-0 flex-1 grid-rows-[6fr_4fr]">
        <div className="min-h-0 overflow-hidden">
          <CollaborativeEditor
            fileId={fileId}
            language={language}
            initialCode={initialCode}
            onRun={handleRun}
            readOnly={!canWrite}
            onPresenceChange={setCollaborators}
            getCodeRef={getCodeRef}
          />
        </div>

        <div className="min-h-0 overflow-hidden">
          <Console
            output={output}
            error={error}
            isRunning={isPending}
            executionTime={executionTime}
            onClear={handleClear}
          />
        </div>
      </div>
    </div>
  );
}
