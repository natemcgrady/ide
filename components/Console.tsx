"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2 } from "lucide-react";

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
  onClear,
}: ConsoleProps) {
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, error]);

  const hasContent = output || error;

  return (
    <div className="flex h-full flex-col border-t-2 border-muted-foreground/25 bg-background">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Console
          </span>
          {isRunning && (
            <Badge className="gap-1.5">
              <Loader2 className="size-3 animate-spin" />
              Running...
            </Badge>
          )}
          {!isRunning && executionTime !== undefined && executionTime > 0 && (
            <Badge className="text-xs">{executionTime}ms</Badge>
          )}
        </div>
        <Button size="sm" onClick={onClear}>
          <Trash2 className="size-4" />
          Clear
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div ref={outputRef} className="p-4 font-mono text-sm">
          {!hasContent && !isRunning && (
            <span className="text-muted-foreground/50">
              Press Cmd/Ctrl + Enter or click Run to execute your code
            </span>
          )}

          {output && (
            <pre className="whitespace-pre-wrap text-foreground">{output}</pre>
          )}

          {error && (
            <pre className="mt-2 whitespace-pre-wrap text-destructive">
              {error}
            </pre>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
