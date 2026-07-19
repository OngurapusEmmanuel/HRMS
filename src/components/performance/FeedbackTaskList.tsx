"use client";

import { useState } from "react";

type Task = { id: string; employeeName: string; relationship: string; submitted: boolean };

export default function FeedbackTaskList({ requests }: { requests: Task[] }) {
  const [tasks, setTasks] = useState(requests);
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({ strengths: "", areasForImprovement: "", comments: "" });
  const [loading, setLoading] = useState(false);

  async function submit(id: string) {
    setLoading(true);
    const res = await fetch(`/api/feedback-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, submitted: true } : t)));
      setOpenId(null);
      setForm({ strengths: "", areasForImprovement: "", comments: "" });
    }
  }

  const pending = tasks.filter((t) => !t.submitted);
  const done = tasks.filter((t) => t.submitted);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {pending.map((t) => (
          <div key={t.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{t.employeeName}</p>
                <p className="text-xs text-gray-400">as {t.relationship.replace("_", " ").toLowerCase()}</p>
              </div>
              <button onClick={() => setOpenId(openId === t.id ? null : t.id)} className="text-brand-600 hover:underline text-xs font-medium">
                {openId === t.id ? "Cancel" : "Give feedback"}
              </button>
            </div>
            {openId === t.id && (
              <div className="mt-3 space-y-2 text-sm">
                <textarea placeholder="Strengths" rows={2} value={form.strengths} onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                <textarea placeholder="Areas for improvement" rows={2} value={form.areasForImprovement} onChange={(e) => setForm((f) => ({ ...f, areasForImprovement: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                <textarea placeholder="Other comments (optional)" rows={2} value={form.comments} onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                <button onClick={() => submit(t.id)} disabled={loading} className="bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-60">
                  {loading ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            )}
          </div>
        ))}
        {pending.length === 0 && <p className="p-4 text-gray-400 text-sm">No pending feedback requests.</p>}
      </div>

      {done.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-2">Already submitted</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {done.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between text-sm">
                <span>{t.employeeName} · {t.relationship.replace("_", " ").toLowerCase()}</span>
                <span className="text-green-600 text-xs font-medium">Submitted</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
