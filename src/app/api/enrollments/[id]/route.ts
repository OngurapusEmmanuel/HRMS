import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, canActOnDepartment } from "@/lib/rbac";

const schema = z.object({ status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]) });

// PATCH /api/enrollments/:id — the enrolled employee marks their own
// progress; HR/Admin/department manager can also update it (e.g. marking
// completion recorded from an external LMS).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const organizationId = (session.user as any).organizationId;
  const enrollment = await prisma.trainingEnrollment.findFirst({
    where: { id: params.id, employee: { organizationId } },
    include: { employee: { select: { id: true, departmentId: true } } },
  });
  if (!enrollment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = (session.user as any).role;
  const actorEmployeeId = (session.user as any).employeeId;
  const isOwner = actorEmployeeId === enrollment.employeeId;
  const managesDept = await canActOnDepartment(role, actorEmployeeId, enrollment.employee.departmentId);
  if (!isOwner && !(can(role, "training:manage") && managesDept)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.trainingEnrollment.update({
    where: { id: params.id },
    data: {
      status: parsed.data.status,
      completedAt: parsed.data.status === "COMPLETED" ? new Date() : null,
    },
  });
  return NextResponse.json(updated);
}
