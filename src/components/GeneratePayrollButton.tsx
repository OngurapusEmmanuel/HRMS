"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

const now = new Date();
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function GeneratePayrollButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ generated: number; skipped: number } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, year }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to generate payroll");
      return;
    }
    const body = await res.json();
    setResult(body);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg px-4 py-2"
      >
        Generate Payroll
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Generate Payroll">
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Runs against all active employees, applying your organization's tax brackets
            (configurable under Settings). Already-generated employees for this period are
            skipped, so it's safe to re-run.
          </p>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          {result && (
            <p className="text-green-600 text-xs">
              Generated {result.generated} payslip(s), skipped {result.skipped} already done.
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2 font-medium disabled:opacity-60"
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </form>
      </Modal>
    </>
  );
}
