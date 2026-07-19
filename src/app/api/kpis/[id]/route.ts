import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, canActOnDepartment } from "@/lib/rbac";
import { notify } from "@/lib/notifications";

const schema = z.object({
  current: z.number().optional(),
  status: z.enum(["ON_TRACK", "AT_RISK", "OFF_TRACK", "COMPLETED"]).optional(),
});

// PATCH /api/kpis/:id — update progress. The employee the KPI belongs to
// can update their own `current` value (self-reported progress); status
// changes are reserved for whoever can manage KPIs for that department.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const organizationId = (session.user as any).organizationId;
  const kpi = await prisma.kpi.findFirst({
    where: { id: params.id, organizationId },
    include: { employee: { select: { id: true, departmentId: true, user: { select: { id: true } } } } },
  });
  if (!kpi) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = (session.user as any).role;
  const actorEmployeeId = (session.user as any).employeeId;
  const isOwner = actorEmployeeId === kpi.employeeId;
  const managesDept = await canActOnDepartment(role, actorEmployeeId, kpi.employee.departmentId);
  if (!isOwner && !(can(role, "kpi:manage") && managesDept)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  // Owners without kpi:manage can only update `current`, never `status`.
  const data = isOwner && !can(role, "kpi:manage") ? { current: parsed.data.current } : parsed.data;

  const updated = await prisma.kpi.update({ where: { id: params.id }, data });

  if (updated.status === "AT_RISK" || updated.status === "OFF_TRACK") {
    notify({
      userId: kpi.employee.user.id,
      organizationId,
      type: "KPI_AT_RISK",
      title: `Your KPI "${kpi.title}" is flagged ${updated.status.replace("_", " ").toLowerCase()}`,
      link: `/employees/${kpi.employeeId}`,
    });
  }

  return NextResponse.json(updated);
}
