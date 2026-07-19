"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

export default function AddDepartmentButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create department");
      return;
    }
    setName("");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg px-4 py-2"
      >
        + Add Department
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Department">
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-gray-700 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2 font-medium disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Department"}
          </button>
        </form>
      </Modal>
    </>
  );
}
