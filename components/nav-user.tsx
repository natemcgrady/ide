"use client";

import { useMemo, useTransition } from "react";
import useSWR from "swr";
import { ChevronsUpDown, Loader2, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavUserProps {
  user: {
    name: string;
    email?: string | null;
    avatar: string | null;
  };
}

interface UserData {
  name: string | null;
  email: string | null;
  avatar: string | null;
}

const userFetcher = async (url: string): Promise<UserData | null> => {
  const res = await fetch(url);
  return res.ok ? res.json() : null;
};

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar();
  const [isPending, startTransition] = useTransition();
  const { data: currentUser } = useSWR("/api/auth/me", userFetcher, {
    revalidateOnFocus: false,
  });

  const resolvedName = currentUser?.name ?? user.name ?? "Anonymous";
  const resolvedEmail = currentUser?.email ?? user.email ?? "No email";
  const resolvedAvatar = currentUser?.avatar ?? user.avatar;
  const initials = useMemo(
    () =>
      resolvedName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    [resolvedName],
  );

  const handleSignOut = () => {
    startTransition(async () => {
      await fetch("/api/auth/signout", { method: "POST" });
      window.location.href = "/sign-in";
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                {resolvedAvatar ? (
                  <AvatarImage
                    src={resolvedAvatar}
                    alt={resolvedName}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                )}
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{resolvedName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {resolvedEmail}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  {resolvedAvatar ? (
                    <AvatarImage
                      src={resolvedAvatar}
                      alt={resolvedName}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  )}
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{resolvedName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {resolvedEmail}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} disabled={isPending}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
