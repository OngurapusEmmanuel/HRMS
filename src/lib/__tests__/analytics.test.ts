import { describe, it, expect } from "vitest";
import {
  lastNMonthEnds,
  computeHeadcountTrend,
  computeTurnoverTrend,
  computeDepartmentBreakdown,
  computeTotals,
  type EmployeeSnapshot,
} from "../analytics";

function emp(partial: Partial<EmployeeSnapshot>): EmployeeSnapshot {
  return {
    id: Math.random().toString(),
    hireDate: new Date("2023-01-01"),
    terminationDate: null,
    departmentId: "dept-1",
    departmentName: "Engineering",
    baseSalary: 120000,
    status: "ACTIVE",
    ...partial,
  };
}

describe("analytics: lastNMonthEnds", () => {
  it("returns N month-end dates ending with the current month, oldest first", () => {
    const now = new Date("2026-03-15");
    const ends = lastNMonthEnds(3, now);
    expect(ends).toHaveLength(3);
    // Last entry should be the end of March 2026 (the current month).
    expect(ends[2].getMonth()).toBe(2); // 0-indexed: March = 2
    expect(ends[2].getFullYear()).toBe(2026);
    // First entry should be two months earlier: end of January 2026.
    expect(ends[0].getMonth()).toBe(0);
  });
});

describe("analytics: computeHeadcountTrend", () => {
  it("counts an employee as present in a month if hired before and not yet terminated", () => {
    const monthEnd = new Date("2024-06-30T23:59:59");
    const employees = [
      emp({ hireDate: new Date("2024-01-01") }), // present
      emp({ hireDate: new Date("2024-07-01") }), // hired after — not counted
      emp({ hireDate: new Date("2023-01-01"), terminationDate: new Date("2024-05-01") }), // left before — not counted
      emp({ hireDate: new Date("2023-01-01"), terminationDate: new Date("2024-07-01") }), // left after — counted
    ];
    const trend = computeHeadcountTrend(employees, [monthEnd]);
    expect(trend[0].headcount).toBe(2);
  });
});

describe("analytics: computeTurnoverTrend", () => {
  it("counts a termination only in the month it occurred", () => {
    const employees = [
      emp({ hireDate: new Date("2024-01-01"), terminationDate: new Date("2024-06-15") }),
    ];
    const juneEnd = new Date("2024-06-30T23:59:59");
    const julyEnd = new Date("2024-07-31T23:59:59");
    const trend = computeTurnoverTrend(employees, [juneEnd, julyEnd]);
    expect(trend[0].terminations).toBe(1);
    expect(trend[1].terminations).toBe(0);
  });

  it("computes turnover rate as a percentage of average headcount", () => {
    // 10 people all month, 1 leaves — turnover should be 10%.
    const employees = [
      emp({ hireDate: new Date("2023-01-01"), terminationDate: new Date("2024-06-15") }),
      ...Array.from({ length: 9 }, () => emp({ hireDate: new Date("2023-01-01") })),
    ];
    const juneEnd = new Date("2024-06-30T23:59:59");
    const trend = computeTurnoverTrend(employees, [juneEnd]);
    expect(trend[0].turnoverRate).toBeCloseTo(10, 0);
  });
});

describe("analytics: computeDepartmentBreakdown", () => {
  it("groups active employees by department and sums monthly labor cost", () => {
    const employees = [
      emp({ departmentId: "eng", departmentName: "Engineering", baseSalary: 120000 }),
      emp({ departmentId: "eng", departmentName: "Engineering", baseSalary: 120000 }),
      emp({ departmentId: "mkt", departmentName: "Marketing", baseSalary: 60000 }),
    ];
    const breakdown = computeDepartmentBreakdown(employees);
    const eng = breakdown.find((d) => d.department === "Engineering")!;
    expect(eng.headcount).toBe(2);
    expect(eng.monthlyLaborCost).toBeCloseTo(20000, 0); // 2 * 120000/12
  });

  it("excludes terminated employees from the breakdown", () => {
    const employees = [emp({ status: "TERMINATED" })];
    expect(computeDepartmentBreakdown(employees)).toHaveLength(0);
  });

  it("buckets employees with no department under Unassigned", () => {
    const employees = [emp({ departmentId: null, departmentName: null })];
    const breakdown = computeDepartmentBreakdown(employees);
    expect(breakdown[0].department).toBe("Unassigned");
  });
});

describe("analytics: computeTotals", () => {
  it("excludes terminated employees from active count and labor cost", () => {
    const employees = [emp({ status: "ACTIVE", baseSalary: 120000 }), emp({ status: "TERMINATED", baseSalary: 999999 })];
    const totals = computeTotals(employees, [{ headcount: 1 }], 0);
    expect(totals.totalActive).toBe(1);
    expect(totals.totalMonthlyLaborCost).toBeCloseTo(10000, 0);
  });

  it("returns zero turnover rate when there's no headcount to divide by", () => {
    const totals = computeTotals([], [], 0);
    expect(totals.turnoverRateTrailing).toBe(0);
  });
});
