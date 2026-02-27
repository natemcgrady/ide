"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type * as Monaco from "monaco-editor";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { MonacoBinding } from "y-monaco";
import MonacoEditor from "@monaco-editor/react";
import type { Language } from "@/lib/executor";

const languageMap: Record<Language, string> = {
  typescript: "typescript",
  python: "python",
};

export interface CollaboratorPresence {
  userId: string;
  name: string;
  avatar: string | null;
  color: string;
}

const PRESENCE_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

function hashToColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

interface CollaborativeEditorProps {
  fileId: string;
  language: Language;
  initialCode: string;
  onRun: () => void;
  readOnly: boolean;
  onPresenceChange?: (users: CollaboratorPresence[]) => void;
  getCodeRef?: React.MutableRefObject<(() => string) | null>;
}

export default function CollaborativeEditor({
  fileId,
  language,
  initialCode,
  onRun,
  readOnly,
  onPresenceChange,
  getCodeRef,
}: CollaborativeEditorProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [providerState, setProviderState] = useState<{
    provider: HocuspocusProvider;
    ydoc: Y.Doc;
  } | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      try {
        const tokenRes = await fetch("/api/collab/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId }),
        });

        if (!tokenRes.ok) {
          setStatus("error");
          return;
        }

        const { token, url, user: userInfo } = await tokenRes.json();
        const ydoc = new Y.Doc();
        const ytext = ydoc.getText("monaco");

        if (ytext.length === 0 && initialCode) {
          ytext.insert(0, initialCode);
        }

        const provider = new HocuspocusProvider({
          url,
          name: fileId,
          document: ydoc,
          token,
        });

        const myColor = hashToColor(userInfo?.id ?? "me");
        const awareness = provider.awareness;
        if (awareness) {
          awareness.setLocalStateField("userId", userInfo?.id ?? null);
          awareness.setLocalStateField("name", userInfo?.name ?? "Anonymous");
          awareness.setLocalStateField("avatar", userInfo?.avatar ?? null);
          awareness.setLocalStateField("color", myColor);
        }

        provider.on("awarenessChange", ({ states }: { states: Array<Record<string, unknown>> }) => {
          if (!mounted || !onPresenceChange) return;
          const users: CollaboratorPresence[] = states
            .filter((s) => s.userId != null && String(s.userId) !== "undefined")
            .map((s) => ({
              userId: String(s.userId),
              name: String(s.name ?? "Anonymous"),
              avatar: typeof s.avatar === "string" ? s.avatar : null,
              color: (s.color as string) ?? hashToColor(String(s.userId)),
            }));
          onPresenceChange(users);
        });

        provider.on("synced", () => {
          if (mounted) setStatus("ready");
        });

        provider.on("status", ({ status }: { status: string }) => {
          if (status === "disconnected" && mounted) setStatus("error");
        });

        if (mounted) {
          providerRef.current = provider;
          setProviderState({ provider, ydoc });
        } else {
          provider.destroy();
        }
      } catch {
        if (mounted) setStatus("error");
      }
    };

    connect();

    return () => {
      mounted = false;
      bindingRef.current?.destroy();
      bindingRef.current = null;
      providerRef.current?.destroy();
      providerRef.current = null;
      setProviderState(null);
    };
  }, [fileId, initialCode, onPresenceChange]);

  const handleMount = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor) => {
      const provider = providerRef.current;
      if (!provider) return;

      const ytext = provider.document.getText("monaco");
      const model = editor.getModel();
      if (!model) return;

      const binding = new MonacoBinding(
        ytext,
        model,
        new Set([editor]),
        provider.awareness
      );
      bindingRef.current = binding;

      if (getCodeRef) {
        getCodeRef.current = () => ytext.toString();
      }
    },
    [getCodeRef]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onRun();
    }
  };

  if (status === "error") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          Could not connect to collaboration server. Editing in offline mode.
        </p>
      </div>
    );
  }

  if (!providerState) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">
          Connecting to collaboration server...
        </span>
      </div>
    );
  }

  return (
    <div className="h-full w-full" onKeyDown={handleKeyDown}>
      <MonacoEditor
        height="100%"
        language={languageMap[language]}
        theme="vs-dark"
        loading={status !== "ready" ? "Syncing..." : undefined}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 16, bottom: 16 },
          readOnly: readOnly || status !== "ready",
        }}
        onMount={handleMount}
        defaultValue=""
      />
    </div>
  );
}
