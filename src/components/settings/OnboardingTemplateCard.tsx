"use client";

import { useState } from "react";

type Item = { title: string; description: string | null };

export default function OnboardingTemplateCard({ initialItems }: { initialItems: Item[] }) {
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

    const res = await fetch("/api/settings/onboarding-template", {
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
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-1">Onboarding Checklist Template</h2>
      <p className="text-sm text-gray-500 mb-4">
        Every new hire gets a checklist copied from this list. Editing it only affects hires created
        from now on — existing employees' checklists don't change.
      </p>

      <div className="space-y-3 mb-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex flex-col gap-0.5 pt-1.5">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="text-gray-300 hover:text-gray-600 disabled:opacity-30 text-xs leading-none"
                aria-label="Move up"
              >
                ▲
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                className="text-gray-300 hover:text-gray-600 disabled:opacity-30 text-xs leading-none"
                aria-label="Move down"
              >
                ▼
              </button>
            </div>
            <div className="flex-1 space-y-1">
              <input
                value={item.title}
                onChange={(e) => updateItem(i, "title", e.target.value)}
                placeholder="Task title"
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
              <input
                value={item.description ?? ""}
                onChange={(e) => updateItem(i, "description", e.target.value)}
                placeholder="Description (optional)"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500"
              />
            </div>
            <button
              onClick={() => removeItem(i)}
              disabled={items.length <= 1}
              className="text-red-500 hover:underline text-xs pt-1.5 disabled:opacity-30 disabled:pointer-events-none"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={addItem} className="text-sm text-brand-600 hover:underline">
          + Add task
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Template"}
        </button>
      </div>
      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      {saved && !error && <p className="text-green-600 text-xs mt-2">Saved. New hires will get this checklist.</p>}
    </div>
  );
}
