import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getAnalyticsSummary } from "@/lib/analytics";
import { toCsv } from "@/lib/csv";
import { logAudit } from "@/lib/audit";

// GET /api/reports/export — a single MIS-style CSV bundling headcount
// trend, turnover trend, and department breakdown as three labeled
// sections in one file, since these are the standard workforce report the
// prompt asked for and HR usually wants them together, not as three downloads.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "reports:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = (session.user as any).organizationId;
  const summary = await getAnalyticsSummary(organizationId, 12);

  const sections = [
    "# Headcount Trend",
    toCsv(summary.headcountTrend, ["month", "headcount"]),
    "",
    "# Turnover Trend",
    toCsv(summary.turnoverTrend, ["month", "terminations", "turnoverRate"]),
    "",
    "# Department Breakdown",
    toCsv(summary.departmentBreakdown, ["department", "headcount", "monthlyLaborCost"]),
    "",
    "# Summary",
    toCsv(
      [
        {
          totalActive: summary.totals.totalActive,
          totalMonthlyLaborCost: summary.totals.totalMonthlyLaborCost,
          totalAnnualLaborCost: summary.totals.totalAnnualLaborCost,
          turnoverRateTrailing12mo: summary.totals.turnoverRateTrailing,
        },
      ],
      ["totalActive", "totalMonthlyLaborCost", "totalAnnualLaborCost", "turnoverRateTrailing12mo"]
    ),
  ].join("\n");

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "reports.export",
    targetType: "AnalyticsSummary",
  });

  return new NextResponse(sections, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="workforce-mis-report.csv"` },
  });
}
