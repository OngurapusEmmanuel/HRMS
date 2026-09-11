import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { generateContractSummary } from "@/lib/appraisal";
import { assignOffboardingChecklist } from "@/lib/offboarding";
import { notifyRoles } from "@/lib/notifications";

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  jobTitle: z.string().min(1).optional(),
  departmentId: z.string().nullable().optional(),
  reportsToId: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"]).optional(),
  baseSalary: z.number().nonnegative().optional(),
  phone: z.string().optional(),
  contractEndDate: z.string().nullable().optional(),
});

async function getScopedEmployee(id: string, organizationId: string) {
  const employee = await prisma.employee.findFirst({ where: { id, organizationId } });
  return employee;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const employee = await prisma.employee.findFirst({
    where: { id: params.id, organizationId: (session.user as any).organizationId },
    include: {
      department: true,
      directReports: { select: { id: true, firstName: true, lastName: true } },
      leaveBalances: true,
    },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(employee);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "employee:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = (session.user as any).organizationId;
  const existing = await getScopedEmployee(params.id, organizationId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { contractEndDate, ...rest } = parsed.data;
  const updated = await prisma.employee.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(contractEndDate !== undefined ? { contractEndDate: contractEndDate ? new Date(contractEndDate) : null } : {}),
    },
  });

  // Diff only the fields that were actually part of this request, so the
  // log stays readable instead of dumping the whole record every time.
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(parsed.data) as (keyof typeof parsed.data)[]) {
    const before = (existing as any)[key];
    const after = (updated as any)[key];
    if (String(before) !== String(after)) changes[key] = { from: before, to: after };
  }
  if (Object.keys(changes).length > 0) {
    logAudit({
      organizationId,
      actorUserId: (session.user as any).id,
      actorEmail: session.user.email ?? "",
      action: "employee.update",
      targetType: "Employee",
      targetId: params.id,
      metadata: { changes },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "employee:delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = (session.user as any).organizationId;
  const existing = await getScopedEmployee(params.id, organizationId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft delete in spirit: mark TERMINATED rather than hard-deleting payroll
  // history. Hard delete is available via the cascade if truly needed.
  await prisma.employee.update({
    where: { id: params.id },
    data: { status: "TERMINATED", terminationDate: new Date() },
  });

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "employee.terminate",
    targetType: "Employee",
    targetId: params.id,
  });

  // Contract summary and offboarding checklist are independent side effects
  // of termination — each gets its own try/catch so one failing doesn't
  // silently skip the other, and each surfaces to HR on failure rather than
  // only a server-side console.error (which HR would never see).
  try {
    const summary = await generateContractSummary(params.id, organizationId, (session.user as any).id);
    logAudit({
      organizationId,
      actorUserId: (session.user as any).id,
      actorEmail: session.user.email ?? "",
      action: "appraisal.contract_summary_generate",
      targetType: "ContractSummary",
      targetId: summary.id,
      metadata: { employeeId: params.id, trigger: "termination", totalAppraisals: summary.totalAppraisals },
    });
    notifyRoles({
      organizationId,
      roles: ["ADMIN", "HR"],
      type: "CONTRACT_SUMMARY_GENERATED",
      title: `${existing.firstName} ${existing.lastName}'s contract summary is ready`,
      body: summary.recommendation ? `Recommendation: ${summary.recommendation.replace(/_/g, " ")}` : undefined,
      link: `/employees/${params.id}`,
    });
  } catch (err) {
    console.error("Failed to auto-generate contract summary on termination:", err);
    notifyRoles({
      organizationId,
      roles: ["ADMIN", "HR"],
      type: "GENERAL",
      title: `Contract summary failed for ${existing.firstName} ${existing.lastName}`,
      body: "Generate it manually from their profile.",
      link: `/employees/${params.id}`,
    });
  }

  try {
    await assignOffboardingChecklist(params.id, organizationId);
    logAudit({
      organizationId,
      actorUserId: (session.user as any).id,
      actorEmail: session.user.email ?? "",
      action: "offboarding.checklist_assign",
      targetType: "OffboardingTask",
      targetId: params.id,
      metadata: { employeeId: params.id, trigger: "termination" },
    });
  } catch (err) {
    console.error("Failed to assign offboarding checklist on termination:", err);
    notifyRoles({
      organizationId,
      roles: ["ADMIN", "HR"],
      type: "GENERAL",
      title: `Offboarding checklist wasn't created for ${existing.firstName} ${existing.lastName}`,
      body: "Check Settings → Offboarding and their profile.",
      link: `/employees/${params.id}`,
    });
  }

  return NextResponse.json({ success: true });
}
