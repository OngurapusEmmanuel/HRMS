"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import Modal from "./Modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

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
      <Button size="sm" leftIcon={<Wallet className="h-4 w-4" />} onClick={() => setOpen(true)}>
        Generate Payroll
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Generate Payroll">
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Month</Label>
              <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Year</Label>
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
          </div>
          <p className="text-xs text-secondary">
            Runs against all active employees, applying your organization's tax brackets
            (configurable under Settings). Already-generated employees for this period are
            skipped, so it's safe to re-run.
          </p>
          {error && <Alert variant="error">{error}</Alert>}
          {result && (
            <Alert variant="success">
              Generated {result.generated} payslip(s), skipped {result.skipped} already done.
            </Alert>
          )}
          <Button type="submit" loading={loading} className="w-full">
            {loading ? "Generating..." : "Generate"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
