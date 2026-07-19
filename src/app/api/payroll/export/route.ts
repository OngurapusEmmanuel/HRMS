import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { toCsv } from "@/lib/csv";
import { logAudit } from "@/lib/audit";

// GET /api/payroll/export?month=&year=  — HR/Admin only. Streams a CSV
// download rather than JSON since this is meant to be opened in Excel/Sheets.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const role = (session.user as any).role;
  if (!can(role, "payroll:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const organizationId = (session.user as any).organizationId;

  const payslips = await prisma.payslip.findMany({
    where: {
      employee: { organizationId },
      ...(month ? { periodMonth: Number(month) } : {}),
      ...(year ? { periodYear: Number(year) } : {}),
    },
    include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });

  const rows = payslips.map((p) => ({
    employeeCode: p.employee.employeeCode,
    name: `${p.employee.firstName} ${p.employee.lastName}`,
    period: `${p.periodMonth}/${p.periodYear}`,
    grossPay: p.grossPay.toString(),
    deductions: p.deductions.toString(),
    netPay: p.netPay.toString(),
  }));
  const csv = toCsv(rows, ["employeeCode", "name", "period", "grossPay", "deductions", "netPay"]);

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "payroll.export",
    targetType: "Payslip",
    metadata: { month, year, rowCount: rows.length },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="payroll-${year ?? "all"}-${month ?? "all"}.csv"`,
    },
  });
}
