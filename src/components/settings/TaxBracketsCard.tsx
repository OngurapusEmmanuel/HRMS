"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

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
    <Card>
      <CardHeader className="flex-col items-start gap-0">
        <CardTitle>Payroll Tax Brackets</CardTitle>
        <CardDescription>
          Progressive annual income brackets used when generating payroll. The last row is always uncapped.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-2">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1 text-xs text-muted">
            <span>Up to (annual)</span>
            <span>Rate (%)</span>
            <span />
          </div>
          {rows.map((row, i) => {
            const isLast = i === rows.length - 1;
            return (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 text-sm">
                <Input
                  type="number"
                  placeholder={isLast ? "Uncapped" : "e.g. 24000"}
                  disabled={isLast}
                  value={row.upTo}
                  onChange={(e) => updateRow(i, "upTo", e.target.value)}
                />
                <Input
                  type="number"
                  step="0.1"
                  value={row.ratePercent}
                  onChange={(e) => updateRow(i, "ratePercent", e.target.value)}
                />
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => removeRow(i)}
                  disabled={rows.length <= 1}
                  className="text-xs text-danger-500 hover:text-danger-700"
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="link" size="sm" onClick={addRow} className="text-sm">
            + Add bracket
          </Button>
          <Button onClick={handleSave} disabled={saving} loading={saving} className="ml-auto" size="sm">
            {saving ? "Saving..." : "Save Brackets"}
          </Button>
        </div>
      </CardContent>
      {(error || saved) && (
        <CardFooter className="pt-0">
          {error && (
            <Alert variant="error" className="w-full">
              {error}
            </Alert>
          )}
          {saved && !error && (
            <Alert variant="success" className="w-full">
              Saved. Future payroll runs will use this schedule.
            </Alert>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
