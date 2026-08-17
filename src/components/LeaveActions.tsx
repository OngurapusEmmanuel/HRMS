"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        leftIcon={<Check className="h-3.5 w-3.5" />}
        loading={loading === "APPROVED"}
        disabled={loading !== null}
        onClick={() => review("APPROVED")}
      >
        {loading === "APPROVED" ? "Approving..." : "Approve"}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        leftIcon={<X className="h-3.5 w-3.5" />}
        loading={loading === "REJECTED"}
        disabled={loading !== null}
        onClick={() => review("REJECTED")}
      >
        {loading === "REJECTED" ? "Rejecting..." : "Reject"}
      </Button>
    </div>
  );
}
