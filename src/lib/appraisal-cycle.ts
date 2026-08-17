import { prisma } from "./db";

// Shared "who has submitted what, for this cycle" classification — used by
// both GET /api/appraisal-cycles/:id/dashboard and the cycle detail page, so
// the population/participation logic lives in exactly one place.
//
// Efficiency note: this does one findMany on Employee and one findMany on
// Appraisal (scoped to the cycle, select-only), then classifies in memory —
// deliberately not one query per employee.
export async function getCycleDashboard(cycleId: string, organizationId: string) {
  const cycle = await prisma.appraisalCycle.findFirst({
    where: { id: cycleId, organizationId },
    include: { department: { select: { id: true, name: true } } },
  });
  if (!cycle) return null;

  const employees = await prisma.employee.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      ...(cycle.departmentId ? { departmentId: cycle.departmentId } : {}),
    },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  const appraisals = await prisma.appraisal.findMany({
    where: { cycleId },
    select: { employeeId: true, reviewType: true },
  });

  const managerSubmittedIds = new Set(
    appraisals.filter((a) => a.reviewType === "MANAGER").map((a) => a.employeeId)
  );
  const selfSubmittedIds = new Set(
    appraisals.filter((a) => a.reviewType === "SELF").map((a) => a.employeeId)
  );

  const employeeRows = employees.map((e) => {
    const managerReview: "SUBMITTED" | "NOT_STARTED" = managerSubmittedIds.has(e.id)
      ? "SUBMITTED"
      : "NOT_STARTED";
    const selfReview: "SUBMITTED" | "NOT_STARTED" | undefined = cycle.requireSelfReview
      ? selfSubmittedIds.has(e.id)
        ? "SUBMITTED"
        : "NOT_STARTED"
      : undefined;
    return { id: e.id, firstName: e.firstName, lastName: e.lastName, managerReview, selfReview };
  });

  const totals = {
    managerSubmitted: employeeRows.filter((e) => e.managerReview === "SUBMITTED").length,
    managerTotal: employeeRows.length,
    selfSubmitted: cycle.requireSelfReview
      ? employeeRows.filter((e) => e.selfReview === "SUBMITTED").length
      : 0,
    selfTotal: cycle.requireSelfReview ? employeeRows.length : 0,
  };

  return { cycle, employees: employeeRows, totals };
}
