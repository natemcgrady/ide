'use client';

import type { CodeSnippet } from '@/lib/db/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, FileCode, Loader2 } from 'lucide-react';

interface SnippetsListProps {
  isOpen: boolean;
  onClose: () => void;
  snippets: CodeSnippet[];
  onLoad: (snippet: CodeSnippet) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

const languageColors: Record<string, string> = {
  javascript: 'bg-yellow-500',
  typescript: 'bg-blue-500',
  python: 'bg-green-500',
  go: 'bg-cyan-500',
};

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
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : snippets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileCode className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No saved snippets yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Save your code to access it later
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {snippets.map((snippet) => (
                <div
                  key={snippet.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                >
                  <button
                    onClick={() => onLoad(snippet)}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <span 
                      className={`w-2 h-2 rounded-full ${languageColors[snippet.language] || 'bg-gray-500'}`} 
                    />
                    <div>
                      <div className="font-medium">{snippet.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {snippet.language} • {new Date(snippet.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(snippet.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
