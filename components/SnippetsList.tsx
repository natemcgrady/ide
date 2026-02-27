"use client";

import type { CodeSnippet } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, FileCode, Loader2 } from "lucide-react";
import { isSupportedLanguage, type SupportedLanguage } from "@/lib/languages";

const languageColors: Record<SupportedLanguage, string> = {
  typescript: "bg-chart-1",
  python: "bg-chart-2",
};

interface SnippetsListProps {
  isOpen: boolean;
  onClose: () => void;
  snippets: CodeSnippet[];
  onLoad: (snippet: CodeSnippet) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

export default function SnippetsList({
  isOpen,
  onClose,
  snippets,
  onLoad,
  onDelete,
  isLoading,
}: SnippetsListProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Saved Snippets</DialogTitle>
          <DialogDescription>
            Select a snippet to load it into the editor.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : snippets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileCode className="mb-3 size-12 text-muted-foreground" />
              <p className="text-muted-foreground">No saved snippets yet</p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Save your code to access it later
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {snippets.map((snippet) => {
                const colorClass = isSupportedLanguage(snippet.language)
                  ? languageColors[snippet.language]
                  : "bg-muted-foreground";

                return (
                  <div
                    key={snippet.id}
                    className="group flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/50"
                  >
                    <Button
                      onClick={() => onLoad(snippet)}
                      className="h-auto flex-1 justify-start gap-3 px-0 py-0 text-left font-normal hover:bg-transparent"
                    >
                      <span className={`size-2 rounded-full ${colorClass}`} />
                      <div className="text-left">
                        <div className="font-medium">{snippet.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {snippet.language} •{" "}
                          {new Date(snippet.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </Button>
                    <Button
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(snippet.id);
                      }}
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
