"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as Monaco from "monaco-editor";
import * as Y from "yjs";
import type { Awareness as YAwareness } from "y-protocols/awareness";
import { createClient } from "@liveblocks/client";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { MonacoBinding } from "y-monaco";
import MonacoEditor from "@monaco-editor/react";
import type { Language } from "@/lib/executor";
import { hashToColor } from "@/lib/collab/colors";

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

// Module-level singleton — one client handles all rooms.
const liveblocksClient = createClient({
  authEndpoint: "/api/collab/token",
});

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
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  // Expose provider + ydoc to handleMount via state (triggers re-render that
  // makes the editor appear, so handleMount is called after refs are set).
  const [editorReady, setEditorReady] = useState(false);

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<LiveblocksYjsProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const awarenessDisposablesRef = useRef<Array<{ dispose: () => void }>>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorStylesRef = useRef<HTMLStyleElement | null>(null);

  // Debounced save to Neon — write users only. The PATCH endpoint also
  // enforces write-access server-side.
  const debouncedSave = useCallback(
    (text: string) => {
      if (readOnly) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/files/${fileId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contentText: text }),
          });
        } catch {
          // Will retry on next keystroke.
        }
      }, 2000);
    },
    [fileId, readOnly],
  );

  useEffect(() => {
    let mounted = true;
    const roomId = `file:${fileId}`;

    const ydoc = new Y.Doc();
    const { room, leave } = liveblocksClient.enterRoom(roomId);
    const provider = new LiveblocksYjsProvider(room, ydoc);

    ydocRef.current = ydoc;
    providerRef.current = provider;
    setEditorReady(true);

    const ytext = ydoc.getText("monaco");
    const ensureCursorStylesElement = () => {
      if (cursorStylesRef.current) return cursorStylesRef.current;
      const styleEl = document.createElement("style");
      styleEl.setAttribute("data-collab-cursor-styles", roomId);
      document.head.appendChild(styleEl);
      cursorStylesRef.current = styleEl;
      return styleEl;
    };

    const escapeCssString = (value: string) =>
      value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    const updateCursorStyles = () => {
      if (!mounted) return;
      const styleEl = ensureCursorStylesElement();
      const localClientId = ydoc.clientID;
      const states = provider.awareness.getStates();
      const rules: string[] = [];

      states.forEach((state, clientId) => {
        if (clientId === localClientId) return;
        const s = state as Record<string, unknown>;
        const userObj =
          typeof s.user === "object" && s.user !== null
            ? (s.user as Record<string, unknown>)
            : null;
        const userId =
          typeof s.userId === "string"
            ? s.userId
            : typeof userObj?.name === "string"
              ? userObj.name
              : String(clientId);
        const name =
          typeof s.name === "string"
            ? s.name
            : typeof userObj?.name === "string"
              ? userObj.name
              : "Anonymous";
        const color =
          typeof s.color === "string"
            ? s.color
            : typeof userObj?.color === "string"
              ? userObj.color
              : hashToColor(userId);
        const safeName = escapeCssString(name);

        rules.push(
          `.yRemoteSelection-${clientId}{--y-color:${color};background-color:color-mix(in srgb, ${color} 25%, transparent);}`,
          `.yRemoteSelectionHead-${clientId}{--y-color:${color};border-color:${color};}`,
          `.yRemoteSelectionHead-${clientId}::after{content:"${safeName}";background-color:${color};opacity:1;transform:translateY(0);}`,
        );
      });

      styleEl.textContent = rules.join("\n");
    };

    // Keep local awareness populated for both y-monaco (state.user.*) and
    // our toolbar presence list (top-level fields).
    const syncSelfAwareness = () => {
      const self = room.getSelf();
      if (!self?.id || !mounted) return;
      const info = self.info as {
        name?: string;
        avatar?: string | null;
      } | null;
      const selfId: string = self.id;
      const name = info?.name ?? "Anonymous";
      const avatar = info?.avatar ?? null;
      const color = hashToColor(selfId);

      // Merge with current state to avoid clobbering y-monaco selection updates.
      const currentState =
        (provider.awareness.getLocalState() as Record<
          string,
          unknown
        > | null) ?? {};
      provider.awareness.setLocalState({
        ...currentState,
        userId: selfId,
        name,
        avatar,
        color,
        user: { name, color },
      });
    };

    syncSelfAwareness();
    const unsubSelf = room.subscribe("status", syncSelfAwareness);

    // Presence bar — rebuild whenever awareness changes.
    // The local client's entry in getStates() keyed by doc.clientID.
    const handleAwarenessChange = () => {
      if (!mounted) return;
      updateCursorStyles();
      if (!onPresenceChange) return;
      const users: CollaboratorPresence[] = [];
      const states = provider.awareness.getStates();
      const localClientId = ydoc.clientID;

      states.forEach((state, clientId) => {
        const s = state as Record<string, unknown>;
        if (!s.userId) return;
        const isLocal = clientId === localClientId;
        const userObj =
          typeof s.user === "object" && s.user !== null
            ? (s.user as Record<string, unknown>)
            : null;

        users[isLocal ? "unshift" : "push"]({
          userId: String(s.userId),
          name: String(s.name ?? userObj?.name ?? "Anonymous"),
          avatar: typeof s.avatar === "string" ? s.avatar : null,
          color: String(
            s.color ?? userObj?.color ?? hashToColor(String(s.userId)),
          ),
        });
      });

      onPresenceChange(users);
    };

    updateCursorStyles();
    provider.awareness.on("change", handleAwarenessChange);

    // Seed the Yjs doc from Neon if the Liveblocks room is brand new.
    const handleSync = (synced: boolean) => {
      if (!synced || !mounted) return;
      if (ytext.length === 0 && initialCode) {
        ytext.insert(0, initialCode);
      }
      setStatus("ready");
    };

    // LiveblocksYjsProvider emits "synced" and "sync" events (lib0 Observable).
    (
      provider as unknown as {
        on: (e: string, fn: (v: boolean) => void) => void;
      }
    ).on("synced", handleSync);

    // Debounced Neon save on every CRDT update (write users only).
    if (!readOnly) {
      ytext.observe(() => {
        if (mounted) debouncedSave(ytext.toString());
      });
    }

    return () => {
      mounted = false;
      unsubSelf();
      provider.awareness.off("change", handleAwarenessChange);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      for (const disposable of awarenessDisposablesRef.current) {
        disposable.dispose();
      }
      awarenessDisposablesRef.current = [];
      bindingRef.current?.destroy();
      bindingRef.current = null;
      if (cursorStylesRef.current) {
        cursorStylesRef.current.remove();
        cursorStylesRef.current = null;
      }
      provider.destroy();
      providerRef.current = null;
      ydocRef.current = null;
      leave();
      ydoc.destroy();
      setEditorReady(false);
      setStatus("loading");
    };
  }, [fileId, initialCode, readOnly, onPresenceChange, debouncedSave]);

  const handleMount = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor) => {
      const provider = providerRef.current;
      const ydoc = ydocRef.current;
      if (!provider || !ydoc) return;

      const ytext = ydoc.getText("monaco");
      const model = editor.getModel();
      if (!model) return;

      // The Liveblocks awareness is structurally compatible with y-protocols
      // Awareness at runtime (same getStates/on/off API, doc.clientID is used
      // by y-monaco internally). Cast to satisfy the MonacoBinding type.
      const binding = new MonacoBinding(
        ytext,
        model,
        new Set([editor]),
        provider.awareness as unknown as YAwareness,
      );
      bindingRef.current = binding;

      for (const disposable of awarenessDisposablesRef.current) {
        disposable.dispose();
      }
      awarenessDisposablesRef.current = [];

      const publishSelection = () => {
        if (editor.getModel() !== model) return;
        const sel = editor.getSelection();
        if (!sel) return;
        let anchor = model.getOffsetAt(sel.getStartPosition());
        let head = model.getOffsetAt(sel.getEndPosition());
        if (sel.getDirection() === Monaco.SelectionDirection.RTL) {
          const tmp = anchor;
          anchor = head;
          head = tmp;
        }
        (
          provider.awareness as unknown as {
            setLocalStateField: (field: string, value: unknown) => void;
          }
        ).setLocalStateField("selection", {
          anchor: Y.createRelativePositionFromTypeIndex(ytext, anchor),
          head: Y.createRelativePositionFromTypeIndex(ytext, head),
        });
      };

      const clearSelection = () => {
        (
          provider.awareness as unknown as {
            setLocalStateField: (field: string, value: unknown) => void;
          }
        ).setLocalStateField("selection", null);
      };

      awarenessDisposablesRef.current = [
        editor.onDidFocusEditorText(publishSelection),
        editor.onDidBlurEditorText(clearSelection),
      ];

      if (getCodeRef) {
        getCodeRef.current = () => ytext.toString();
      }
    },
    [getCodeRef],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onRun();
    }
  };

  if (!editorReady) {
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
