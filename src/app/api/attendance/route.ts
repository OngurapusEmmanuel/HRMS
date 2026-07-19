import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { managedDepartmentIds } from "@/lib/rbac";

// GET /api/attendance?date=YYYY-MM-DD
// ADMIN/HR see the whole org; MANAGER sees only department(s) they head;
// EMPLOYEE sees only their own history. Same scoping model as /api/leaves.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const role = (session.user as any).role;
  const selfEmployeeId = (session.user as any).employeeId;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  let scopeFilter = {};
  if (role === "EMPLOYEE") {
    scopeFilter = { employeeId: selfEmployeeId };
  } else if (role === "MANAGER") {
    const deptIds = selfEmployeeId ? await managedDepartmentIds(selfEmployeeId) : [];
    scopeFilter = { employee: { departmentId: { in: deptIds } } };
  }

  const records = await prisma.attendanceRecord.findMany({
    where: {
      employee: { organizationId: (session.user as any).organizationId },
      ...(date ? { date: new Date(date) } : {}),
      ...scopeFilter,
    },
    include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(records);
}
