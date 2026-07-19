import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, canActOnDepartment } from "@/lib/rbac";
import { notify } from "@/lib/notifications";

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

  const meetings = await prisma.appraisalMeeting.findMany({
    where: { employeeId: params.id },
    include: { organizer: { select: { firstName: true, lastName: true } } },
    orderBy: { scheduledAt: "desc" },
  });
  return NextResponse.json(meetings);
}

const schema = z.object({ scheduledAt: z.string().min(1), notes: z.string().optional() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const role = (session.user as any).role;
  const organizerId = (session.user as any).employeeId;
  if (!can(role, "meeting:schedule")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const organizationId = (session.user as any).organizationId;
  const employee = await prisma.employee.findFirst({
    where: { id: params.id, organizationId },
    select: { id: true, departmentId: true, user: { select: { id: true } } },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canActOnDepartment(role, organizerId, employee.departmentId))) {
    return NextResponse.json({ error: "You can only schedule meetings for your own department" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const meeting = await prisma.appraisalMeeting.create({
    data: {
      employeeId: params.id,
      organizerId: organizerId ?? "",
      organizationId,
      scheduledAt: new Date(parsed.data.scheduledAt),
      notes: parsed.data.notes,
    },
  });

  notify({
    userId: employee.user.id,
    organizationId,
    type: "APPRAISAL_MEETING_SCHEDULED",
    title: "A performance review meeting has been scheduled",
    body: new Date(parsed.data.scheduledAt).toLocaleString(),
    link: `/employees/${params.id}`,
  });

  return NextResponse.json(meeting, { status: 201 });
}
