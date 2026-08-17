import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { managedDepartmentIds } from "@/lib/rbac";

// GET /api/leaves/calendar?month=YYYY-MM — approved leave requests overlapping
// the given month, for the team calendar view. Same role-based visibility as
// GET /api/leaves: EMPLOYEE sees only their own, MANAGER sees their
// department(s), ADMIN/HR see the whole org.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const role = (session.user as any).role;
  const employeeId = (session.user as any).employeeId;
  const organizationId = (session.user as any).organizationId;

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month"); // "YYYY-MM"

  let year: number;
  let monthIndex: number; // 0-based
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    year = y;
    monthIndex = m - 1;
  } else {
    const now = new Date();
    year = now.getFullYear();
    monthIndex = now.getMonth();
  }

  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  let scopeFilter = {};
  if (role === "EMPLOYEE") {
    scopeFilter = { employeeId };
  } else if (role === "MANAGER") {
    const deptIds = employeeId ? await managedDepartmentIds(employeeId) : [];
    scopeFilter = { employee: { departmentId: { in: deptIds } } };
  }

  const requests = await prisma.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      employee: { organizationId },
      ...scopeFilter,
      // Overlaps the displayed month: starts before month end AND ends after month start.
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    },
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(requests);
}
