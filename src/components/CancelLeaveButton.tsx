"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";

// Lets the requester withdraw their own PENDING or APPROVED leave request.
// Separate from LeaveActions (which is the approver's approve/reject control)
// because the authorization model is different: this is self-service and
// doesn't depend on the "leave:approve" permission at all.
export default function CancelLeaveButton({
  leaveId,
  status,
}: {
  leaveId: string;
  status: "PENDING" | "APPROVED";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isApproved = status === "APPROVED";

  async function cancel() {
    setLoading(true);
    const res = await fetch(`/api/leaves/${leaveId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    setLoading(false);
    if (res.ok) {
      setConfirmOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        leftIcon={<XCircle className="h-3.5 w-3.5" />}
        disabled={loading}
        onClick={() => setConfirmOpen(true)}
      >
        Cancel
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isApproved ? "Cancel this approved leave?" : "Withdraw this request?"}
        description={
          isApproved
            ? "Your balance will be restored. This can't be undone."
            : "This request will be withdrawn and can't be undone."
        }
        confirmLabel={isApproved ? "Cancel leave" : "Withdraw"}
        variant="danger"
        loading={loading}
        onConfirm={cancel}
      />
    </>
  );
}
