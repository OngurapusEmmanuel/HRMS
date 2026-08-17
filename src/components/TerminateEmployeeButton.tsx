"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserX } from "lucide-react";
import Modal from "./Modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

// Role gating (ADMIN only, per rbac.ts "employee:delete") is done by the
// caller — same convention as AddDepartmentButton/AddEmployeeButton, which
// are wrapped in `{can(role, "...") && <Button.../>}` at the page level
// rather than checking role inside the component.
export default function TerminateEmployeeButton({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/employees/${employeeId}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to terminate employee");
      return;
    }
    setOpen(false);
    // Stay on the employee's detail page rather than navigating away — HR
    // typically wants to immediately see the resulting offboarding checklist
    // and TERMINATED status appear on the same page.
    router.refresh();
  }

  return (
    <>
      <Button variant="destructive" size="sm" leftIcon={<UserX className="h-4 w-4" />} onClick={() => setOpen(true)}>
        Terminate
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Terminate employee">
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Terminate <span className="font-medium text-foreground">{employeeName}</span>? This cannot be undone.
          </p>
          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirm} loading={loading}>
              {loading ? "Terminating..." : "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
