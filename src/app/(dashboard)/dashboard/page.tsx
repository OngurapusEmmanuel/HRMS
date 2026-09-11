import { getServerSession } from "next-auth";
import Link from "next/link";
import { AlertTriangle, Users, UserCheck, CalendarClock, Clock3, Wallet, ListChecks, FileWarning } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import StatCard from "@/components/StatCard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const sessionName = (session!.user as any).name as string | undefined;
  // The session name is either "First Last" (from the employee record) or a
  // bare email fallback for accounts without one — only greet by first name
  // when it actually looks like a name.
  const firstName = sessionName && !sessionName.includes("@") ? sessionName.split(" ")[0] : undefined;

  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [totalEmployees, activeEmployees, pendingLeaves, todayPresent, payslipsThisMonth, onboardingInProgress, contractsEndingSoon] = await Promise.all([
    prisma.employee.count({ where: { organizationId } }),
    prisma.employee.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.leaveRequest.count({ where: { status: "PENDING", employee: { organizationId } } }),
    prisma.attendanceRecord.count({
      where: {
        date: new Date(new Date().toDateString()),
        employee: { organizationId },
        checkIn: { not: null },
      },
    }),
    prisma.payslip.count({
      where: { periodMonth: now.getMonth() + 1, periodYear: now.getFullYear(), employee: { organizationId } },
    }),
    prisma.employee.count({
      where: { organizationId, onboardingTasks: { some: { completed: false } } },
    }),
    prisma.employee.count({
      where: {
        organizationId,
        status: "ACTIVE",
        contractEndDate: { not: null, lte: thirtyDaysOut, gte: now },
      },
    }),
  ]);

  // Consolidate the actionable counts already fetched above into one callout
  // instead of scattering "needs review"-style hints across their stat
  // cards — keeps the grid itself clean and gives pending items one clear home.
  const attentionItems = [
    pendingLeaves > 0 && {
      label: `${pendingLeaves} leave request${pendingLeaves === 1 ? "" : "s"} awaiting review`,
      href: "/leaves",
    },
    contractsEndingSoon > 0 && {
      label: `${contractsEndingSoon} contract${contractsEndingSoon === 1 ? "" : "s"} ending in the next 30 days`,
      href: "/employees",
    },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={firstName ? `Welcome back, ${firstName}. Here's your organization at a glance.` : "Your organization at a glance."}
      />

      {attentionItems.length > 0 && (
        <Card className="mb-6 border-warning-100 bg-warning-100/50">
          <CardContent className="flex items-start gap-3 p-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning-100 text-warning-700">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Needs your attention</p>
              <ul className="mt-1.5 space-y-1">
                {attentionItems.map((item) => (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-secondary transition-colors hover:text-primary-600 hover:underline dark:hover:text-primary-400"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Employees" value={totalEmployees} icon={Users} href="/employees" />
        <StatCard label="Active" value={activeEmployees} icon={UserCheck} href="/employees" />
        <StatCard label="Pending Leave Requests" value={pendingLeaves} icon={CalendarClock} href="/leaves" />
        <StatCard label="Checked In Today" value={todayPresent} icon={Clock3} href="/attendance" />
        <StatCard label="Payslips This Month" value={payslipsThisMonth} icon={Wallet} href="/payroll" />
        <StatCard label="Onboarding In Progress" value={onboardingInProgress} icon={ListChecks} href="/employees" />
        <StatCard
          label="Contracts Ending (30d)"
          value={contractsEndingSoon}
          icon={FileWarning}
          href="/employees"
        />
      </div>
    </div>
  );
}
