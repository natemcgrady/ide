"use client";

import { useState } from "react";
import Link from "next/link";
import { FileCode, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FileListItemProps {
  id: string;
  title: string;
  language: string;
  lastEditedAt: Date;
  collaboratorCount: number;
  isOwner: boolean;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default function FileListItem({
  id,
  title,
  language,
  lastEditedAt,
  collaboratorCount,
  isOwner,
}: FileListItemProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleteError(null);
    setDeleteOpen(false);
    setIsDeleted(true);
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Delete request failed");
      }
    } catch {
      // Roll back optimistic UI on failure.
      setIsDeleted(false);
      setDeleteOpen(true);
      setDeleteError("Could not delete this file. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isDeleted) {
    return null;
  }

  return (
    <li className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/50">
      <Link
        href={`/${id}`}
        className="flex min-w-0 flex-1 items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <FileCode className="size-5 shrink-0 text-muted-foreground" />
          <div>
            <span className="font-medium text-foreground">
              {title || "Untitled"}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              {language}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {collaboratorCount > 0 && (
            <span>{collaboratorCount} shared</span>
          )}
          <span>{formatDate(lastEditedAt)}</span>
        </div>
      </Link>
      {isOwner && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            setDeleteOpen(true);
          }}
          aria-label="Delete file"
          className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      )}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete file?</DialogTitle>
            <DialogDescription>
              This will permanently delete "{title || "Untitled"}". This action
              cannot be undone.
            </DialogDescription>
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
