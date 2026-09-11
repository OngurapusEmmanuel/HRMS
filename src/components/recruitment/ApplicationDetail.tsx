"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import ConfirmDialog from "@/components/ConfirmDialog";
import { interviewOutcomeVariant } from "@/lib/badge-variants";
import { extractErrorMessage } from "@/lib/api-error";

type Interview = {
  id: string;
  scheduledAt: string;
  outcome: string;
  notes: string | null;
  interviewer: { firstName: string; lastName: string };
};
type Offer = { id: string; proposedSalary: string; startDate: string; status: string } | null;

const STAGES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED"];
const OUTCOMES = ["PENDING", "PASS", "FAIL"];

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
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [pendingOfferStatus, setPendingOfferStatus] = useState<"DECLINED" | "EXPIRED" | null>(null);

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

  function requestStageChange(newStage: string) {
    if (newStage === "REJECTED") {
      setRejectConfirmOpen(true);
      return;
    }
    updateStage(newStage);
  }

  async function confirmReject() {
    await updateStage("REJECTED");
    setRejectConfirmOpen(false);
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

  function requestOfferStatus(status: "ACCEPTED" | "DECLINED" | "EXPIRED") {
    if (status === "DECLINED" || status === "EXPIRED") {
      setPendingOfferStatus(status);
      return;
    }
    updateOfferStatus(status);
  }

  async function confirmOfferStatus() {
    if (!pendingOfferStatus) return;
    setLoading(true);
    await updateOfferStatus(pendingOfferStatus);
    setLoading(false);
    setPendingOfferStatus(null);
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
      setError(extractErrorMessage(body, "Failed to hire candidate"));
      return;
    }
    const employee = await res.json();
    router.push(`/employees/${employee.id}`);
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <CardContent>
            <h2 className="mb-3 font-semibold text-foreground">Pipeline Stage</h2>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={s === stage ? "primary" : "outline"}
                  disabled={loading || s === stage}
                  onClick={() => requestStageChange(s)}
                  className="disabled:cursor-default"
                >
                  {s}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <h2 className="mb-3 font-semibold text-foreground">Interviews</h2>
          <div className="mb-4 space-y-2">
            {interviews.map((i) => (
              <div key={i.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-b-0">
                <div>
                  <p className="font-medium text-foreground">
                    {i.interviewer.firstName} {i.interviewer.lastName}
                  </p>
                  <p className="text-xs text-muted">{new Date(i.scheduledAt).toLocaleString()}</p>
                </div>
                {canManage ? (
                  <div className="flex gap-1">
                    {OUTCOMES.map((o) => (
                      <Button
                        key={o}
                        size="sm"
                        variant={o === i.outcome ? "primary" : "outline"}
                        onClick={() => setInterviewOutcome(i.id, o)}
                      >
                        {o}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <Badge variant={interviewOutcomeVariant[i.outcome] ?? "neutral"}>{i.outcome}</Badge>
                )}
              </div>
            ))}
            {interviews.length === 0 && <p className="text-sm text-muted">No interviews scheduled.</p>}
          </div>

          {canManage && employees.length > 0 && (
            <form onSubmit={scheduleInterview} className="flex items-end gap-2 border-t border-border pt-4 text-sm">
              <div className="flex-1">
                <Label>Interviewer</Label>
                <Select
                  value={interviewForm.interviewerId}
                  onChange={(e) => setInterviewForm((f) => ({ ...f, interviewerId: e.target.value }))}
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex-1">
                <Label>Date &amp; time</Label>
                <Input
                  type="datetime-local"
                  required
                  value={interviewForm.scheduledAt}
                  onChange={(e) => setInterviewForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                />
              </div>
              <Button type="submit" disabled={loading}>
                Schedule
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="mb-3 font-semibold text-foreground">Offer</h2>
          {offer ? (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-secondary">Proposed salary: </span>
                <span className="font-medium text-foreground">${Number(offer.proposedSalary).toLocaleString()}</span>
              </p>
              <p>
                <span className="text-secondary">Start date: </span>
                <span className="font-medium text-foreground">{new Date(offer.startDate).toLocaleDateString()}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-secondary">Status: </span>
                <span className="font-medium text-foreground">{offer.status}</span>
              </p>
              {canManage && offer.status === "PENDING" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => requestOfferStatus("ACCEPTED")}>
                    Mark Accepted
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => requestOfferStatus("DECLINED")}>
                    Mark Declined
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => requestOfferStatus("EXPIRED")}>
                    Mark Expired
                  </Button>
                </div>
              )}

              {canHire && offer.status === "ACCEPTED" && (
                <form onSubmit={hire} className="mt-2 space-y-2 border-t border-border pt-4">
                  <Label>Temporary password for the new account</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      required
                      minLength={8}
                      value={hirePassword}
                      onChange={(e) => setHirePassword(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" variant="success" disabled={loading}>
                      {loading ? "Hiring..." : "Convert to Employee"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : canManage ? (
            <form onSubmit={extendOffer} className="flex items-end gap-2 text-sm">
              <div className="flex-1">
                <Label>Proposed annual salary</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={offerForm.proposedSalary}
                  onChange={(e) => setOfferForm((f) => ({ ...f, proposedSalary: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <Label>Start date</Label>
                <Input
                  type="date"
                  required
                  value={offerForm.startDate}
                  onChange={(e) => setOfferForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <Button type="submit" disabled={loading}>
                Extend Offer
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted">No offer extended yet.</p>
          )}
        </CardContent>
      </Card>

      {error && <Alert variant="error">{error}</Alert>}

      <ConfirmDialog
        open={rejectConfirmOpen}
        onOpenChange={setRejectConfirmOpen}
        title="Reject this candidate?"
        description="This moves the application to the Rejected stage and notifies HR and admins in the pipeline. The candidate isn't notified automatically, so follow up with them directly if needed."
        confirmLabel="Reject"
        variant="danger"
        loading={loading}
        onConfirm={confirmReject}
      />

      <ConfirmDialog
        open={pendingOfferStatus !== null}
        onOpenChange={(open) => !open && setPendingOfferStatus(null)}
        title={pendingOfferStatus === "EXPIRED" ? "Mark this offer as expired?" : "Mark this offer as declined?"}
        description={
          pendingOfferStatus === "EXPIRED"
            ? "The offer status will be updated to Expired."
            : "The offer status will be updated to Declined."
        }
        confirmLabel={pendingOfferStatus === "EXPIRED" ? "Mark Expired" : "Mark Declined"}
        variant="danger"
        loading={loading}
        onConfirm={confirmOfferStatus}
      />
    </div>
  );
}
