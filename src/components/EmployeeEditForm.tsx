"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  employee: {
    id: string;
    jobTitle: string;
    status: string;
    baseSalary: string; // Decimal serialized as string from the server component
    departmentId: string | null;
    contractEndDate: string | null; // ISO date, or null for no fixed end
  };
  departments: { id: string; name: string }[];
};

const STATUSES = ["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"];

export default function EmployeeEditForm({ employee, departments }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    jobTitle: employee.jobTitle,
    status: employee.status,
    baseSalary: employee.baseSalary,
    departmentId: employee.departmentId ?? "",
    contractEndDate: employee.contractEndDate ? employee.contractEndDate.slice(0, 10) : "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobTitle: form.jobTitle,
        status: form.status,
        baseSalary: Number(form.baseSalary),
        departmentId: form.departmentId || null,
        contractEndDate: form.contractEndDate || null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error?.formErrors?.[0] ?? body.error ?? "Failed to update employee");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 text-sm">
      <h2 className="font-semibold text-gray-900">Edit Employee</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 mb-1">Job title</label>
          <input
            value={form.jobTitle}
            onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Department</label>
          <select
            value={form.departmentId}
            onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">Unassigned</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Annual salary</label>
          <input
            type="number"
            step="0.01"
            value={form.baseSalary}
            onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Contract end date</label>
          <input
            type="date"
            value={form.contractEndDate}
            onChange={(e) => setForm({ ...form, contractEndDate: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          <p className="text-xs text-gray-400 mt-1">Leave blank for a permanent/open-ended contract.</p>
        </div>
      </div>

      {error && <p className="text-red-600 text-xs">{error}</p>}
      {saved && !error && <p className="text-green-600 text-xs">Saved.</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
