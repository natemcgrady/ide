'use client';

import type { Language } from '@/lib/executor';
import LanguageSelector from './LanguageSelector';

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
    <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-[#c9d1d9] tracking-tight">
          Interview IDE
        </h1>
        <LanguageSelector language={language} onChange={onLanguageChange} />
        {currentSnippetName && (
          <div className="flex items-center gap-2 px-3 py-1 bg-[#21262d] rounded-md">
            <span className="text-sm text-[#8b949e]">{currentSnippetName}</span>
            {hasUnsavedChanges && (
              <span className="w-2 h-2 bg-[#f0883e] rounded-full" title="Unsaved changes" />
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Load Button */}
        <button
          onClick={onLoad}
          className="flex items-center gap-2 px-3 py-1.5 text-[#c9d1d9] hover:bg-[#21262d] 
                     text-sm rounded-md transition-colors border border-[#30363d]"
          title="Load snippet"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
          </svg>
          Open
        </button>

        {/* Save Button */}
        <button
          onClick={onSave}
          className="flex items-center gap-2 px-3 py-1.5 text-[#c9d1d9] hover:bg-[#21262d] 
                     text-sm rounded-md transition-colors border border-[#30363d]"
          title="Save snippet (Cmd/Ctrl+S)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save
        </button>

        {/* Run Button */}
        <button
          onClick={onRun}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-1.5 bg-[#238636] hover:bg-[#2ea043] 
                     disabled:bg-[#238636]/50 disabled:cursor-not-allowed
                     text-white text-sm font-medium rounded-md transition-colors"
        >
          {isRunning ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Running...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Run
            </>
          )}
        </button>
      </div>
    </div>
  );
}
