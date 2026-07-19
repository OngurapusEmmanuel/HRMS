import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { toCsv } from "@/lib/csv";

// GET /api/employees/export — HR/Admin only, full employee roster as CSV.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const role = (session.user as any).role;
  if (!can(role, "employee:view_all") || !can(role, "employee:update")) {
    // Export is a superset of view — restrict to roles that can also manage
    // records, so a plain Manager can't bulk-export salaries.
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employees = await prisma.employee.findMany({
    where: { organizationId: (session.user as any).organizationId },
    include: { department: true, user: { select: { email: true } } },
    orderBy: { employeeCode: "asc" },
  });

  const rows = employees.map((e) => ({
    employeeCode: e.employeeCode,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.user.email,
    jobTitle: e.jobTitle,
    department: e.department?.name ?? "",
    status: e.status,
    hireDate: e.hireDate.toISOString().slice(0, 10),
    baseSalary: e.baseSalary.toString(),
  }));
  const csv = toCsv(rows, [
    "employeeCode", "firstName", "lastName", "email", "jobTitle", "department", "status", "hireDate", "baseSalary",
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="employees.csv"`,
    },
  });
}
