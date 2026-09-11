"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Modal from "./Modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { extractErrorMessage } from "@/lib/api-error";

const schema = z.object({
  name: z.string().min(1, "Required"),
  periodStart: z.string().min(1, "Required"),
  periodEnd: z.string().min(1, "Required"),
  dueAt: z.string().min(1, "Required"),
  departmentId: z.string().optional(),
  requireSelfReview: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export default function AddCycleButton({ departments }: { departments: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { requireSelfReview: true } });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const res = await fetch("/api/appraisal-cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, departmentId: values.departmentId || null }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(extractErrorMessage(body, "Failed to create cycle"));
      return;
    }
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
        New Cycle
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="New Appraisal Cycle">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label>Cycle name</Label>
            <Input placeholder="e.g. H2 2026 Growth Review" {...register("name")} error={!!errors.name} />
            {errors.name && <p className="mt-1 text-xs text-danger-500">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Period start</Label>
              <Input type="date" {...register("periodStart")} error={!!errors.periodStart} />
              {errors.periodStart && <p className="mt-1 text-xs text-danger-500">{errors.periodStart.message}</p>}
            </div>
            <div>
              <Label>Period end</Label>
              <Input type="date" {...register("periodEnd")} error={!!errors.periodEnd} />
              {errors.periodEnd && <p className="mt-1 text-xs text-danger-500">{errors.periodEnd.message}</p>}
            </div>
          </div>

          <div>
            <Label>Due date</Label>
            <Input type="date" {...register("dueAt")} error={!!errors.dueAt} />
            {errors.dueAt && <p className="mt-1 text-xs text-danger-500">{errors.dueAt.message}</p>}
          </div>

          <div>
            <Label>Department</Label>
            <Select {...register("departmentId")}>
              <option value="">Org-wide</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm text-secondary">
            <input
              type="checkbox"
              {...register("requireSelfReview")}
              className="h-4 w-4 rounded border-border-strong text-primary-500 focus:ring-primary-500"
            />
            Require a self-review from each employee
          </label>

          {serverError && <Alert variant="error">{serverError}</Alert>}

          <Button type="submit" className="w-full" loading={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Cycle"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
