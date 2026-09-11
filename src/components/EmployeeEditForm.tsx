"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { extractErrorMessage } from "@/lib/api-error";

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
    setError(null);
    setSaved(false);
    if (Number(form.baseSalary) < 0) {
      setError("Annual salary cannot be negative.");
      return;
    }
    setLoading(true);
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
      setError(extractErrorMessage(body, "Failed to update employee"));
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Employee</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Job title</Label>
            <Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Department</Label>
            <Select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">Unassigned</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Annual salary</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.baseSalary}
              onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label>Contract end date</Label>
            <Input
              type="date"
              value={form.contractEndDate}
              onChange={(e) => setForm({ ...form, contractEndDate: e.target.value })}
              className="max-w-xs"
            />
            <p className="mt-1 text-xs text-muted">Leave blank for a permanent/open-ended contract.</p>
          </div>

          {error && (
            <div className="col-span-2">
              <Alert variant="error">{error}</Alert>
            </div>
          )}
          {saved && !error && (
            <div className="col-span-2">
              <Alert variant="success">Saved.</Alert>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" loading={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
