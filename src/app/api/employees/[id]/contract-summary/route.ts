import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, canActOnDepartment } from "@/lib/rbac";
import { generateContractSummary } from "@/lib/appraisal";
import { logAudit } from "@/lib/audit";

async function canViewSummary(session: any, targetEmployee: { id: string; departmentId: string | null }) {
  const role = session.user.role;
  if (can(role, "appraisal:view_all")) return true;
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
  if (!(await canViewSummary(session, employee))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const summary = await prisma.contractSummary.findUnique({ where: { employeeId: params.id } });
  return NextResponse.json(summary); // null is a valid response — "not generated yet"
}

// POST /api/employees/:id/contract-summary — manually (re)generate. HR/Admin
// only. This is also called automatically from the employee termination
// route; this endpoint exists for the other trigger — a fixed-term contract
// ending via contractEndDate without a termination event, or re-running
// after a late appraisal was added.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "appraisal:manage_summary")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = (session.user as any).organizationId;
  const employee = await prisma.employee.findFirst({ where: { id: params.id, organizationId }, select: { id: true } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const summary = await generateContractSummary(params.id, organizationId, (session.user as any).id);

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "appraisal.contract_summary_generate",
    targetType: "ContractSummary",
    targetId: summary.id,
    metadata: { employeeId: params.id, totalAppraisals: summary.totalAppraisals, recommendation: summary.recommendation },
  });

  return NextResponse.json(summary);
}
