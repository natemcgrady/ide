'use client';

import { useEffect, useRef } from 'react';

interface ConsoleProps {
  output: string;
  error: string;
  isRunning: boolean;
  executionTime?: number;
  onClear: () => void;
}

export default function Console({ 
  output, 
  error, 
  isRunning, 
  executionTime,
  onClear 
}: ConsoleProps) {
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, error]);

  const hasContent = output || error;

  return (
    <div className="h-full flex flex-col bg-[#0d1117] border-t border-[#30363d]">
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[#8b949e]">Console</span>
          {isRunning && (
            <span className="flex items-center gap-2 text-xs text-[#58a6ff]">
              <span className="inline-block w-2 h-2 bg-[#58a6ff] rounded-full animate-pulse" />
              Running...
            </span>
          )}
          {!isRunning && executionTime !== undefined && executionTime > 0 && (
            <span className="text-xs text-[#8b949e]">
              Executed in {executionTime}ms
            </span>
          )}
        </div>
        <button
          onClick={onClear}
          className="px-2 py-1 text-xs text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] rounded transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Console Output */}
      <div 
        ref={outputRef}
        className="flex-1 overflow-auto p-4 font-mono text-sm"
      >
        {!hasContent && !isRunning && (
          <span className="text-[#484f58]">
            Press Cmd/Ctrl + Enter or click Run to execute your code
          </span>
        )}
        
        {output && (
          <pre className="whitespace-pre-wrap text-[#c9d1d9]">{output}</pre>
        )}
        
        {error && (
          <pre className="whitespace-pre-wrap text-[#f85149] mt-2">{error}</pre>
        )}
      </div>
    </div>
  );
}

