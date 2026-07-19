"use client";

import { signOut, useSession } from "next-auth/react";
import NotificationBell from "./NotificationBell";

export default function Topbar() {
  const { data: session } = useSession();
  const user = session?.user as any;

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4 text-sm">
        <NotificationBell />
        {user && (
          <span className="text-gray-600">
            {user.name ?? user.email} <span className="text-gray-400">· {user.role}</span>
          </span>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-gray-500 hover:text-gray-800 text-sm"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
