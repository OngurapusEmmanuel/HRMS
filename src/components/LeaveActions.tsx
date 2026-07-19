"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LeaveActions({ leaveId }: { leaveId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | null>(null);

  async function review(status: "APPROVED" | "REJECTED") {
    setLoading(status);
    const res = await fetch(`/api/leaves/${leaveId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(null);
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-x-2">
      <button
        onClick={() => review("APPROVED")}
        disabled={loading !== null}
        className="text-green-600 hover:underline text-xs font-medium disabled:opacity-50"
      >
        {loading === "APPROVED" ? "Approving..." : "Approve"}
      </button>
      <button
        onClick={() => review("REJECTED")}
        disabled={loading !== null}
        className="text-red-600 hover:underline text-xs font-medium disabled:opacity-50"
      >
        {loading === "REJECTED" ? "Rejecting..." : "Reject"}
      </button>
    </div>
  );
}
