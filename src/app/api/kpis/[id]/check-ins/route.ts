import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canActOnKpi } from "@/lib/rbac";

// Shared by GET and POST below: loads the Kpi (scoped to the actor's org)
// and applies the same "owner, or manages the department" rule as
// PATCH /api/kpis/[id].
async function loadAuthorizedKpi(kpiId: string, organizationId: string, role: string, actorEmployeeId: string | null) {
  const kpi = await prisma.kpi.findFirst({
    where: { id: kpiId, organizationId },
    include: { employee: { select: { id: true, departmentId: true } } },
  });
  if (!kpi) return { kpi: null, allowed: false };
  const allowed = await canActOnKpi(role, actorEmployeeId, kpi.employeeId, kpi.employee.departmentId);
  return { kpi, allowed };
}

// GET /api/kpis/:id/check-ins — progress-update history for a goal, most recent first.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const organizationId = (session.user as any).organizationId;
  const role = (session.user as any).role;
  const actorEmployeeId = (session.user as any).employeeId;

  const { kpi, allowed } = await loadAuthorizedKpi(params.id, organizationId, role, actorEmployeeId);
  if (!kpi) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const checkIns = await prisma.kpiCheckIn.findMany({
    where: { kpiId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(checkIns);
}

const schema = z.object({
  note: z.string().min(1),
  evidenceUrl: z.string().optional(),
  current: z.number().optional(),
});

// POST /api/kpis/:id/check-ins — log a progress update. The goal's owner can
// check in on their own goal; whoever can manage KPIs for that department
// (manager/HR/admin) can check in on a report's goal too — same rule as
// reading/patching the KPI itself. If `current` is provided the Kpi's own
// `current` value is updated alongside the check-in (two writes; this
// doesn't need transactional atomicity — nothing else depends on the two
// staying in lockstep the way e.g. leave-balance approval does).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const organizationId = (session.user as any).organizationId;
  const role = (session.user as any).role;
  const actorEmployeeId = (session.user as any).employeeId;

  const { kpi, allowed } = await loadAuthorizedKpi(params.id, organizationId, role, actorEmployeeId);
  if (!kpi) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const checkIn = await prisma.kpiCheckIn.create({
    data: {
      kpiId: params.id,
      note: parsed.data.note,
      evidenceUrl: parsed.data.evidenceUrl || undefined,
      createdById: actorEmployeeId ?? "",
    },
  });

  let current: string | undefined;
  if (parsed.data.current !== undefined) {
    const updated = await prisma.kpi.update({
      where: { id: params.id },
      data: { current: parsed.data.current },
      select: { current: true },
    });
    current = updated.current.toString();
  }

  return NextResponse.json({ ...checkIn, kpiCurrent: current }, { status: 201 });
}
