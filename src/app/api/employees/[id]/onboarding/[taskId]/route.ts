import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canActOnDepartment } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const schema = z.object({ completed: z.boolean() });

async function canManageOnboarding(session: any, targetEmployee: { id: string; departmentId: string | null }) {
  const role = session.user.role;
  if (role === "ADMIN" || role === "HR") return true;
  if (session.user.employeeId === targetEmployee.id) return true;
  return canActOnDepartment(role, session.user.employeeId, targetEmployee.departmentId);
}

// PATCH /api/employees/:id/onboarding/:taskId — toggle a checklist item.
export async function PATCH(req: NextRequest, { params }: { params: { id: string; taskId: string } }) {
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

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const task = await prisma.onboardingTask.findFirst({ where: { id: params.taskId, employeeId: params.id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.onboardingTask.update({
    where: { id: params.taskId },
    data: { completed: parsed.data.completed, completedAt: parsed.data.completed ? new Date() : null },
  });

  logAudit({
    organizationId: (session.user as any).organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: parsed.data.completed ? "onboarding.task_complete" : "onboarding.task_reopen",
    targetType: "OnboardingTask",
    targetId: params.taskId,
    metadata: { employeeId: params.id, title: task.title },
  });

  return NextResponse.json(updated);
}
