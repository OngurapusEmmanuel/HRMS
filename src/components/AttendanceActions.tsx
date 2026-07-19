"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AttendanceActions() {
  const router = useRouter();
  const [loading, setLoading] = useState<"in" | "out" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function hit(action: "checkin" | "checkout") {
    setLoading(action === "checkin" ? "in" : "out");
    setMessage(null);
    const res = await fetch(`/api/attendance/${action}`, { method: "POST" });
    setLoading(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error ?? "Something went wrong");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {message && <span className="text-xs text-red-600">{message}</span>}
      <button
        onClick={() => hit("checkin")}
        disabled={loading !== null}
        className="bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg px-4 py-2 disabled:opacity-60"
      >
        {loading === "in" ? "Checking in..." : "Check In"}
      </button>
      <button
        onClick={() => hit("checkout")}
        disabled={loading !== null}
        className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm rounded-lg px-4 py-2 disabled:opacity-60"
      >
        {loading === "out" ? "Checking out..." : "Check Out"}
      </button>
    </div>
  );
}
