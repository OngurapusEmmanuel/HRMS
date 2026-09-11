"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function CloseCycleButton({ cycleId }: { cycleId: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function close() {
    setLoading(true);
    const res = await fetch(`/api/appraisal-cycles/${cycleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    });
    setLoading(false);
    if (res.ok) {
      setConfirmOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" leftIcon={<Lock className="h-3.5 w-3.5" />} onClick={() => setConfirmOpen(true)}>
        Close cycle
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Close this cycle?"
        description="No further reviews can be submitted against it once closed."
        confirmLabel="Close cycle"
        variant="danger"
        loading={loading}
        onConfirm={close}
      />
    </>
  );
}
