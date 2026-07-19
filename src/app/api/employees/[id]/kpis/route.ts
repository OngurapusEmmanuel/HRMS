import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, canActOnDepartment } from "@/lib/rbac";

async function canView(session: any, employee: { id: string; departmentId: string | null }) {
  const role = session.user.role;
  if (can(role, "appraisal:view_all")) return true;
  if (session.user.employeeId === employee.id) return true;
  return canActOnDepartment(role, session.user.employeeId, employee.departmentId);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const employee = await prisma.employee.findFirst({
    where: { id: params.id, organizationId: (session.user as any).organizationId },
    select: { id: true, departmentId: true },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canView(session, employee))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const kpis = await prisma.kpi.findMany({ where: { employeeId: params.id }, orderBy: { periodEnd: "desc" } });
  return NextResponse.json(kpis);
}

const schema = z.object({
  title: z.string().min(1),
  target: z.number(),
  current: z.number().default(0),
  unit: z.string().optional(),
  periodStart: z.string(),
  periodEnd: z.string(),
});

// POST /api/employees/:id/kpis — set a new KPI. Same department-scoping as
// appraisals: ADMIN/HR any employee, MANAGER only their own department.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const role = (session.user as any).role;
  const actorEmployeeId = (session.user as any).employeeId;
  if (!can(role, "kpi:manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const organizationId = (session.user as any).organizationId;
  const employee = await prisma.employee.findFirst({ where: { id: params.id, organizationId }, select: { id: true, departmentId: true } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canActOnDepartment(role, actorEmployeeId, employee.departmentId))) {
    return NextResponse.json({ error: "You can only set KPIs for your own department" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const kpi = await prisma.kpi.create({
    data: {
      employeeId: params.id,
      organizationId,
      title: parsed.data.title,
      target: parsed.data.target,
      current: parsed.data.current,
      unit: parsed.data.unit,
      periodStart: new Date(parsed.data.periodStart),
      periodEnd: new Date(parsed.data.periodEnd),
      createdById: actorEmployeeId ?? "",
    },
  });
  return NextResponse.json(kpi, { status: 201 });
}
