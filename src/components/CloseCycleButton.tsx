"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CloseCycleButton({ cycleId }: { cycleId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function close() {
    if (!confirm("Close this cycle? This can't be undone — no further appraisals can be filed against it.")) return;
    setLoading(true);
    const res = await fetch(`/api/appraisal-cycles/${cycleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <Button variant="outline" size="sm" leftIcon={<Lock className="h-3.5 w-3.5" />} loading={loading} onClick={close}>
      {loading ? "Closing..." : "Close cycle"}
    </Button>
  );
}
