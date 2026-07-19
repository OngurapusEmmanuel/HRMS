"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

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
      setServerError(body.error?.formErrors?.[0] ?? body.error ?? "Failed to create employee");
      return;
    }
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg px-4 py-2"
      >
        + Add Employee
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Employee">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 mb-1">First name</label>
              <input {...register("firstName")} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
              {errors.firstName && <p className="text-red-600 text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Last name</label>
              <input {...register("lastName")} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
              {errors.lastName && <p className="text-red-600 text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Email</label>
            <input type="email" {...register("email")} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Temporary password</label>
            <input type="password" {...register("password")} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Job title</label>
            <input {...register("jobTitle")} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            {errors.jobTitle && <p className="text-red-600 text-xs mt-1">{errors.jobTitle.message}</p>}
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Department</label>
            <select {...register("departmentId")} className="w-full rounded-lg border border-gray-300 px-3 py-2">
              <option value="">Unassigned</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 mb-1">Hire date</label>
              <input type="date" {...register("hireDate")} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
              {errors.hireDate && <p className="text-red-600 text-xs mt-1">{errors.hireDate.message}</p>}
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Annual salary</label>
              <input type="number" step="0.01" {...register("baseSalary")} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
              {errors.baseSalary && <p className="text-red-600 text-xs mt-1">{errors.baseSalary.message}</p>}
            </div>
          </div>

          {serverError && <p className="text-red-600 text-xs">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2 font-medium disabled:opacity-60"
          >
            {isSubmitting ? "Creating..." : "Create Employee"}
          </button>
        </form>
      </Modal>
    </>
  );
}
