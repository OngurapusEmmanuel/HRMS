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
  email: z.string().email(),
  password: z.string().min(8, "At least 8 characters"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  jobTitle: z.string().min(1),
  departmentId: z.string().optional(),
  hireDate: z.string().min(1),
  baseSalary: z.coerce.number().nonnegative(),
  phone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function AddEmployeeButton({ departments }: { departments: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, departmentId: values.departmentId || null }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(extractErrorMessage(body, "Failed to create employee"));
      return;
    }
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
        Add Employee
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Employee">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First name</Label>
              <Input {...register("firstName")} error={!!errors.firstName} />
              {errors.firstName && <p className="mt-1 text-xs text-danger-500">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label>Last name</Label>
              <Input {...register("lastName")} error={!!errors.lastName} />
              {errors.lastName && <p className="mt-1 text-xs text-danger-500">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <Label>Email</Label>
            <Input type="email" {...register("email")} error={!!errors.email} />
            {errors.email && <p className="mt-1 text-xs text-danger-500">{errors.email.message}</p>}
          </div>

          <div>
            <Label>Temporary password</Label>
            <Input type="password" {...register("password")} error={!!errors.password} />
            {errors.password && <p className="mt-1 text-xs text-danger-500">{errors.password.message}</p>}
          </div>

          <div>
            <Label>Job title</Label>
            <Input {...register("jobTitle")} error={!!errors.jobTitle} />
            {errors.jobTitle && <p className="mt-1 text-xs text-danger-500">{errors.jobTitle.message}</p>}
          </div>

          <div>
            <Label>Department</Label>
            <Select {...register("departmentId")}>
              <option value="">Unassigned</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Hire date</Label>
              <Input type="date" {...register("hireDate")} error={!!errors.hireDate} />
              {errors.hireDate && <p className="mt-1 text-xs text-danger-500">{errors.hireDate.message}</p>}
            </div>
            <div>
              <Label>Annual salary</Label>
              <Input type="number" step="0.01" {...register("baseSalary")} error={!!errors.baseSalary} />
              {errors.baseSalary && <p className="mt-1 text-xs text-danger-500">{errors.baseSalary.message}</p>}
            </div>
          </div>

          {serverError && <Alert variant="error">{serverError}</Alert>}

          <Button type="submit" className="w-full" loading={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Employee"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
