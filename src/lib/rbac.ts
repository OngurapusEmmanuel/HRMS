import { Role } from "@prisma/client";
import { prisma } from "./db";

// Central place for "who can do what" — every API route imports from here
// instead of hand-rolling role checks, so permissions stay auditable in one file.
export const permissions = {
  "employee:create": ["ADMIN", "HR"],
  "employee:update": ["ADMIN", "HR"],
  "employee:delete": ["ADMIN"],
  "employee:view_all": ["ADMIN", "HR", "MANAGER"],
  "department:manage": ["ADMIN", "HR"],
  "leave:approve": ["ADMIN", "HR", "MANAGER"],
  "leave:request": ["ADMIN", "HR", "MANAGER", "EMPLOYEE"],
  "payroll:manage": ["ADMIN", "HR"],
  "audit:view": ["ADMIN", "HR"],
  "settings:manage": ["ADMIN", "HR"],
  "appraisal:create": ["ADMIN", "HR", "MANAGER"],
  "appraisal:view_all": ["ADMIN", "HR"],
  "appraisal:manage_summary": ["ADMIN", "HR"],
  "recruitment:manage": ["ADMIN", "HR"],
  "recruitment:view": ["ADMIN", "HR", "MANAGER"],
  "kpi:manage": ["ADMIN", "HR", "MANAGER"],
  "meeting:schedule": ["ADMIN", "HR", "MANAGER"],
  "feedback:request": ["ADMIN", "HR", "MANAGER"],
  "training:manage": ["ADMIN", "HR"],
  "compliance:manage": ["ADMIN", "HR"],
  "reports:view": ["ADMIN", "HR"],
} as const;

export type Permission = keyof typeof permissions;

export function can(role: Role | string, permission: Permission): boolean {
  return (permissions[permission] as readonly string[]).includes(role);
}

// Department IDs a MANAGER is the head of. ADMIN/HR bypass this entirely —
// they can act org-wide — so callers should only consult this for role === "MANAGER".
export async function managedDepartmentIds(employeeId: string): Promise<string[]> {
  const departments = await prisma.department.findMany({
    where: { managerId: employeeId },
    select: { id: true },
  });
  return departments.map((d) => d.id);
}

// True if `role` can act on a leave/attendance/etc. record belonging to
// `targetDepartmentId`. ADMIN and HR act org-wide. MANAGER is restricted to
// departments they head. EMPLOYEE never reaches this check (self-service only).
export async function canActOnDepartment(
  role: Role | string,
  employeeId: string | null,
  targetDepartmentId: string | null
): Promise<boolean> {
  if (role === "ADMIN" || role === "HR") return true;
  if (role !== "MANAGER" || !employeeId || !targetDepartmentId) return false;
  const ids = await managedDepartmentIds(employeeId);
  return ids.includes(targetDepartmentId);
}
