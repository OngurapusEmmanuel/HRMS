"use client";

import { useState } from "react";

type Policy = { type: string; annualDays: number };

const ALL_TYPES = ["ANNUAL", "SICK", "UNPAID", "MATERNITY", "PATERNITY", "OTHER"];

export default function LeavePoliciesCard({ initialPolicies }: { initialPolicies: Policy[] }) {
  const byType = new Map(initialPolicies.map((p) => [p.type, p.annualDays]));
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(ALL_TYPES.map((t) => [t, byType.get(t) ?? 0]))
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [savedType, setSavedType] = useState<string | null>(null);

  async function save(type: string) {
    setSaving(type);
    setSavedType(null);
    const res = await fetch("/api/settings/leave-policies", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, annualDays: values[type] }),
    });
    setSaving(null);
    if (res.ok) setSavedType(type);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-1">Leave Policies</h2>
      <p className="text-sm text-gray-500 mb-4">
        Annual entitlement per leave type. Applies to new balances going forward — existing balances aren't retroactively changed.
      </p>

      <div className="space-y-3">
        {ALL_TYPES.map((type) => (
          <div key={type} className="flex items-center gap-3 text-sm">
            <span className="w-28 text-gray-700">{type}</span>
            <input
              type="number"
              min={0}
              max={365}
              value={values[type]}
              onChange={(e) => setValues((v) => ({ ...v, [type]: Number(e.target.value) }))}
              className="w-24 rounded-lg border border-gray-300 px-3 py-1.5"
            />
            <span className="text-gray-400">days / year</span>
            <button
              onClick={() => save(type)}
              disabled={saving !== null}
              className="ml-auto text-brand-600 hover:underline text-xs font-medium disabled:opacity-50"
            >
              {saving === type ? "Saving..." : "Save"}
            </button>
            {savedType === type && <span className="text-green-600 text-xs">Saved</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
