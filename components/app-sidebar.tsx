"use client";

import * as React from "react";
import { useCallback, useRef, useState } from "react";
import {
  File,
  FileCode2,
  FileJson2,
  FileText,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuItem,
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

function getDisplayFileName(title: string): string {
  return title?.trim() || "untitled.py";
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string;
    email?: string | null;
    avatar: string | null;
  };
  projectName?: string;
  files?: Array<{ id: string; title: string }>;
  activeFileId?: string | null;
  canEditFiles?: boolean;
  onSelectFile?: (fileId: string) => void;
  onRenameFile?: (fileId: string, newTitle: string) => void;
  onCreateFile?: () => void;
  onDeleteFile?: (fileId: string) => void;
}

export function AppSidebar({
  user,
  projectName,
  files = [],
  activeFileId,
  canEditFiles,
  onSelectFile,
  onRenameFile,
  onCreateFile,
  onDeleteFile,
  ...props
}: AppSidebarProps) {
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const saveEdit = useCallback(() => {
    if (!editingFileId) return;
    const file = files.find((entry) => entry.id === editingFileId);
    const previousTitle = file?.title ?? "untitled.py";
    const trimmed = editValue.trim() || "untitled.py";
    if (trimmed !== previousTitle) {
      onRenameFile?.(editingFileId, trimmed);
    }
    setEditingFileId(null);
  }, [editValue, editingFileId, files, onRenameFile]);

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono-tree text-[11px] uppercase tracking-[0.16em] text-sidebar-foreground/60">
            Explorer
          </SidebarGroupLabel>
          {canEditFiles && (
            <SidebarGroupAction
              title="New file"
              aria-label="New file"
              onClick={onCreateFile}
            >
              <Plus />
            </SidebarGroupAction>
          )}
          <SidebarGroupContent>
            {projectName ? (
              <p className="px-2 pb-1 text-[11px] font-medium text-sidebar-foreground/60">
                {projectName}
              </p>
            ) : null}
            <SidebarMenu>
              {files.map((file) => {
                const displayName = getDisplayFileName(file.title);
                const { Icon, iconClassName } = getFilePresentation(displayName);
                const isEditing = editingFileId === file.id;
                return (
                  <SidebarMenuItem key={file.id}>
                    {isEditing ? (
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
                              setEditingFileId(null);
                            }
                          }}
                          className="h-6 border-sidebar-accent bg-sidebar-accent/40 px-1 font-mono-tree text-[13px] tracking-tight focus-visible:ring-1"
                          maxLength={255}
                          aria-label="Rename file"
                        />
                      </div>
                    ) : (
                      <>
                        <SidebarMenuButton
                          isActive={file.id === activeFileId}
                          className="h-7 gap-2 rounded-sm px-2 text-[13px] font-normal tracking-tight data-[active=true]:bg-sidebar-accent/70 data-[active=true]:text-sidebar-foreground"
                          onClick={() => onSelectFile?.(file.id)}
                          onDoubleClick={() => {
                            if (!canEditFiles) return;
                            setEditValue(file.title || "untitled.py");
                            setEditingFileId(file.id);
                            setTimeout(() => {
                              inputRef.current?.focus();
                              inputRef.current?.select();
                            }, 0);
                          }}
                        >
                          <Icon className={`size-3.5 ${iconClassName}`} />
                          <span className="font-mono-tree">{displayName}</span>
                        </SidebarMenuButton>
                        {canEditFiles && (
                          <SidebarMenuAction
                            showOnHover
                            aria-label={`Delete ${displayName}`}
                            title="Delete file"
                            onClick={() => onDeleteFile?.(file.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </SidebarMenuAction>
                        )}
                      </>
                    )}
                  </SidebarMenuItem>
                );
              })}
              {files.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={false}
                    className="h-7 gap-2 rounded-sm px-2 text-[13px] font-normal tracking-tight data-[active=true]:bg-sidebar-accent/70 data-[active=true]:text-sidebar-foreground"
                    onClick={onCreateFile}
                  >
                    <File className="size-3.5 text-muted-foreground/85" />
                    <span className="font-mono-tree text-muted-foreground">
                      No files yet
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
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
