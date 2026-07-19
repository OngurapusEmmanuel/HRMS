"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

const CRITERIA = ["Communication", "Technical Skills", "Teamwork", "Punctuality", "Initiative"];

function defaultPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  return { start: start.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };
}

export default function AppraisalForm({ employeeId }: { employeeId: string }) {
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
      body: JSON.stringify(form),
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
      <button
        onClick={() => setOpen(true)}
        className="bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg px-4 py-2"
      >
        New Appraisal
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="New Performance Appraisal">
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 mb-1">Period start</label>
              <input
                type="date"
                required
                value={form.periodStart}
                onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Period end</label>
              <input
                type="date"
                required
                value={form.periodEnd}
                onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-700">Scores (1–5)</span>
              <span className="text-xs text-gray-400">Average: {average.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              {CRITERIA.map((criterion) => (
                <div key={criterion} className="flex items-center gap-3">
                  <span className="w-32 text-gray-600 text-xs">{criterion}</span>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={form.scores[criterion]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, scores: { ...f.scores, [criterion]: Number(e.target.value) } }))
                    }
                    className="flex-1"
                  />
                  <span className="w-4 text-right text-gray-700">{form.scores[criterion]}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Strengths</label>
            <textarea
              value={form.strengths}
              onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Areas for improvement</label>
            <textarea
              value={form.areasForImprovement}
              onChange={(e) => setForm((f) => ({ ...f, areasForImprovement: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Goals for next period</label>
            <textarea
              value={form.goals}
              onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Other comments (optional)</label>
            <textarea
              value={form.comments}
              onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          {error && <p className="text-red-600 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2 font-medium disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit Appraisal"}
          </button>
        </form>
      </Modal>
    </>
  );
}
