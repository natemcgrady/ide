"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Loader2 } from "lucide-react";

interface Collaborator {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userAvatarUrl: string | null;
  permission: string;
}

interface CollaboratorsResponse {
  owner: { userId: string; userName: string | null; userUsername: string | null };
  collaborators: Collaborator[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ShareDialogProps {
  fileId: string;
  onClose: () => void;
}

export default function ShareDialog({ fileId, onClose }: ShareDialogProps) {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [permission, setPermission] = useState<"read" | "write">("write");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const { data, mutate } = useSWR<CollaboratorsResponse>(
    `/api/files/${fileId}/collaborators`,
    fetcher
  );

  const handleInvite = async () => {
    if (!emailOrUsername.trim()) return;
    setInviteError(null);
    setInviting(true);
    try {
      const res = await fetch(`/api/files/${fileId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailOrUsername: emailOrUsername.trim(),
          permission,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setInviteError(json.error ?? "Failed to invite");
        return;
      }
      setEmailOrUsername("");
      mutate();
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    const res = await fetch(`/api/files/${fileId}/share`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) mutate();
  };

  const handlePermissionChange = async (
    userId: string,
    newPermission: "read" | "write"
  ) => {
    const res = await fetch(`/api/files/${fileId}/share`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, permission: newPermission }),
    });
    if (res.ok) mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share file</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {data?.owner && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Owner
              </p>
              <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                <User className="size-4 text-muted-foreground" />
                <span className="text-foreground">
                  {data.owner.userName ?? data.owner.userUsername ?? "Unknown"}
                </span>
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Invite collaborator
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Email or username"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
              <Select
                value={permission}
                onValueChange={(v) => setPermission(v as "read" | "write")}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="write">Edit</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleInvite}
                disabled={inviting || !emailOrUsername.trim()}
              >
                {inviting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Invite"
                )}
              </Button>
            </div>
            {inviteError && (
              <p className="mt-1 text-sm text-destructive">{inviteError}</p>
            )}
          </div>

          {data?.collaborators && data.collaborators.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Collaborators
              </p>
              <ul className="space-y-2">
                {data.collaborators.map((c) => (
                  <li
                    key={c.userId}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      {c.userAvatarUrl ? (
                        <img
                          src={c.userAvatarUrl}
                          alt=""
                          className="size-6 rounded-full"
                        />
                      ) : (
                        <User className="size-4 text-muted-foreground" />
                      )}
                      <span className="text-foreground">
                        {c.userName ?? c.userEmail ?? "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={c.permission}
                        onValueChange={(v) =>
                          handlePermissionChange(c.userId, v as "read" | "write")
                        }
                      >
                        <SelectTrigger className="h-8 w-[90px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read">Read</SelectItem>
                          <SelectItem value="write">Edit</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemove(c.userId)}
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
