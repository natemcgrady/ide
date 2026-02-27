"use client";

import type { Language } from "@/lib/executor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LanguageSelector from "./LanguageSelector";
import { Play, Loader2, FolderOpen, Save } from "lucide-react";

interface ToolbarProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  onRun: () => void;
  onSave: () => void;
  onLoad: () => void;
  isRunning: boolean;
  currentSnippetName?: string;
  hasUnsavedChanges?: boolean;
}

export default function Toolbar({
  language,
  onLanguageChange,
  onRun,
  onSave,
  onLoad,
  isRunning,
  currentSnippetName,
  hasUnsavedChanges,
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Interview IDE
        </h1>
        <LanguageSelector language={language} onChange={onLanguageChange} />
        {currentSnippetName && (
          <Badge className="gap-2">
            {currentSnippetName}
            {hasUnsavedChanges && (
              <span className="size-2 rounded-full bg-primary" />
            )}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onLoad}>
          <FolderOpen className="size-4" />
          Open
        </Button>

        <Button size="sm" onClick={onSave}>
          <Save className="size-4" />
          Save
        </Button>

        <Button size="sm" onClick={onRun} disabled={isRunning}>
          {isRunning ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="size-4" />
              Run
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
