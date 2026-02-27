"use client";

import { useTransition, useState } from "react";
import useSWR from "swr";
import type { Language } from "@/lib/executor";
import { Button } from "@/components/ui/button";
import LanguageSelector from "./LanguageSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Play, Loader2, LogOut, User, ArrowLeft, Share2 } from "lucide-react";
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
  isRunning: boolean;
  fileId?: string;
  fileTitle?: string;
  canWrite?: boolean;
  collaborators?: CollaboratorPresence[];
}

export default function Toolbar({
  language,
  onLanguageChange,
  onRun,
  isRunning,
  fileId,
  fileTitle,
  canWrite = true,
  collaborators = [],
}: ToolbarProps) {
  const [isPending, startTransition] = useTransition();
  const { data: user } = useSWR("/api/auth/me", userFetcher, {
    revalidateOnFocus: false,
  });

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
              href="/files"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back
            </Link>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {fileTitle || "Untitled"}
            </h1>
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
                      className="text-xs font-medium text-muted-foreground"
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
        <Button
          size="sm"
          onClick={onRun}
          onMouseEnter={preloadEditor}
          onFocus={preloadEditor}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <span className="animate-spin">
                <Loader2 className="size-4" />
              </span>
              Running...
            </>
          ) : (
            <>
              <Play className="size-4" />
              Run
            </>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted ring-offset-background transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
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
      </div>
    </div>
  );
}
