"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import useSWR from "swr";
import type { Language } from "@/lib/executor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LanguageSelector from "./LanguageSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { Play, Loader2, LogOut, User, ArrowLeft, Share2, Pencil, Trash2 } from "lucide-react";
import ShareDialog from "./ShareDialog";

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  avatar: string | null;
}

const userFetcher = async (url: string): Promise<UserData | null> => {
  const res = await fetch(url);
  return res.ok ? res.json() : null;
};

export interface CollaboratorPresence {
  userId: string;
  name: string;
  avatar: string | null;
  color: string;
}

interface ToolbarProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  onRun: () => void;
  onCancel?: () => void;
  isRunning: boolean;
  fileId?: string;
  fileTitle?: string;
  onTitleChange?: (title: string) => void;
  onDelete?: () => void | Promise<void>;
  canWrite?: boolean;
  collaborators?: CollaboratorPresence[];
}

export default function Toolbar({
  language,
  onLanguageChange,
  onRun,
  onCancel,
  isRunning,
  fileId,
  fileTitle,
  onTitleChange,
  onDelete,
  canWrite = true,
  collaborators = [],
}: ToolbarProps) {
  const [isPending, startTransition] = useTransition();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: user } = useSWR("/api/auth/me", userFetcher, {
    revalidateOnFocus: false,
  });

  const canEditTitle = Boolean(fileId && canWrite && onTitleChange);

  const startEditingTitle = () => {
    if (!canEditTitle) return;
    setEditTitleValue(fileTitle || "Untitled");
    setIsEditingTitle(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const saveTitle = () => {
    const trimmed = editTitleValue.trim() || "Untitled";
    if (trimmed !== (fileTitle || "Untitled")) {
      onTitleChange?.(trimmed);
    }
    setIsEditingTitle(false);
  };

  useEffect(() => {
    if (isEditingTitle) {
      inputRef.current?.select();
    }
  }, [isEditingTitle]);

  const handleSignOut = () => {
    startTransition(async () => {
      await fetch("/api/auth/signout", { method: "POST" });
      window.location.href = "/sign-in";
    });
  };

  const preloadEditor = () => {
    if (typeof window !== "undefined") {
      void import("./Editor");
    }
  };

  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      setDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
      <div className="flex items-center gap-4">
        {fileId ? (
          <>
            <Link
              href="/"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back
            </Link>
            {isEditingTitle ? (
              <Input
                ref={inputRef}
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveTitle();
                  }
                  if (e.key === "Escape") {
                    setEditTitleValue(fileTitle || "Untitled");
                    setIsEditingTitle(false);
                  }
                }}
                className="h-8 w-48 text-lg font-semibold"
                maxLength={255}
                aria-label="File name"
              />
            ) : (
              <button
                type="button"
                onClick={startEditingTitle}
                className={`flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground ${canEditTitle ? "cursor-pointer rounded px-1 py-0.5 transition-colors hover:bg-muted/50" : ""}`}
                aria-label={canEditTitle ? "Click to rename file" : undefined}
              >
                {fileTitle || "Untitled"}
                {canEditTitle && (
                  <Pencil className="size-3.5 shrink-0 text-muted-foreground opacity-60" />
                )}
              </button>
            )}
          </>
        ) : (
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            IDE
          </h1>
        )}
        <LanguageSelector
          language={language}
          onChange={onLanguageChange}
          disabled={!canWrite}
        />
      </div>

      <div className="flex items-center gap-3">
        {collaborators.length > 0 && (
          <div className="flex items-center gap-1" aria-label="Active collaborators">
            {collaborators.map((c) => (
              <div
                key={c.userId}
                className="relative"
                title={`${c.name} (${c.color})`}
              >
                <div
                  className="flex size-8 items-center justify-center overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-background"
                  style={{
                    borderColor: c.color,
                    boxShadow: `0 0 0 2px ${c.color}`,
                  }}
                >
                  {c.avatar ? (
                    <img
                      src={c.avatar}
                      alt={c.name}
                      className="size-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span
                      className="text-xs font-medium"
                      style={{ color: c.color }}
                    >
                      {c.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {fileId && canWrite && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareOpen(true)}
            aria-label="Share file"
          >
            <Share2 className="size-4" />
            Share
          </Button>
        )}
        {fileId && onDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            aria-label="Delete file"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        )}
        {isRunning ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={onCancel}
            disabled={!onCancel}
          >
            <Loader2 className="size-4 animate-spin" />
            Cancel
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onRun}
            onMouseEnter={preloadEditor}
            onFocus={preloadEditor}
          >
            <Play className="size-4" />
            Run
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border bg-muted ring-offset-background transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              disabled={isPending}
              aria-label="User menu"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name ?? "User avatar"}
                  className="size-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-sm font-medium text-muted-foreground">
                  {user ? initials : <User className="size-5" />}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuItem onClick={handleSignOut} disabled={isPending}>
              {isPending ? (
                <span className="animate-spin">
                  <Loader2 className="size-4" />
                </span>
              ) : (
                <LogOut className="size-4" />
              )}
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {shareOpen && fileId && (
          <ShareDialog fileId={fileId} onClose={() => setShareOpen(false)} />
        )}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete file?</DialogTitle>
              <DialogDescription>
                This will permanently delete "{fileTitle || "Untitled"}". This action cannot be undone.
              </DialogDescription>
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
                onClick={handleDeleteClick}
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
      </div>
    </div>
  );
}
