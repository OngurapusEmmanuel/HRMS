"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "../Modal";

export default function NewJobPostingButton({ departments }: { departments: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", departmentId: "", description: "", status: "DRAFT" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/job-postings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, departmentId: form.departmentId || null }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error?.formErrors?.[0] ?? body.error ?? "Failed to create posting");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg px-4 py-2">
        + New Posting
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New Job Posting">
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-gray-700 mb-1">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Department</label>
            <select
              value={form.departmentId}
              onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Unassigned</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Description</label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="DRAFT">Draft</option>
              <option value="OPEN">Open (visible immediately)</option>
            </select>
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2 font-medium disabled:opacity-60">
            {loading ? "Creating..." : "Create Posting"}
          </button>
        </form>
      </Modal>
    </>
  );
}
