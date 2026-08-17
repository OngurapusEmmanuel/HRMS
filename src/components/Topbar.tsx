"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut } from "lucide-react";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function Topbar() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const displayName = user?.name ?? user?.email ?? "";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
      <div />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationBell />
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 flex items-center gap-2 rounded-lg py-1 pl-1.5 pr-2.5 transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                <Avatar name={displayName} size="sm" />
                <span className="hidden text-left text-sm sm:block">
                  <span className="block font-medium leading-tight text-foreground">{displayName}</span>
                  <span className="block text-xs leading-tight text-muted">{user.role}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Signed in as {user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
