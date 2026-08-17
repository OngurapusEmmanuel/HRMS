"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { kpiStatusVariant } from "@/lib/badge-variants";

type CheckIn = {
  id: string;
  note: string;
  evidenceUrl: string | null;
  createdById: string;
  createdAt: string;
};

type Kpi = {
  id: string;
  title: string;
  target: string;
  current: string;
  unit: string | null;
  status: string;
  periodEnd: string;
  parentGoalId?: string | null;
  parent?: { title: string } | null;
  _count?: { checkIns: number };
};

type CheckInFormState = { note: string; current: string; evidenceUrl: string };
const EMPTY_CHECK_IN_FORM: CheckInFormState = { note: "", current: "", evidenceUrl: "" };

const STATUSES = ["NOT_STARTED", "ON_TRACK", "AT_RISK", "OFF_TRACK", "COMPLETED", "CANCELLED"];

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

  // Check-in flow: an inline "add check-in" form per KPI (note required,
  // current-value update optional) instead of silently PATCHing `current`
  // on blur, plus an expandable recent-check-ins list per KPI.
  const [checkInOpen, setCheckInOpen] = useState<Record<string, boolean>>({});
  const [checkInForm, setCheckInForm] = useState<Record<string, CheckInFormState>>({});
  const [checkInLoading, setCheckInLoading] = useState<Record<string, boolean>>({});
  const [checkInError, setCheckInError] = useState<Record<string, string | null>>({});
  const [checkIns, setCheckIns] = useState<Record<string, CheckIn[]>>({});
  const [checkInsExpanded, setCheckInsExpanded] = useState<Record<string, boolean>>({});
  const [checkInsLoading, setCheckInsLoading] = useState<Record<string, boolean>>({});
  const [checkInCounts, setCheckInCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialKpis.map((k) => [k.id, k._count?.checkIns ?? 0]))
  );

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
    setCheckInCounts((prev) => ({ ...prev, [created.id]: 0 }));
    setShowForm(false);
    setForm({ title: "", target: "", unit: "", periodStart: "", periodEnd: "" });
    router.refresh();
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

  async function submitCheckIn(kpiId: string, e: React.FormEvent) {
    e.preventDefault();
    const values = checkInForm[kpiId] ?? EMPTY_CHECK_IN_FORM;
    if (!values.note.trim()) return;

    setCheckInLoading((s) => ({ ...s, [kpiId]: true }));
    setCheckInError((s) => ({ ...s, [kpiId]: null }));
    const res = await fetch(`/api/kpis/${kpiId}/check-ins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note: values.note,
        evidenceUrl: values.evidenceUrl || undefined,
        current: values.current !== "" ? Number(values.current) : undefined,
      }),
    });
    setCheckInLoading((s) => ({ ...s, [kpiId]: false }));
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setCheckInError((s) => ({ ...s, [kpiId]: body.error ?? "Failed to add check-in" }));
      return;
    }
    const created = await res.json();
    setCheckIns((prev) => ({ ...prev, [kpiId]: [created, ...(prev[kpiId] ?? [])] }));
    setCheckInCounts((prev) => ({ ...prev, [kpiId]: (prev[kpiId] ?? 0) + 1 }));
    if (created.kpiCurrent !== undefined) {
      setKpis((prev) => prev.map((k) => (k.id === kpiId ? { ...k, current: created.kpiCurrent } : k)));
    }
    setCheckInForm((prev) => ({ ...prev, [kpiId]: EMPTY_CHECK_IN_FORM }));
    setCheckInOpen((prev) => ({ ...prev, [kpiId]: false }));
    setCheckInsExpanded((prev) => ({ ...prev, [kpiId]: true }));
    router.refresh();
  }

  async function toggleCheckIns(kpiId: string) {
    if (checkInsExpanded[kpiId]) {
      setCheckInsExpanded((prev) => ({ ...prev, [kpiId]: false }));
      return;
    }
    if (!checkIns[kpiId]) {
      setCheckInsLoading((prev) => ({ ...prev, [kpiId]: true }));
      const res = await fetch(`/api/kpis/${kpiId}/check-ins`);
      setCheckInsLoading((prev) => ({ ...prev, [kpiId]: false }));
      if (res.ok) {
        const data = await res.json();
        setCheckIns((prev) => ({ ...prev, [kpiId]: data }));
        setCheckInCounts((prev) => ({ ...prev, [kpiId]: data.length }));
      }
    }
    setCheckInsExpanded((prev) => ({ ...prev, [kpiId]: true }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>KPIs</CardTitle>
        {canManage && (
          <Button variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "Add KPI"}
          </Button>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {kpis.map((k) => {
            const pct = Math.min(100, Math.round((Number(k.current) / Number(k.target)) * 100));
            const cf = checkInForm[k.id] ?? EMPTY_CHECK_IN_FORM;
            return (
              <div key={k.id} className="border-b border-border pb-4 text-sm last:border-0 last:pb-0">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-foreground">{k.title}</span>
                  <Badge variant={kpiStatusVariant[k.status] ?? "neutral"}>{k.status.replace("_", " ")}</Badge>
                </div>
                {k.parent && <p className="mb-1 text-xs text-muted">part of: {k.parent.title}</p>}
                <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full bg-primary-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>
                    {k.current}
                    {k.unit ?? ""} / {k.target}
                    {k.unit ?? ""} · due {new Date(k.periodEnd).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleCheckIns(k.id)}
                    className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                  >
                    {checkInsLoading[k.id] ? "Loading…" : `Check-ins (${checkInCounts[k.id] ?? 0})`}
                  </button>
                </div>

                {checkInsExpanded[k.id] && (
                  <div className="mt-2 space-y-2 rounded-lg bg-surface-2 p-2">
                    {(checkIns[k.id] ?? []).length === 0 && <p className="text-xs text-muted">No check-ins yet.</p>}
                    {(checkIns[k.id] ?? []).slice(0, 5).map((c) => (
                      <div key={c.id} className="text-xs">
                        <span className="text-muted">{new Date(c.createdAt).toLocaleDateString()}</span>
                        <p className="text-secondary">{c.note}</p>
                        {c.evidenceUrl && (
                          <a
                            href={c.evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary-600 hover:underline dark:text-primary-400"
                          >
                            evidence
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(isOwner || canManage) && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setCheckInOpen((s) => ({ ...s, [k.id]: !s[k.id] }))}
                      className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                      {checkInOpen[k.id] ? "Cancel check-in" : "+ Add check-in"}
                    </button>
                    {checkInOpen[k.id] && (
                      <form onSubmit={(e) => submitCheckIn(k.id, e)} className="mt-1.5 space-y-1.5 rounded-lg border border-border p-2">
                        <Textarea
                          required
                          placeholder="What's the update?"
                          value={cf.note}
                          onChange={(e) => setCheckInForm((s) => ({ ...s, [k.id]: { ...cf, note: e.target.value } }))}
                          className="min-h-[60px] text-xs"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={`New current${k.unit ? ` (${k.unit})` : ""}`}
                            value={cf.current}
                            onChange={(e) => setCheckInForm((s) => ({ ...s, [k.id]: { ...cf, current: e.target.value } }))}
                            className="text-xs"
                          />
                          <Input
                            type="url"
                            placeholder="Evidence link (optional)"
                            value={cf.evidenceUrl}
                            onChange={(e) => setCheckInForm((s) => ({ ...s, [k.id]: { ...cf, evidenceUrl: e.target.value } }))}
                            className="text-xs"
                          />
                        </div>
                        {checkInError[k.id] && <Alert variant="error">{checkInError[k.id]}</Alert>}
                        <Button type="submit" size="sm" loading={checkInLoading[k.id]}>
                          {checkInLoading[k.id] ? "Saving..." : "Save check-in"}
                        </Button>
                      </form>
                    )}
                  </div>
                )}

                {canManage && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(k.id, s)}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                          s === k.status ? "bg-primary-500 text-white" : "bg-surface-2 text-secondary hover:bg-border"
                        )}
                      >
                        {s.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {kpis.length === 0 && <p className="text-sm text-muted">No KPIs set.</p>}
        </div>

        {showForm && (
          <form onSubmit={addKpi} className="mt-4 space-y-2 border-t border-border pt-4">
            <div>
              <Label>Title</Label>
              <Input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Target</Label>
                <Input required type="number" step="0.01" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} />
              </div>
              <div>
                <Label>Unit (%, $, tickets...)</Label>
                <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Period start</Label>
                <Input required type="date" value={form.periodStart} onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))} />
              </div>
              <div>
                <Label>Period end</Label>
                <Input required type="date" value={form.periodEnd} onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))} />
              </div>
            </div>
            {error && <Alert variant="error">{error}</Alert>}
            <Button type="submit" size="sm" loading={loading}>
              {loading ? "Adding..." : "Add KPI"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
