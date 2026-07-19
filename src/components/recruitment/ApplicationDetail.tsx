"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Interview = {
  id: string;
  scheduledAt: string;
  outcome: string;
  notes: string | null;
  interviewer: { firstName: string; lastName: string };
};
type Offer = { id: string; proposedSalary: string; startDate: string; status: string } | null;

const STAGES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED"];
const OUTCOME_STYLES: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  PASS: "bg-green-100 text-green-700",
  FAIL: "bg-red-100 text-red-700",
};

export default function ApplicationDetail({
  applicationId,
  currentStage,
  interviews: initialInterviews,
  offer: initialOffer,
  employees,
  canManage,
  canHire,
}: {
  applicationId: string;
  currentStage: string;
  interviews: Interview[];
  offer: Offer;
  employees: { id: string; firstName: string; lastName: string }[];
  canManage: boolean;
  canHire: boolean;
}) {
  const router = useRouter();
  const [stage, setStage] = useState(currentStage);
  const [interviews, setInterviews] = useState(initialInterviews);
  const [offer, setOffer] = useState(initialOffer);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [interviewForm, setInterviewForm] = useState({ interviewerId: employees[0]?.id ?? "", scheduledAt: "" });
  const [offerForm, setOfferForm] = useState({ proposedSalary: "", startDate: "" });
  const [hirePassword, setHirePassword] = useState("");

  async function updateStage(newStage: string) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to update stage");
      return;
    }
    setStage(newStage);
    router.refresh();
  }

  async function scheduleInterview(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/applications/${applicationId}/interviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(interviewForm),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to schedule interview");
      return;
    }
    const created = await res.json();
    const interviewer = employees.find((e) => e.id === interviewForm.interviewerId)!;
    setInterviews((prev) => [...prev, { ...created, interviewer }]);
    setInterviewForm({ interviewerId: employees[0]?.id ?? "", scheduledAt: "" });
    router.refresh();
  }

  async function setInterviewOutcome(id: string, outcome: string) {
    const res = await fetch(`/api/interviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome }),
    });
    if (res.ok) {
      setInterviews((prev) => prev.map((i) => (i.id === id ? { ...i, outcome } : i)));
      router.refresh();
    }
  }

  async function extendOffer(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/applications/${applicationId}/offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposedSalary: Number(offerForm.proposedSalary), startDate: offerForm.startDate }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to extend offer");
      return;
    }
    const created = await res.json();
    setOffer(created);
    setStage("OFFER");
    router.refresh();
  }

  async function updateOfferStatus(status: string) {
    if (!offer) return;
    const res = await fetch(`/api/offers/${offer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setOffer({ ...offer, status });
      router.refresh();
    }
  }

  async function hire(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/applications/${applicationId}/hire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: hirePassword }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error?.formErrors?.[0] ?? body.error ?? "Failed to hire candidate");
      return;
    }
    const employee = await res.json();
    router.push(`/employees/${employee.id}`);
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Pipeline Stage</h2>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => updateStage(s)}
                disabled={loading || s === stage}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  s === stage ? "bg-brand-500 text-white border-brand-500" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                } disabled:cursor-default`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Interviews</h2>
        <div className="space-y-2 mb-4">
          {interviews.map((i) => (
            <div key={i.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
              <div>
                <p className="font-medium text-gray-900">{i.interviewer.firstName} {i.interviewer.lastName}</p>
                <p className="text-xs text-gray-400">{new Date(i.scheduledAt).toLocaleString()}</p>
              </div>
              {canManage ? (
                <div className="flex gap-1">
                  {["PENDING", "PASS", "FAIL"].map((o) => (
                    <button
                      key={o}
                      onClick={() => setInterviewOutcome(i.id, o)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        o === i.outcome ? OUTCOME_STYLES[o] : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              ) : (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOME_STYLES[i.outcome]}`}>{i.outcome}</span>
              )}
            </div>
          ))}
          {interviews.length === 0 && <p className="text-gray-400 text-sm">No interviews scheduled.</p>}
        </div>

        {canManage && employees.length > 0 && (
          <form onSubmit={scheduleInterview} className="flex items-end gap-2 text-sm border-t border-gray-100 pt-4">
            <div className="flex-1">
              <label className="block text-gray-700 mb-1">Interviewer</label>
              <select
                value={interviewForm.interviewerId}
                onChange={(e) => setInterviewForm((f) => ({ ...f, interviewerId: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-gray-700 mb-1">Date & time</label>
              <input
                type="datetime-local"
                required
                value={interviewForm.scheduledAt}
                onChange={(e) => setInterviewForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <button type="submit" disabled={loading} className="bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-60">
              Schedule
            </button>
          </form>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Offer</h2>
        {offer ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-gray-500">Proposed salary: </span>
              <span className="font-medium">${Number(offer.proposedSalary).toLocaleString()}</span>
            </p>
            <p>
              <span className="text-gray-500">Start date: </span>
              <span className="font-medium">{new Date(offer.startDate).toLocaleDateString()}</span>
            </p>
            <p>
              <span className="text-gray-500">Status: </span>
              <span className="font-medium">{offer.status}</span>
            </p>
            {canManage && offer.status === "PENDING" && (
              <div className="flex gap-2">
                <button onClick={() => updateOfferStatus("ACCEPTED")} className="text-green-600 hover:underline text-xs font-medium">Mark Accepted</button>
                <button onClick={() => updateOfferStatus("DECLINED")} className="text-red-600 hover:underline text-xs font-medium">Mark Declined</button>
                <button onClick={() => updateOfferStatus("EXPIRED")} className="text-gray-500 hover:underline text-xs font-medium">Mark Expired</button>
              </div>
            )}

            {canHire && offer.status === "ACCEPTED" && (
              <form onSubmit={hire} className="border-t border-gray-100 pt-4 mt-2 space-y-2">
                <label className="block text-gray-700">Temporary password for the new account</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={hirePassword}
                    onChange={(e) => setHirePassword(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                  />
                  <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-60">
                    {loading ? "Hiring..." : "Convert to Employee"}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : canManage ? (
          <form onSubmit={extendOffer} className="flex items-end gap-2 text-sm">
            <div className="flex-1">
              <label className="block text-gray-700 mb-1">Proposed annual salary</label>
              <input
                type="number"
                step="0.01"
                required
                value={offerForm.proposedSalary}
                onChange={(e) => setOfferForm((f) => ({ ...f, proposedSalary: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div className="flex-1">
              <label className="block text-gray-700 mb-1">Start date</label>
              <input
                type="date"
                required
                value={offerForm.startDate}
                onChange={(e) => setOfferForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <button type="submit" disabled={loading} className="bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-60">
              Extend Offer
            </button>
          </form>
        ) : (
          <p className="text-gray-400 text-sm">No offer extended yet.</p>
        )}
      </div>

      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  );
}
