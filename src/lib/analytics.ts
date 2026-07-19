import { prisma } from "./db";

// All the workforce-trend math lives here as pure computation over a single
// fetch of every employee in the org — deliberately not N separate queries
// per month, since the dataset (thousands of employees at most for an MVP
// tenant) fits comfortably in memory and this keeps the logic testable
// without hitting Prisma.

export type EmployeeSnapshot = {
  id: string;
  hireDate: Date;
  terminationDate: Date | null;
  departmentId: string | null;
  departmentName: string | null;
  baseSalary: number;
  status: string;
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

// The last N month-end instants, oldest first, ending with the current
// (partial) month — used as the sampling points for headcount/turnover.
export function lastNMonthEnds(n: number, now = new Date()): Date[] {
  const result: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    result.push(new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999));
  }
  return result;
}

export function computeHeadcountTrend(employees: EmployeeSnapshot[], monthEnds: Date[]) {
  return monthEnds.map((end) => ({
    month: monthKey(end),
    label: monthLabel(end),
    headcount: employees.filter((e) => e.hireDate <= end && (!e.terminationDate || e.terminationDate > end)).length,
  }));
}

export function computeTurnoverTrend(employees: EmployeeSnapshot[], monthEnds: Date[]) {
  return monthEnds.map((end) => {
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    const terminations = employees.filter(
      (e) => e.terminationDate && e.terminationDate >= start && e.terminationDate <= end
    ).length;
    const headcountAtStart = employees.filter(
      (e) => e.hireDate < start && (!e.terminationDate || e.terminationDate >= start)
    ).length;
    const headcountAtEnd = employees.filter(
      (e) => e.hireDate <= end && (!e.terminationDate || e.terminationDate > end)
    ).length;
    const avgHeadcount = (headcountAtStart + headcountAtEnd) / 2 || 1;
    return {
      month: monthKey(end),
      label: monthLabel(end),
      terminations,
      turnoverRate: Math.round((terminations / avgHeadcount) * 1000) / 10, // percent, 1 decimal
    };
  });
}

export function computeDepartmentBreakdown(employees: EmployeeSnapshot[]) {
  const map = new Map<string, { department: string; headcount: number; monthlyLaborCost: number }>();
  for (const e of employees) {
    if (e.status === "TERMINATED") continue;
    const key = e.departmentId ?? "__unassigned__";
    const name = e.departmentName ?? "Unassigned";
    if (!map.has(key)) map.set(key, { department: name, headcount: 0, monthlyLaborCost: 0 });
    const entry = map.get(key)!;
    entry.headcount += 1;
    entry.monthlyLaborCost += e.baseSalary / 12;
  }
  return Array.from(map.values()).sort((a, b) => b.headcount - a.headcount);
}

export function computeTotals(employees: EmployeeSnapshot[], headcountTrend: { headcount: number }[], monthlyTerminations: number) {
  const active = employees.filter((e) => e.status !== "TERMINATED");
  const totalActive = active.length;
  const totalMonthlyLaborCost = active.reduce((sum, e) => sum + e.baseSalary / 12, 0);
  const avgHeadcount = headcountTrend.reduce((s, h) => s + h.headcount, 0) / (headcountTrend.length || 1);
  const turnoverRateTrailing = avgHeadcount ? Math.round((monthlyTerminations / avgHeadcount) * 1000) / 10 : 0;

  return {
    totalActive,
    totalMonthlyLaborCost: Math.round(totalMonthlyLaborCost * 100) / 100,
    totalAnnualLaborCost: Math.round(totalMonthlyLaborCost * 12 * 100) / 100,
    turnoverRateTrailing,
  };
}

export async function getAnalyticsSummary(organizationId: string, months = 12) {
  const raw = await prisma.employee.findMany({
    where: { organizationId },
    select: {
      id: true,
      hireDate: true,
      terminationDate: true,
      departmentId: true,
      baseSalary: true,
      status: true,
      department: { select: { name: true } },
    },
  });

  const employees: EmployeeSnapshot[] = raw.map((e) => ({
    id: e.id,
    hireDate: e.hireDate,
    terminationDate: e.terminationDate,
    departmentId: e.departmentId,
    departmentName: e.department?.name ?? null,
    baseSalary: Number(e.baseSalary),
    status: e.status,
  }));

  const monthEnds = lastNMonthEnds(months);
  const headcountTrend = computeHeadcountTrend(employees, monthEnds);
  const turnoverTrend = computeTurnoverTrend(employees, monthEnds);
  const departmentBreakdown = computeDepartmentBreakdown(employees);

  const trailingWindowStart = monthEnds[0];
  const monthlyTerminations = employees.filter(
    (e) => e.terminationDate && e.terminationDate >= trailingWindowStart
  ).length;
  const totals = computeTotals(employees, headcountTrend, monthlyTerminations);

  return { headcountTrend, turnoverTrend, departmentBreakdown, totals };
}
