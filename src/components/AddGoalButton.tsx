"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Modal from "./Modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { extractErrorMessage } from "@/lib/api-error";

type Employee = { id: string; firstName: string; lastName: string };
type ParentGoalOption = { id: string; title: string; employeeName: string };

const EMPTY_FORM = {
  employeeId: "",
  title: "",
  target: "",
  current: "",
  unit: "",
  periodStart: "",
  periodEnd: "",
  parentGoalId: "",
};

// Org/team-wide "New Goal" entry point for the kanban board — before this,
// goals could only be created from KpiSection on an individual employee's
// profile. Posts to the same /api/employees/:id/kpis endpoint KpiSection
// uses, with the actor first picking WHICH employee the goal belongs to.
export default function AddGoalButton({
  employees,
  parentGoalOptions = [],
}: {
  employees: Employee[];
  parentGoalOptions?: ParentGoalOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employeeId) {
      setError("Pick an employee for this goal");
      return;
    }
    const targetNum = Number(form.target);
    if (!(targetNum > 0)) {
      setError("Target must be greater than 0");
      return;
    }

    setLoading(true);
    setError(null);
    const res = await fetch(`/api/employees/${form.employeeId}/kpis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        target: targetNum,
        current: form.current !== "" ? Number(form.current) : undefined,
        unit: form.unit || undefined,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        parentGoalId: form.parentGoalId || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(extractErrorMessage(body, "Failed to create goal"));
      return;
    }
    setForm(EMPTY_FORM);
    setOpen(false);
    router.refresh();
  }

  function handleClose() {
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
        New Goal
      </Button>

      <Modal open={open} onClose={handleClose} title="New Goal">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Employee</Label>
            <Select
              value={form.employeeId}
              onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
              required
            >
              <option value="">Select employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Title</Label>
            <Input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target</Label>
              <Input
                required
                type="number"
                step="0.01"
                min="0.01"
                value={form.target}
                onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
              />
            </div>
            <div>
              <Label>Current (optional)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.current}
                onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Unit (%, $, tickets...)</Label>
            <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Period start</Label>
              <Input
                required
                type="date"
                value={form.periodStart}
                onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
              />
            </div>
            <div>
              <Label>Period end</Label>
              <Input
                required
                type="date"
                value={form.periodEnd}
                onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
              />
            </div>
          </div>

          {parentGoalOptions.length > 0 && (
            <div>
              <Label>Parent goal (optional)</Label>
              <Select
                value={form.parentGoalId}
                onChange={(e) => setForm((f) => ({ ...f, parentGoalId: e.target.value }))}
              >
                <option value="">None — standalone goal</option>
                {parentGoalOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title} — {g.employeeName}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          <Button type="submit" className="w-full" loading={loading}>
            {loading ? "Creating..." : "Create Goal"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
