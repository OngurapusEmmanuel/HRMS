"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

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
  const containerRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silent — the bell just won't update this cycle; next poll retries.
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative text-gray-500 hover:text-gray-800 p-1.5 rounded-lg hover:bg-gray-100"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] leading-none rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-medium text-sm text-gray-900">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-brand-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleOpenNotification(n)}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 ${!n.read ? "bg-brand-50/50" : ""}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />}
                  <div className={n.read ? "ml-3.5" : ""}>
                    <p className="font-medium text-gray-900">{n.title}</p>
                    {n.body && <p className="text-gray-500 text-xs mt-0.5">{n.body}</p>}
                    <p className="text-gray-400 text-xs mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </button>
            ))}
            {items.length === 0 && (
              <p className="px-4 py-6 text-center text-gray-400 text-sm">No notifications yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
