import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, canActOnDepartment } from "@/lib/rbac";
import { sendEmail, leaveDecisionEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

const reviewSchema = z.object({ status: z.enum(["APPROVED", "REJECTED", "CANCELLED"]) });

// PATCH /api/leaves/:id — approve, reject, or cancel.
// ADMIN/HR can act on any request in the org. MANAGER can only act on
// requests from employees in a department they head — checked via
// canActOnDepartment against the employee's departmentId, not just their role.
// Separately, the request's own owner can cancel their own PENDING/APPROVED
// request regardless of role — that's a distinct authorization path from the
// approver flow above and is checked first.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const role = (session.user as any).role;
  const reviewerEmployeeId = (session.user as any).employeeId ?? null;

  const parsed = reviewSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const leave = await prisma.leaveRequest.findFirst({
    where: { id: params.id, employee: { organizationId: (session.user as any).organizationId } },
    include: { employee: { select: { id: true, departmentId: true, firstName: true, lastName: true, user: { select: { id: true, email: true } } } } },
  });
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isSelfCancellation =
    parsed.data.status === "CANCELLED" && reviewerEmployeeId === leave.employeeId;

  if (isSelfCancellation) {
    if (leave.status !== "PENDING" && leave.status !== "APPROVED") {
      return NextResponse.json({ error: "This request can no longer be cancelled" }, { status: 409 });
    }
  } else if (parsed.data.status === "CANCELLED") {
    // CANCELLED is exclusively the requester's own self-service path — an
    // approver rejects a request rather than cancelling someone else's.
    return NextResponse.json({ error: "Only the requester can cancel their own request" }, { status: 403 });
  } else {
    if (!can(role, "leave:approve")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (leave.status !== "PENDING") return NextResponse.json({ error: "Already reviewed" }, { status: 409 });

    const allowed = await canActOnDepartment(role, reviewerEmployeeId, leave.employee.departmentId);
    if (!allowed) {
      return NextResponse.json(
        { error: "You can only review leave requests for your own department" },
        { status: 403 }
      );
    }
  }

  const year = leave.startDate.getFullYear();
  const wasApproved = leave.status === "APPROVED";

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
    } else if (parsed.data.status === "CANCELLED" && wasApproved) {
      // Reverse the balance deduction that was applied when this was approved.
      await tx.leaveBalance.update({
        where: { employeeId_type_year: { employeeId: leave.employeeId, type: leave.type, year } },
        data: { used: { decrement: leave.daysCount } },
      });
    }
    return result;
  });

  if (isSelfCancellation) {
    // Self-initiated cancellation — no need to notify the requester about
    // their own action. Just keep an audit trail.
    logAudit({
      organizationId: (session.user as any).organizationId,
      actorUserId: (session.user as any).id,
      actorEmail: session.user.email ?? "",
      action: "leave.cancel",
      targetType: "LeaveRequest",
      targetId: params.id,
      metadata: { employeeId: leave.employeeId, type: leave.type, daysCount: leave.daysCount, wasApproved },
    });

    return NextResponse.json(updated);
  }

  // At this point CANCELLED has already returned above (either via the
  // self-cancellation branch or the 403 guard), so status is APPROVED or
  // REJECTED here — narrow it for leaveDecisionEmail's stricter param type.
  const decidedStatus = parsed.data.status as "APPROVED" | "REJECTED";

  // Fire-and-forget notification — a failure here shouldn't roll back the
  // approval itself, so it's outside the transaction and not awaited-strict.
  const { subject, body } = leaveDecisionEmail(decidedStatus, {
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
    action: decidedStatus === "APPROVED" ? "leave.approve" : "leave.reject",
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
