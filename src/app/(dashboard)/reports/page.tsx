import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getAnalyticsSummary } from "@/lib/analytics";
import StatCard from "@/components/StatCard";
import AnalyticsCharts from "@/components/reports/AnalyticsCharts";

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  const role = (session!.user as any).role;
  if (!can(role, "reports:view")) redirect("/dashboard");

  const organizationId = (session!.user as any).organizationId;
  const summary = await getAnalyticsSummary(organizationId, 12);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold text-gray-900">Reports & Analytics</h1>
        <a href="/api/reports/export" className="text-sm text-brand-600 hover:underline">Export MIS Report (CSV)</a>
      </div>
      <p className="text-sm text-gray-500 mb-6">Workforce trends over the last 12 months.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Employees" value={summary.totals.totalActive} />
        <StatCard label="Monthly Labor Cost" value={money(summary.totals.totalMonthlyLaborCost)} />
        <StatCard label="Annual Labor Cost" value={money(summary.totals.totalAnnualLaborCost)} />
        <StatCard label="Turnover (trailing 12mo)" value={`${summary.totals.turnoverRateTrailing}%`} />
      </div>

      <AnalyticsCharts summary={summary} />
    </div>
  );
}
