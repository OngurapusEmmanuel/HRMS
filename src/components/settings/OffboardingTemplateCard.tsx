"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

type Item = { title: string; description: string | null };

export default function OffboardingTemplateCard({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems.length > 0 ? initialItems : [{ title: "", description: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateItem(i: number, field: "title" | "description", value: string) {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
    setSaved(false);
  }

  function addItem() {
    setItems((prev) => [...prev, { title: "", description: "" }]);
  }

  function removeItem(i: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function move(i: number, direction: -1 | 1) {
    const target = i + direction;
    if (target < 0 || target >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[i], next[target]] = [next[target], next[i]];
      return next;
    });
  }

  async function handleSave() {
    const cleaned = items.filter((i) => i.title.trim().length > 0);
    if (cleaned.length === 0) {
      setError("At least one task with a title is required");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/settings/offboarding-template", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cleaned }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save");
      return;
    }
    setItems(cleaned);
    setSaved(true);
  }

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-0">
        <CardTitle>Offboarding Checklist Template</CardTitle>
        <CardDescription>
          Every terminated employee gets a checklist copied from this list. Editing it only affects
          terminations from now on — existing employees' checklists don't change.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex flex-col gap-0.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="text-muted hover:text-secondary disabled:opacity-30 disabled:pointer-events-none"
                  aria-label="Move up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  className="text-muted hover:text-secondary disabled:opacity-30 disabled:pointer-events-none"
                  aria-label="Move down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 space-y-1">
                <Input
                  value={item.title}
                  onChange={(e) => updateItem(i, "title", e.target.value)}
                  placeholder="Task title"
                />
                <Input
                  value={item.description ?? ""}
                  onChange={(e) => updateItem(i, "description", e.target.value)}
                  placeholder="Description (optional)"
                  className="text-xs"
                />
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={() => removeItem(i)}
                disabled={items.length <= 1}
                className="pt-1.5 text-xs text-danger-500 hover:text-danger-700"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="link" size="sm" onClick={addItem} className="text-sm">
            + Add task
          </Button>
          <Button onClick={handleSave} disabled={saving} loading={saving} className="ml-auto" size="sm">
            {saving ? "Saving..." : "Save Template"}
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
              Saved. Newly terminated employees will get this checklist.
            </Alert>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
