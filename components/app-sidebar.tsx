"use client";

import * as React from "react";
import { useCallback, useRef, useState } from "react";
import {
  File,
  FileCode2,
  FileJson2,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";

type FilePresentation = {
  Icon: LucideIcon;
  iconClassName: string;
};

function getFilePresentation(name: string): FilePresentation {
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "ts" || extension === "tsx" || extension === "js") {
    return { Icon: FileCode2, iconClassName: "text-sky-500/85" };
  }
  if (extension === "py") {
    return { Icon: FileCode2, iconClassName: "text-amber-500/85" };
  }
  if (extension === "json") {
    return { Icon: FileJson2, iconClassName: "text-amber-500/85" };
  }
  if (extension === "md") {
    return { Icon: FileText, iconClassName: "text-emerald-500/85" };
  }
  return { Icon: File, iconClassName: "text-muted-foreground/85" };
}

function getDisplayFileName(title: string, language: string): string {
  const base = title?.trim() || "Untitled";
  if (language === "python" && !base.endsWith(".py")) {
    return `${base}.py`;
  }
  return base;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string;
    email?: string | null;
    avatar: string | null;
  };
  currentFile?: { title: string; language: string } | null;
  canEditFileName?: boolean;
  onRenameFile?: (newTitle: string) => void;
}

export function AppSidebar({
  user,
  currentFile,
  canEditFileName,
  onRenameFile,
  ...props
}: AppSidebarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = currentFile
    ? getDisplayFileName(currentFile.title, currentFile.language)
    : null;

  const startEditing = useCallback(() => {
    if (!canEditFileName || !currentFile) return;
    setEditValue(currentFile.title || "Untitled");
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [canEditFileName, currentFile]);

  const saveEdit = useCallback(() => {
    const trimmed = editValue.trim() || "Untitled";
    if (trimmed !== (currentFile?.title || "Untitled")) {
      onRenameFile?.(trimmed);
    }
    setIsEditing(false);
  }, [editValue, currentFile?.title, onRenameFile]);

  const { Icon, iconClassName } = displayName
    ? getFilePresentation(displayName)
    : { Icon: File, iconClassName: "text-muted-foreground/85" };

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono-tree text-[11px] uppercase tracking-[0.16em] text-sidebar-foreground/60">
            Explorer
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {displayName && (
                isEditing ? (
                  <div className="flex h-7 items-center gap-2 px-2">
                    <Icon className={`size-3.5 shrink-0 ${iconClassName}`} />
                    <Input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveEdit();
                        }
                        if (e.key === "Escape") {
                          setIsEditing(false);
                        }
                      }}
                      className="h-6 border-sidebar-accent bg-sidebar-accent/40 px-1 font-mono-tree text-[13px] tracking-tight focus-visible:ring-1"
                      maxLength={255}
                      aria-label="Rename file"
                    />
                  </div>
                ) : (
                  <SidebarMenuButton
                    isActive
                    className="h-7 gap-2 rounded-sm px-2 text-[13px] font-normal tracking-tight data-[active=true]:bg-sidebar-accent/70 data-[active=true]:text-sidebar-foreground"
                    onDoubleClick={startEditing}
                  >
                    <Icon className={`size-3.5 ${iconClassName}`} />
                    <span className="font-mono-tree">{displayName}</span>
                  </SidebarMenuButton>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/70 pt-2">
        <NavUser
          user={
            user ?? {
              name: "Anonymous",
              email: null,
              avatar: null,
            }
          }
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
