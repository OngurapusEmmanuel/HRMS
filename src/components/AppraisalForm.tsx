"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Modal from "./Modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ratingVariant } from "@/lib/badge-variants";

const CRITERIA = ["Communication", "Technical Skills", "Teamwork", "Punctuality", "Initiative"];

function defaultPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  return { start: start.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };
}

export default function AppraisalForm({
  employeeId,
  cycleId,
  reviewType,
  triggerLabel,
  title,
}: {
  employeeId: string;
  /** Tags the created appraisal against a cycle. Omitted = today's ad-hoc appraisal (unchanged behavior). */
  cycleId?: string;
  /** "SELF" enables the self-review authorization branch server-side; "MANAGER" keeps today's manager/HR/admin check. Omitted = legacy ad-hoc. */
  reviewType?: "SELF" | "MANAGER";
  /** Customizes the trigger button's label. Defaults to "New Appraisal". */
  triggerLabel?: string;
  /** Customizes the modal title. Defaults to "New Performance Appraisal". */
  title?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const period = defaultPeriod();
  const [form, setForm] = useState({
    periodStart: period.start,
    periodEnd: period.end,
    scores: Object.fromEntries(CRITERIA.map((c) => [c, 3])) as Record<string, number>,
    strengths: "",
    areasForImprovement: "",
    goals: "",
    comments: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const average =
    Object.values(form.scores).reduce((a, b) => a + b, 0) / Math.max(1, Object.values(form.scores).length);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/employees/${employeeId}/appraisals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        ...(cycleId ? { cycleId } : {}),
        ...(reviewType ? { reviewType } : {}),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error?.formErrors?.[0] ?? body.error ?? "Failed to submit appraisal");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
        {triggerLabel ?? "New Appraisal"}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={title ?? "New Performance Appraisal"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Period start</Label>
              <Input
                type="date"
                required
                value={form.periodStart}
                onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
              />
            </div>
            <div>
              <Label>Period end</Label>
              <Input
                type="date"
                required
                value={form.periodEnd}
                onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-secondary">Scores (1–5)</span>
              <div className="flex items-center gap-1.5 text-xs text-muted">
                Average <Badge variant={ratingVariant(average)}>{average.toFixed(2)}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              {CRITERIA.map((criterion) => (
                <div key={criterion} className="flex items-center gap-3">
                  <span className="w-32 text-xs text-secondary">{criterion}</span>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={form.scores[criterion]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, scores: { ...f.scores, [criterion]: Number(e.target.value) } }))
                    }
                    className="h-1.5 flex-1 accent-primary-500"
                  />
                  <span className="w-4 text-right text-sm text-foreground">{form.scores[criterion]}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Strengths</Label>
            <Textarea
              value={form.strengths}
              onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))}
              rows={2}
            />
          </div>
          <div>
            <Label>Areas for improvement</Label>
            <Textarea
              value={form.areasForImprovement}
              onChange={(e) => setForm((f) => ({ ...f, areasForImprovement: e.target.value }))}
              rows={2}
            />
          </div>
          <div>
            <Label>Goals for next period</Label>
            <Textarea
              value={form.goals}
              onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))}
              rows={2}
            />
          </div>
          <div>
            <Label>Other comments (optional)</Label>
            <Textarea
              value={form.comments}
              onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
              rows={2}
            />
          </div>

          {error && <Alert variant="error">{error}</Alert>}

          <Button type="submit" className="w-full" loading={loading}>
            {loading ? "Submitting..." : "Submit Appraisal"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
