import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canActOnDepartment } from "@/lib/rbac";

// Who can see/manage an employee's onboarding checklist: HR/Admin org-wide,
// the manager of that employee's department, or the employee themselves.
async function canManageOnboarding(session: any, targetEmployee: { id: string; departmentId: string | null }) {
  const role = session.user.role;
  if (role === "ADMIN" || role === "HR") return true;
  if (session.user.employeeId === targetEmployee.id) return true;
  return canActOnDepartment(role, session.user.employeeId, targetEmployee.departmentId);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const employee = await prisma.employee.findFirst({
    where: { id: params.id, organizationId: (session.user as any).organizationId },
    select: { id: true, departmentId: true },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canManageOnboarding(session, employee))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tasks = await prisma.onboardingTask.findMany({
    where: { employeeId: params.id },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(tasks);
}
