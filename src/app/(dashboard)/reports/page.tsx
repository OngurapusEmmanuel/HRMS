import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Download, Users, Wallet, Landmark, TrendingDown } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getAnalyticsSummary } from "@/lib/analytics";
import StatCard from "@/components/StatCard";
import AnalyticsCharts from "@/components/reports/AnalyticsCharts";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";

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
      <PageHeader
        title="Reports & Analytics"
        description="Workforce trends over the last 12 months."
        actions={
          <a href="/api/reports/export" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Download className="h-4 w-4" />
            Export MIS Report (CSV)
          </a>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Employees" value={summary.totals.totalActive} icon={Users} />
        <StatCard label="Monthly Labor Cost" value={money(summary.totals.totalMonthlyLaborCost)} icon={Wallet} />
        <StatCard label="Annual Labor Cost" value={money(summary.totals.totalAnnualLaborCost)} icon={Landmark} />
        <StatCard label="Turnover (trailing 12mo)" value={`${summary.totals.turnoverRateTrailing}%`} icon={TrendingDown} />
      </div>

      <AnalyticsCharts summary={summary} />
    </div>
  );
}
