'use client';

import type { Language } from '@/lib/executor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LanguageSelector from './LanguageSelector';
import { Play, Loader2, FolderOpen, Save } from 'lucide-react';

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
    <div className="flex items-center justify-between px-4 py-3 bg-card border-b">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold tracking-tight">
          Interview IDE
        </h1>
        <LanguageSelector language={language} onChange={onLanguageChange} />
        {currentSnippetName && (
          <Badge variant="secondary" className="gap-2">
            {currentSnippetName}
            {hasUnsavedChanges && (
              <span className="w-2 h-2 bg-orange-500 rounded-full" />
            )}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onLoad}>
          <FolderOpen className="h-4 w-4" />
          Open
        </Button>

        <Button variant="outline" size="sm" onClick={onSave}>
          <Save className="h-4 w-4" />
          Save
        </Button>

        <Button size="sm" onClick={onRun} disabled={isRunning}>
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
