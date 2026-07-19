import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import StatCard from "@/components/StatCard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;

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

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={totalEmployees} />
        <StatCard label="Active" value={activeEmployees} />
        <StatCard label="Pending Leave Requests" value={pendingLeaves} hint="Needs review" />
        <StatCard label="Checked In Today" value={todayPresent} />
        <StatCard label="Payslips This Month" value={payslipsThisMonth} />
        <StatCard label="Onboarding In Progress" value={onboardingInProgress} />
        <StatCard label="Contracts Ending (30d)" value={contractsEndingSoon} hint="Consider an appraisal + summary" />
      </div>
    </div>
  );
}
