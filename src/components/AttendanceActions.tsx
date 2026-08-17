"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      {message && <span className="text-xs text-danger-500">{message}</span>}
      <Button
        size="sm"
        leftIcon={<LogIn className="h-4 w-4" />}
        loading={loading === "in"}
        disabled={loading !== null}
        onClick={() => hit("checkin")}
      >
        {loading === "in" ? "Checking in..." : "Check In"}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<LogOut className="h-4 w-4" />}
        loading={loading === "out"}
        disabled={loading !== null}
        onClick={() => hit("checkout")}
      >
        {loading === "out" ? "Checking out..." : "Check Out"}
      </Button>
    </div>
  );
}
