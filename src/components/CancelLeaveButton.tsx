"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Lets the requester withdraw their own PENDING or APPROVED leave request.
// Separate from LeaveActions (which is the approver's approve/reject control)
// because the authorization model is different: this is self-service and
// doesn't depend on the "leave:approve" permission at all.
export default function CancelLeaveButton({ leaveId }: { leaveId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cancel() {
    setLoading(true);
    const res = await fetch(`/api/leaves/${leaveId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <Button
      variant="outline"
      size="sm"
      leftIcon={<XCircle className="h-3.5 w-3.5" />}
      loading={loading}
      disabled={loading}
      onClick={cancel}
    >
      {loading ? "Cancelling..." : "Cancel"}
    </Button>
  );
}
