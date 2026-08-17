"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    <Card>
      <CardHeader className="flex-col items-start gap-0">
        <CardTitle>Leave Policies</CardTitle>
        <CardDescription>
          Annual entitlement per leave type. Applies to new balances going forward — existing balances aren't retroactively changed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {ALL_TYPES.map((type) => (
            <div key={type} className="flex items-center gap-3 text-sm">
              <span className="w-28 text-foreground">{type}</span>
              <Input
                type="number"
                min={0}
                max={365}
                value={values[type]}
                onChange={(e) => setValues((v) => ({ ...v, [type]: Number(e.target.value) }))}
                className="w-24"
              />
              <span className="text-muted">days / year</span>
              <Button
                variant="link"
                size="sm"
                onClick={() => save(type)}
                disabled={saving !== null}
                className="ml-auto text-xs"
              >
                {saving === type ? "Saving..." : "Save"}
              </Button>
              {savedType === type && <span className="text-xs text-success-700">Saved</span>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
