"use client";

import { useTransition } from "react";
import type { Language } from "@/lib/executor";
import { Button } from "@/components/ui/button";
import LanguageSelector from "./LanguageSelector";
import { Play, Loader2, LogOut } from "lucide-react";

interface ToolbarProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  onRun: () => void;
  isRunning: boolean;
}

export default function Toolbar({
  language,
  onLanguageChange,
  onRun,
  isRunning,
}: ToolbarProps) {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await fetch("/api/auth/signout", { method: "POST" });
      window.location.href = "/sign-in";
    });
  };

  return (
    <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Interview IDE
        </h1>
        <LanguageSelector language={language} onChange={onLanguageChange} />
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onRun} disabled={isRunning}>
          {isRunning ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="size-4" />
              Run
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSignOut}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          Sign out
        </Button>
      </div>
    </div>
  );
}
