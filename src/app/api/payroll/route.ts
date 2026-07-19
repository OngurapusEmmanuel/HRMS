import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, managedDepartmentIds } from "@/lib/rbac";
import { payslipFromSalary, getTaxBrackets } from "@/lib/payroll";
import { logAudit } from "@/lib/audit";

// GET /api/payroll?month=&year=
// ADMIN/HR see every payslip in the org. MANAGER sees payslips for employees
// in department(s) they head (view only — they can't generate). EMPLOYEE
// sees only their own.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const role = (session.user as any).role;
  const employeeId = (session.user as any).employeeId;
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  let scopeFilter = {};
  if (role === "EMPLOYEE") {
    scopeFilter = { employeeId };
  } else if (role === "MANAGER") {
    const deptIds = employeeId ? await managedDepartmentIds(employeeId) : [];
    scopeFilter = { employee: { departmentId: { in: deptIds } } };
  }

  const payslips = await prisma.payslip.findMany({
    where: {
      employee: { organizationId: (session.user as any).organizationId },
      ...(month ? { periodMonth: Number(month) } : {}),
      ...(year ? { periodYear: Number(year) } : {}),
      ...scopeFilter,
    },
    include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });

  return NextResponse.json(payslips);
}

const generateSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

// POST /api/payroll — generate payslips for every ACTIVE employee for a
// period, using the progressive tax engine in lib/payroll.ts. Idempotent:
// re-running for a period that's already generated skips existing rows.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const role = (session.user as any).role;
  if (!can(role, "payroll:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = generateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { month, year } = parsed.data;
  const organizationId = (session.user as any).organizationId;

  const employees = await prisma.employee.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: { id: true, baseSalary: true },
  });

  const brackets = await getTaxBrackets(organizationId);

  const existing = await prisma.payslip.findMany({
    where: { periodMonth: month, periodYear: year, employee: { organizationId } },
    select: { employeeId: true },
  });
  const alreadyGenerated = new Set(existing.map((p) => p.employeeId));

  const toCreate = employees
    .filter((e) => !alreadyGenerated.has(e.id))
    .map((e) => {
      const { gross, deductions, net } = payslipFromSalary(Number(e.baseSalary), brackets);
      return {
        employeeId: e.id,
        periodMonth: month,
        periodYear: year,
        grossPay: gross,
        deductions,
        netPay: net,
      };
    });

  if (toCreate.length > 0) {
    await prisma.payslip.createMany({ data: toCreate });
  }

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "payroll.generate",
    targetType: "Payslip",
    metadata: { month, year, generated: toCreate.length, skipped: employees.length - toCreate.length },
  });

  return NextResponse.json({
    generated: toCreate.length,
    skipped: employees.length - toCreate.length,
  });
}
