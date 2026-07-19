import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, canActOnDepartment } from "@/lib/rbac";

const schema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const organizationId = (session.user as any).organizationId;
  const meeting = await prisma.appraisalMeeting.findFirst({
    where: { id: params.id, organizationId },
    include: { employee: { select: { departmentId: true } } },
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = (session.user as any).role;
  const actorEmployeeId = (session.user as any).employeeId;
  if (!can(role, "meeting:schedule") || !(await canActOnDepartment(role, actorEmployeeId, meeting.employee.departmentId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.appraisalMeeting.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(updated);
}
