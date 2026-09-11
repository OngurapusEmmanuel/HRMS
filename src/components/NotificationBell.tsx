"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const POLL_INTERVAL_MS = 30_000;

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) {
        setLoadFailed(true);
        return;
      }
      const data = await res.json();
      setItems(data.items);
      setUnreadCount(data.unreadCount);
      setLoadFailed(false);
    } catch {
      // Keep showing whatever was last loaded successfully — this is a
      // background poll, not a user action, so no toast/alert. Just flag
      // that the latest attempt failed; the dropdown surfaces it quietly
      // and the next poll retries automatically.
      setLoadFailed(true);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  async function handleOpenNotification(n: Notification) {
    if (!n.read) {
      await fetch(`/api/notifications/${n.id}/read`, { method: "POST" });
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function handleMarkAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnreadCount(0);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative rounded-lg p-2 text-secondary transition-colors hover:bg-surface-2 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] leading-none text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-medium text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="text-xs text-primary-600 hover:underline dark:text-primary-400">
              Mark all read
            </button>
          )}
        </div>
        {loadFailed && (
          <p className="border-b border-border px-4 py-2 text-xs text-muted">
            Couldn&apos;t load notifications. Retrying shortly.
          </p>
        )}
        <div className="max-h-96 divide-y divide-border overflow-y-auto">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => handleOpenNotification(n)}
              className={cn("w-full px-4 py-3 text-left text-sm transition-colors hover:bg-surface-2", !n.read && "bg-primary-50/60 dark:bg-primary-950/40")}
            >
              <div className="flex items-start gap-2">
                {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />}
                <div className={n.read ? "ml-3.5" : ""}>
                  <p className="font-medium text-foreground">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-secondary">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </button>
          ))}
          {items.length === 0 && !loadFailed && (
            <p className="px-4 py-6 text-center text-sm text-muted">No notifications yet.</p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
