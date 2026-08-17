"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Modal from "../Modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";

export default function NewCourseButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "SKILLS", durationHours: "1", required: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/training-courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, durationHours: Number(form.durationHours) }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error?.formErrors?.[0] ?? body.error ?? "Failed to create course");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
        New Course
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New Training Course">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                <option value="COMPLIANCE">Compliance</option>
                <option value="SKILLS">Skills</option>
                <option value="CAREER">Career</option>
              </Select>
            </div>
            <div>
              <Label>Duration (hours)</Label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                value={form.durationHours}
                onChange={(e) => setForm((f) => ({ ...f, durationHours: e.target.value }))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-secondary">
            <input
              type="checkbox"
              checked={form.required}
              onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))}
              className="h-4 w-4 rounded border-border-strong text-primary-500 focus:ring-primary-500"
            />
            Required for all employees (e.g. mandatory compliance training)
          </label>
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" className="w-full" loading={loading}>
            {loading ? "Creating..." : "Create Course"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
