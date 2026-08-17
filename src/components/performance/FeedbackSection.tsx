"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Modal from "../Modal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { feedbackSubmittedVariant } from "@/lib/badge-variants";

type FeedbackReq = {
  id: string;
  relationship: string;
  submitted: boolean;
  strengths: string | null;
  areasForImprovement: string | null;
  comments: string | null;
  provider: { firstName: string; lastName: string } | null;
};

export default function FeedbackSection({
  employeeId,
  initialRequests,
  colleagues,
  canRequest,
}: {
  employeeId: string;
  initialRequests: FeedbackReq[];
  colleagues: { id: string; firstName: string; lastName: string }[];
  canRequest: boolean;
}) {
  const router = useRouter();
  const [requests] = useState(initialRequests);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([{ providerId: "", relationship: "PEER" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(i: number, field: "providerId" | "relationship", value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  async function submitRound(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const providers = rows.filter((r) => r.providerId);
    const res = await fetch(`/api/employees/${employeeId}/feedback-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providers }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to send requests");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>360° Feedback</CardTitle>
        {canRequest && (
          <Button variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Request Round
          </Button>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="border-b border-border pb-2 text-sm last:border-b-0 last:pb-0">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-foreground">
                  {r.provider ? `${r.provider.firstName} ${r.provider.lastName}` : "Anonymous"} · {r.relationship.replace("_", " ")}
                </span>
                <Badge variant={feedbackSubmittedVariant(r.submitted)}>{r.submitted ? "Submitted" : "Pending"}</Badge>
              </div>
              {r.submitted && (
                <div className="space-y-0.5 text-xs text-secondary">
                  {r.strengths && <p><span className="font-medium text-foreground">Strengths: </span>{r.strengths}</p>}
                  {r.areasForImprovement && <p><span className="font-medium text-foreground">Improvement: </span>{r.areasForImprovement}</p>}
                  {r.comments && <p><span className="font-medium text-foreground">Comments: </span>{r.comments}</p>}
                </div>
              )}
            </div>
          ))}
          {requests.length === 0 && <p className="text-sm text-muted">No feedback requested yet.</p>}
        </div>
      </CardContent>

      <Modal open={open} onClose={() => setOpen(false)} title="Request 360° Feedback">
        <form onSubmit={submitRound} className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2">
              <Select value={row.providerId} onChange={(e) => updateRow(i, "providerId", e.target.value)} className="flex-1">
                <option value="">Select person...</option>
                {colleagues.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </Select>
              <Select value={row.relationship} onChange={(e) => updateRow(i, "relationship", e.target.value)} className="w-40">
                <option value="SELF">Self</option>
                <option value="MANAGER">Manager</option>
                <option value="PEER">Peer</option>
                <option value="DIRECT_REPORT">Direct report</option>
              </Select>
            </div>
          ))}
          <Button
            type="button"
            variant="link"
            onClick={() => setRows((prev) => [...prev, { providerId: "", relationship: "PEER" }])}
          >
            + Add another
          </Button>
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" className="w-full" loading={loading}>
            {loading ? "Sending..." : "Send Requests"}
          </Button>
        </form>
      </Modal>
    </Card>
  );
}
