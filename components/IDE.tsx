"use client";

import { useState, useCallback, useTransition } from "react";
import dynamic from "next/dynamic";
import type { Language } from "@/lib/executor";
import Console from "./Console";
import Toolbar from "./Toolbar";
import languageTemplates from "@/lib/code-templates";

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <span className="text-sm text-muted-foreground">Loading editor...</span>
    </div>
  ),
});

interface ExecutionResult {
  output: string;
  error: string;
  exitCode: number;
  executionTime: number;
}

export default function IDE() {
  const [isPending, startTransition] = useTransition();
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState<string>(languageTemplates.python);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [executionTime, setExecutionTime] = useState<number | undefined>(
    undefined,
  );

  const handleLanguageChange = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage);
    setCode(languageTemplates[newLanguage]);
    // Clear console when switching languages
    setOutput("");
    setError("");
    setExecutionTime(undefined);
  }, []);

  const handleCodeChange = useCallback((value: string | undefined) => {
    setCode(value || "");
  }, []);

  const handleRun = useCallback(() => {
    if (isPending) return;
    startTransition(async () => {
      setOutput("");
      setError("");
      setExecutionTime(undefined);

      try {
        const response = await fetch("/api/execute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, language }),
        });

        const result: ExecutionResult = await response.json();

        startTransition(() => {
          setOutput(result.output);
          setError(result.error);
          setExecutionTime(result.executionTime);
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to execute code";
        startTransition(() => setError(message));
      }
    });
  }, [code, language, isPending]);

  const handleClear = useCallback(() => {
    setOutput("");
    setError("");
    setExecutionTime(undefined);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background">
      <Toolbar
        language={language}
        onLanguageChange={handleLanguageChange}
        onRun={handleRun}
        isRunning={isPending}
      />

      <div className="grid min-h-0 flex-1 grid-rows-[6fr_4fr]">
        <div className="min-h-0 overflow-hidden">
          <Editor
            code={code}
            language={language}
            onChange={handleCodeChange}
            onRun={handleRun}
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
