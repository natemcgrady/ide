'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2 } from 'lucide-react';

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
    <div className="h-full flex flex-col bg-background border-t">
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Console</span>
          {isRunning && (
            <Badge variant="secondary" className="gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Running...
            </Badge>
          )}
          {!isRunning && executionTime !== undefined && executionTime > 0 && (
            <Badge variant="outline" className="text-xs">
              {executionTime}ms
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>
      </div>

      {/* Console Output */}
      <ScrollArea className="flex-1">
        <div ref={outputRef} className="p-4 font-mono text-sm">
          {!hasContent && !isRunning && (
            <span className="text-muted-foreground/50">
              Press Cmd/Ctrl + Enter or click Run to execute your code
            </span>
          )}
          
          {output && (
            <pre className="whitespace-pre-wrap">{output}</pre>
          )}
          
          {error && (
            <pre className="whitespace-pre-wrap text-destructive mt-2">{error}</pre>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
