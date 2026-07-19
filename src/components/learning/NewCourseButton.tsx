"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "../Modal";

export default function NewCourseButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "SKILLS", durationHours: "1", required: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/training-courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, durationHours: Number(form.durationHours) }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error?.formErrors?.[0] ?? body.error ?? "Failed to create course");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg px-4 py-2">
        + New Course
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New Training Course">
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-gray-700 mb-1">Title</label>
            <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Description (optional)</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                <option value="COMPLIANCE">Compliance</option>
                <option value="SKILLS">Skills</option>
                <option value="CAREER">Career</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Duration (hours)</label>
              <input type="number" step="0.5" min="0.5" value={form.durationHours} onChange={(e) => setForm((f) => ({ ...f, durationHours: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-gray-700">
            <input type="checkbox" checked={form.required} onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))} />
            Required for all employees (e.g. mandatory compliance training)
          </label>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2 font-medium disabled:opacity-60">
            {loading ? "Creating..." : "Create Course"}
          </button>
        </form>
      </Modal>
    </>
  );
}
