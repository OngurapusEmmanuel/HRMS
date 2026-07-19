import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, canActOnDepartment } from "@/lib/rbac";
import { notify } from "@/lib/notifications";

const schema = z.object({
  employeeId: z.string().optional(), // omit to self-enroll
  dueDate: z.string().optional(),
});

// POST /api/training-courses/:id/enrollments — self-enroll (any employee,
// no employeeId in the body) or assign to someone else (requires
// training:manage AND department scope for a MANAGER, same as everywhere
// else — assigning mandatory compliance training to your own team is fine,
// assigning it org-wide is HR/Admin territory).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const organizationId = (session.user as any).organizationId;
  const course = await prisma.trainingCourse.findFirst({ where: { id: params.id, organizationId } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const selfEmployeeId = (session.user as any).employeeId;
  const targetEmployeeId = parsed.data.employeeId ?? selfEmployeeId;
  if (!targetEmployeeId) {
    return NextResponse.json({ error: "No employee profile to enroll" }, { status: 400 });
  }

  const isSelfEnroll = targetEmployeeId === selfEmployeeId;
  if (!isSelfEnroll) {
    const role = (session.user as any).role;
    const target = await prisma.employee.findFirst({ where: { id: targetEmployeeId, organizationId }, select: { departmentId: true, user: { select: { id: true } } } });
    if (!target) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    if (!can(role, "training:manage") || !(await canActOnDepartment(role, selfEmployeeId, target.departmentId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const enrollment = await prisma.trainingEnrollment.create({
      data: {
        employeeId: targetEmployeeId,
        courseId: params.id,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        assignedById: isSelfEnroll ? null : selfEmployeeId,
      },
    });

    if (!isSelfEnroll) {
      const target = await prisma.employee.findUnique({ where: { id: targetEmployeeId }, select: { user: { select: { id: true } } } });
      if (target) {
        notify({
          userId: target.user.id,
          organizationId,
          type: "TRAINING_ASSIGNED",
          title: `You've been assigned: ${course.title}`,
          link: "/learning",
        });
      }
    }

    return NextResponse.json(enrollment, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") return NextResponse.json({ error: "Already enrolled in this course" }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: "Failed to enroll" }, { status: 500 });
  }
}
