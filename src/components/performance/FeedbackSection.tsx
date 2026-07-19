"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "../Modal";

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
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">360° Feedback</h2>
        {canRequest && (
          <button onClick={() => setOpen(true)} className="text-brand-600 hover:underline text-xs font-medium">
            Request Round
          </button>
        )}
      </div>

      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="text-sm border-b border-gray-100 pb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-900">
                {r.provider ? `${r.provider.firstName} ${r.provider.lastName}` : "Anonymous"} · {r.relationship.replace("_", " ")}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.submitted ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {r.submitted ? "Submitted" : "Pending"}
              </span>
            </div>
            {r.submitted && (
              <div className="text-xs text-gray-600 space-y-0.5">
                {r.strengths && <p><span className="font-medium">Strengths: </span>{r.strengths}</p>}
                {r.areasForImprovement && <p><span className="font-medium">Improvement: </span>{r.areasForImprovement}</p>}
                {r.comments && <p><span className="font-medium">Comments: </span>{r.comments}</p>}
              </div>
            )}
          </div>
        ))}
        {requests.length === 0 && <p className="text-gray-400 text-sm">No feedback requested yet.</p>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Request 360° Feedback">
        <form onSubmit={submitRound} className="space-y-3 text-sm">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2">
              <select value={row.providerId} onChange={(e) => updateRow(i, "providerId", e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2">
                <option value="">Select person...</option>
                {colleagues.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
              <select value={row.relationship} onChange={(e) => updateRow(i, "relationship", e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2">
                <option value="SELF">Self</option>
                <option value="MANAGER">Manager</option>
                <option value="PEER">Peer</option>
                <option value="DIRECT_REPORT">Direct report</option>
              </select>
            </div>
          ))}
          <button type="button" onClick={() => setRows((prev) => [...prev, { providerId: "", relationship: "PEER" }])} className="text-brand-600 hover:underline text-xs">
            + Add another
          </button>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2 font-medium disabled:opacity-60">
            {loading ? "Sending..." : "Send Requests"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
