"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "../Modal";

export default function AddCandidateButton({ jobPostingId }: { jobPostingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", resumeUrl: "", source: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/job-postings/${jobPostingId}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error?.formErrors?.[0] ?? body.error ?? "Failed to add candidate");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg px-4 py-2">
        + Add Candidate
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Candidate to Pipeline">
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 mb-1">First name</label>
              <input required value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Last name</label>
              <input required value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Phone (optional)</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Resume URL (optional)</label>
            <input value={form.resumeUrl} onChange={(e) => setForm((f) => ({ ...f, resumeUrl: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Source (optional)</label>
            <input placeholder="Referral, LinkedIn, career site..." value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2 font-medium disabled:opacity-60">
            {loading ? "Adding..." : "Add to Pipeline"}
          </button>
        </form>
      </Modal>
    </>
  );
}
