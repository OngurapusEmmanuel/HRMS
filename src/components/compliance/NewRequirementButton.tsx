"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "../Modal";

export default function NewRequirementButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", jurisdiction: "", frequency: "ANNUAL", nextDueDate: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/compliance-requirements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error?.formErrors?.[0] ?? body.error ?? "Failed to create requirement");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg px-4 py-2">
        + New Requirement
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New Compliance Requirement">
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-gray-700 mb-1">Title</label>
            <input required placeholder="e.g. Quarterly payroll tax filing" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Description (optional)</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Jurisdiction (optional)</label>
            <input placeholder="e.g. Kenya, US-CA" value={form.jurisdiction} onChange={(e) => setForm((f) => ({ ...f, jurisdiction: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 mb-1">Frequency</label>
              <select value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                <option value="ONE_TIME">One-time</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="ANNUAL">Annual</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Next due date</label>
              <input type="date" required value={form.nextDueDate} onChange={(e) => setForm((f) => ({ ...f, nextDueDate: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2 font-medium disabled:opacity-60">
            {loading ? "Creating..." : "Create Requirement"}
          </button>
        </form>
      </Modal>
    </>
  );
}
