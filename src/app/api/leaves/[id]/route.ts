import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, canActOnDepartment } from "@/lib/rbac";
import { sendEmail, leaveDecisionEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

const reviewSchema = z.object({ status: z.enum(["APPROVED", "REJECTED"]) });

// PATCH /api/leaves/:id — approve or reject.
// ADMIN/HR can act on any request in the org. MANAGER can only act on
// requests from employees in a department they head — checked via
// canActOnDepartment against the employee's departmentId, not just their role.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const role = (session.user as any).role;
  const reviewerEmployeeId = (session.user as any).employeeId ?? null;

  if (!can(role, "leave:approve")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = reviewSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const leave = await prisma.leaveRequest.findFirst({
    where: { id: params.id, employee: { organizationId: (session.user as any).organizationId } },
    include: { employee: { select: { id: true, departmentId: true, firstName: true, lastName: true, user: { select: { id: true, email: true } } } } },
  });
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (leave.status !== "PENDING") return NextResponse.json({ error: "Already reviewed" }, { status: 409 });

  const allowed = await canActOnDepartment(role, reviewerEmployeeId, leave.employee.departmentId);
  if (!allowed) {
    return NextResponse.json(
      { error: "You can only review leave requests for your own department" },
      { status: 403 }
    );
  }

  const year = leave.startDate.getFullYear();

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.leaveRequest.update({
      where: { id: params.id },
      data: { status: parsed.data.status, reviewedBy: reviewerEmployeeId, reviewedAt: new Date() },
    });

    if (parsed.data.status === "APPROVED") {
      await tx.leaveBalance.upsert({
        where: { employeeId_type_year: { employeeId: leave.employeeId, type: leave.type, year } },
        create: { employeeId: leave.employeeId, type: leave.type, year, entitled: 0, used: leave.daysCount },
        update: { used: { increment: leave.daysCount } },
      });
    }
    return result;
  });

  // Fire-and-forget notification — a failure here shouldn't roll back the
  // approval itself, so it's outside the transaction and not awaited-strict.
  const { subject, body } = leaveDecisionEmail(parsed.data.status, {
    employeeName: `${leave.employee.firstName} ${leave.employee.lastName}`,
    type: leave.type,
    startDate: leave.startDate,
    endDate: leave.endDate,
  });
  sendEmail({ to: leave.employee.user.email, subject, body }).catch((err) =>
    console.error("Failed to send leave decision email:", err)
  );

  logAudit({
    organizationId: (session.user as any).organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: parsed.data.status === "APPROVED" ? "leave.approve" : "leave.reject",
    targetType: "LeaveRequest",
    targetId: params.id,
    metadata: { employeeId: leave.employeeId, type: leave.type, daysCount: leave.daysCount },
  });

  notify({
    userId: leave.employee.user.id,
    organizationId: (session.user as any).organizationId,
    type: "LEAVE_REQUEST_DECIDED",
    title: subject,
    body: `${leave.startDate.toDateString()} – ${leave.endDate.toDateString()}`,
    link: "/leaves",
  });

  return NextResponse.json(updated);
}
