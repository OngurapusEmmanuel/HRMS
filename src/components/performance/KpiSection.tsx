"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Kpi = {
  id: string;
  title: string;
  target: string;
  current: string;
  unit: string | null;
  status: string;
  periodEnd: string;
};

const STATUS_STYLES: Record<string, string> = {
  ON_TRACK: "bg-green-100 text-green-700",
  AT_RISK: "bg-yellow-100 text-yellow-700",
  OFF_TRACK: "bg-red-100 text-red-700",
  COMPLETED: "bg-blue-100 text-blue-700",
};

export default function KpiSection({
  employeeId,
  initialKpis,
  canManage,
  isOwner,
}: {
  employeeId: string;
  initialKpis: Kpi[];
  canManage: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [kpis, setKpis] = useState(initialKpis);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", target: "", unit: "", periodStart: "", periodEnd: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addKpi(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/employees/${employeeId}/kpis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, target: Number(form.target) }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to add KPI");
      return;
    }
    const created = await res.json();
    setKpis((prev) => [created, ...prev]);
    setShowForm(false);
    setForm({ title: "", target: "", unit: "", periodStart: "", periodEnd: "" });
    router.refresh();
  }

  async function updateCurrent(kpiId: string, current: number) {
    const res = await fetch(`/api/kpis/${kpiId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current }),
    });
    if (res.ok) {
      setKpis((prev) => prev.map((k) => (k.id === kpiId ? { ...k, current: current.toString() } : k)));
    }
  }

  async function updateStatus(kpiId: string, status: string) {
    const res = await fetch(`/api/kpis/${kpiId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setKpis((prev) => prev.map((k) => (k.id === kpiId ? { ...k, status } : k)));
      router.refresh();
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">KPIs</h2>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="text-brand-600 hover:underline text-xs font-medium">
            {showForm ? "Cancel" : "+ Add KPI"}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {kpis.map((k) => {
          const pct = Math.min(100, Math.round((Number(k.current) / Number(k.target)) * 100));
          return (
            <div key={k.id} className="text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900">{k.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[k.status]}`}>{k.status.replace("_", " ")}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{k.current}{k.unit ?? ""} / {k.target}{k.unit ?? ""} · due {new Date(k.periodEnd).toLocaleDateString()}</span>
                {isOwner && (
                  <input
                    type="number"
                    defaultValue={k.current}
                    onBlur={(e) => updateCurrent(k.id, Number(e.target.value))}
                    className="w-20 rounded border border-gray-200 px-1.5 py-0.5"
                  />
                )}
              </div>
              {canManage && (
                <div className="flex gap-1 mt-1">
                  {["ON_TRACK", "AT_RISK", "OFF_TRACK", "COMPLETED"].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(k.id, s)}
                      className={`px-1.5 py-0.5 rounded text-[10px] ${s === k.status ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {kpis.length === 0 && <p className="text-gray-400 text-sm">No KPIs set.</p>}
      </div>

      {showForm && (
        <form onSubmit={addKpi} className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
          <input required placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <input required type="number" step="0.01" placeholder="Target" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2" />
            <input placeholder="Unit (%, $, tickets...)" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input required type="date" value={form.periodStart} onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2" />
            <input required type="date" value={form.periodEnd} onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button type="submit" disabled={loading} className="bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-4 py-2 font-medium text-sm disabled:opacity-60">
            {loading ? "Adding..." : "Add KPI"}
          </button>
        </form>
      )}
    </div>
  );
}
