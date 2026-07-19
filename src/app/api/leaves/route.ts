import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { differenceInCalendarDays } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { managedDepartmentIds } from "@/lib/rbac";
import { notify, notifyRoles } from "@/lib/notifications";

const requestSchema = z.object({
  type: z.enum(["ANNUAL", "SICK", "UNPAID", "MATERNITY", "PATERNITY", "OTHER"]),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
});

// GET /api/leaves?status=  — HR/Admin see every request in the org; a MANAGER
// sees only requests from employees in department(s) they head; an EMPLOYEE
// sees only their own.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const role = (session.user as any).role;
  const employeeId = (session.user as any).employeeId;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  let scopeFilter = {};
  if (role === "EMPLOYEE") {
    scopeFilter = { employeeId };
  } else if (role === "MANAGER") {
    const deptIds = employeeId ? await managedDepartmentIds(employeeId) : [];
    // A manager with no department assigned to them yet sees nothing rather
    // than silently falling through to "see everything".
    scopeFilter = { employee: { departmentId: { in: deptIds } } };
  }
  // ADMIN / HR: no extra filter — org-wide, already scoped by organizationId below.

  const requests = await prisma.leaveRequest.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      employee: { organizationId: (session.user as any).organizationId },
      ...scopeFilter,
    },
    include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

// POST /api/leaves — an employee requests leave for themselves.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const employeeId = (session.user as any).employeeId;
  if (!employeeId) return NextResponse.json({ error: "No employee profile linked to this account" }, { status: 400 });

  const parsed = requestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { type, startDate, endDate, reason } = parsed.data;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysCount = differenceInCalendarDays(end, start) + 1;
  if (daysCount <= 0) return NextResponse.json({ error: "endDate must be on/after startDate" }, { status: 400 });

  // Check remaining balance before allowing the request through.
  const year = start.getFullYear();
  const balance = await prisma.leaveBalance.findUnique({
    where: { employeeId_type_year: { employeeId, type, year } },
  });
  if (balance && balance.entitled - balance.used < daysCount) {
    return NextResponse.json({ error: "Insufficient leave balance" }, { status: 400 });
  }

  const leave = await prisma.leaveRequest.create({
    data: { employeeId, type, startDate: start, endDate: end, daysCount, reason },
  });

  // Notify everyone who could plausibly need to review this: org-wide HR/Admin,
  // plus the specific manager of the requester's department (who might not
  // hold the HR/Admin role and so wouldn't otherwise be reached).
  const organizationId = (session.user as any).organizationId;
  const requester = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      firstName: true,
      lastName: true,
      department: { select: { manager: { select: { userId: true } } } },
    },
  });
  const requesterName = requester ? `${requester.firstName} ${requester.lastName}` : "An employee";

  notifyRoles({
    organizationId,
    roles: ["ADMIN", "HR"],
    type: "LEAVE_REQUEST_SUBMITTED",
    title: `${requesterName} requested ${type.toLowerCase()} leave`,
    body: `${daysCount} day(s), ${start.toDateString()} – ${end.toDateString()}`,
    link: "/leaves",
  });
  const managerUserId = requester?.department?.manager?.userId;
  if (managerUserId) {
    notify({
      userId: managerUserId,
      organizationId,
      type: "LEAVE_REQUEST_SUBMITTED",
      title: `${requesterName} requested ${type.toLowerCase()} leave`,
      body: `${daysCount} day(s), ${start.toDateString()} – ${end.toDateString()}`,
      link: "/leaves",
    });
  }

  return NextResponse.json(leave, { status: 201 });
}
