"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

const LEAVE_TYPES = ["ANNUAL", "SICK", "UNPAID", "MATERNITY", "PATERNITY", "OTHER"];

export default function RequestLeaveButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ type: "ANNUAL", startDate: "", endDate: "", reason: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error?.formErrors?.[0] ?? body.error ?? "Failed to submit request");
      return;
    }
    setForm({ type: "ANNUAL", startDate: "", endDate: "", reason: "" });
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg px-4 py-2"
      >
        Request Leave
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Request Leave">
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-gray-700 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 mb-1">Start date</label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">End date</label>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Reason (optional)</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              rows={3}
            />
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2 font-medium disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </Modal>
    </>
  );
}
