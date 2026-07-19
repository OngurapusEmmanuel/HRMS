"use client";

import { useState } from "react";

type Bracket = { upTo: string | null; rate: string }; // decimals arrive serialized as strings from Prisma

export default function TaxBracketsCard({ initialBrackets }: { initialBrackets: Bracket[] }) {
  const [rows, setRows] = useState(
    initialBrackets.map((b) => ({ upTo: b.upTo === null ? "" : b.upTo, ratePercent: (Number(b.rate) * 100).toString() }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateRow(i: number, field: "upTo" | "ratePercent", value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
    setSaved(false);
  }

  function addRow() {
    // New row inserted just before the uncapped last one.
    setRows((prev) => [...prev.slice(0, -1), { upTo: "", ratePercent: "0" }, prev[prev.length - 1]]);
  }

  function removeRow(i: number) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const brackets = rows.map((r, i) => ({
      upTo: i === rows.length - 1 ? null : Number(r.upTo),
      rate: Number(r.ratePercent) / 100,
    }));

    const res = await fetch("/api/settings/tax-brackets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brackets }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save");
      return;
    }
    setSaved(true);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-1">Payroll Tax Brackets</h2>
      <p className="text-sm text-gray-500 mb-4">
        Progressive annual income brackets used when generating payroll. The last row is always uncapped.
      </p>

      <div className="space-y-2 mb-4">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-gray-400 px-1">
          <span>Up to (annual)</span>
          <span>Rate (%)</span>
          <span />
        </div>
        {rows.map((row, i) => {
          const isLast = i === rows.length - 1;
          return (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center text-sm">
              <input
                type="number"
                placeholder={isLast ? "Uncapped" : "e.g. 24000"}
                disabled={isLast}
                value={row.upTo}
                onChange={(e) => updateRow(i, "upTo", e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <input
                type="number"
                step="0.1"
                value={row.ratePercent}
                onChange={(e) => updateRow(i, "ratePercent", e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5"
              />
              <button
                onClick={() => removeRow(i)}
                disabled={rows.length <= 1}
                className="text-red-500 hover:underline text-xs disabled:opacity-30 disabled:pointer-events-none"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={addRow} className="text-sm text-brand-600 hover:underline">
          + Add bracket
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Brackets"}
        </button>
      </div>
      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      {saved && !error && <p className="text-green-600 text-xs mt-2">Saved. Future payroll runs will use this schedule.</p>}
    </div>
  );
}
