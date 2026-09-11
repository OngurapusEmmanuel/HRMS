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
import { extractErrorMessage } from "@/lib/api-error";

export default function NewJobPostingButton({ departments }: { departments: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", departmentId: "", description: "", status: "DRAFT" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/job-postings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, departmentId: form.departmentId || null }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(extractErrorMessage(body, "Failed to create posting"));
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
        New Posting
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New Job Posting">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label>Department</Label>
            <Select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>
              <option value="">Unassigned</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea required rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="DRAFT">Draft</option>
              <option value="OPEN">Open (visible immediately)</option>
            </Select>
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" className="w-full" loading={loading}>
            {loading ? "Creating..." : "Create Posting"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
