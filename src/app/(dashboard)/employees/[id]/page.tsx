import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, canActOnDepartment } from "@/lib/rbac";
import EmployeeEditForm from "@/components/EmployeeEditForm";
import DocumentsSection from "@/components/DocumentsSection";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import AppraisalForm from "@/components/AppraisalForm";
import AppraisalsList from "@/components/AppraisalsList";
import ContractSummaryCard from "@/components/ContractSummaryCard";
import KpiSection from "@/components/performance/KpiSection";
import MeetingsSection from "@/components/performance/MeetingsSection";
import FeedbackSection from "@/components/performance/FeedbackSection";
import TrainingSection from "@/components/learning/TrainingSection";
import { reconcileOverdueEnrollments } from "@/lib/learning";

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;
  const sessionEmployeeId = (session!.user as any).employeeId;
  const isOwnProfile = sessionEmployeeId === params.id;

  await reconcileOverdueEnrollments(organizationId);

  const [employee, departments, documents, onboardingTasks, appraisals, contractSummary, kpis, meetings, feedbackRequests, colleagues, enrollments] = await Promise.all([
    prisma.employee.findFirst({
      where: { id: params.id, organizationId },
      include: { department: true, leaveBalances: true, user: { select: { email: true } } },
    }),
    prisma.department.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.employeeDocument.findMany({ where: { employeeId: params.id }, orderBy: { createdAt: "desc" } }),
    prisma.onboardingTask.findMany({ where: { employeeId: params.id }, orderBy: { order: "asc" } }),
    prisma.appraisal.findMany({
      where: { employeeId: params.id },
      include: { reviewer: { select: { firstName: true, lastName: true } } },
      orderBy: { periodEnd: "desc" },
    }),
    prisma.contractSummary.findUnique({ where: { employeeId: params.id } }),
    prisma.kpi.findMany({ where: { employeeId: params.id }, orderBy: { periodEnd: "desc" } }),
    prisma.appraisalMeeting.findMany({
      where: { employeeId: params.id },
      include: { organizer: { select: { firstName: true, lastName: true } } },
      orderBy: { scheduledAt: "desc" },
    }),
    prisma.feedbackRequest.findMany({
      where: { employeeId: params.id },
      include: { provider: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      where: { organizationId, status: "ACTIVE", id: { not: params.id } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.trainingEnrollment.findMany({
      where: { employeeId: params.id },
      include: { course: { select: { title: true, category: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!employee) notFound();

  const managesDepartment = await canActOnDepartment(role, sessionEmployeeId, employee.departmentId);

  // Only HR/Admin or the employee viewing their own profile can see documents.
  const canSeeDocuments = can(role, "employee:update") || isOwnProfile;
  const canSeeOnboarding = can(role, "employee:update") || isOwnProfile || managesDepartment;
  // Employees can see their own review history (transparency), but not the
  // contract summary — that's an HR/manager-facing rollup, not shown to the
  // employee it's about.
  const canSeeAppraisals = can(role, "appraisal:view_all") || isOwnProfile || managesDepartment;
  const canCreateAppraisal = can(role, "appraisal:create") && managesDepartment;
  const canSeeContractSummary = can(role, "appraisal:view_all") || managesDepartment;
  const canRegenerateSummary = can(role, "appraisal:manage_summary");
  const canManageKpi = can(role, "kpi:manage") && managesDepartment;
  const canScheduleMeeting = can(role, "meeting:schedule") && managesDepartment;
  const canRequestFeedback = can(role, "feedback:request") && managesDepartment;
  const canSeeProviders = can(role, "appraisal:view_all");

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">
        {employee.firstName} {employee.lastName}
      </h1>
      <p className="text-sm text-gray-500 mb-6">{employee.jobTitle} · {employee.employeeCode}</p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-gray-500">Email</p><p className="font-medium">{employee.user.email}</p></div>
        <div><p className="text-gray-500">Department</p><p className="font-medium">{employee.department?.name ?? "—"}</p></div>
        <div><p className="text-gray-500">Status</p><p className="font-medium">{employee.status}</p></div>
        <div><p className="text-gray-500">Hire Date</p><p className="font-medium">{employee.hireDate.toDateString()}</p></div>
        {employee.contractEndDate && (
          <div><p className="text-gray-500">Contract End</p><p className="font-medium">{employee.contractEndDate.toDateString()}</p></div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Leave Balances</h2>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {employee.leaveBalances.length === 0 && (
          <p className="px-4 py-4 text-gray-400 text-sm">No balances recorded yet.</p>
        )}
        {employee.leaveBalances.map((b) => (
          <div key={b.id} className="px-4 py-3 flex justify-between text-sm">
            <span>{b.type}</span>
            <span className="text-gray-500">{b.used} / {b.entitled} days used</span>
          </div>
        ))}
      </div>

      {canSeeAppraisals && (
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Performance Appraisals</h2>
            {canCreateAppraisal && <AppraisalForm employeeId={employee.id} />}
          </div>
          <AppraisalsList
            appraisals={appraisals.map((a) => ({
              ...a,
              periodStart: a.periodStart.toISOString(),
              periodEnd: a.periodEnd.toISOString(),
              overallRating: a.overallRating.toString(),
              scores: a.scores as Record<string, number>,
            }))}
          />
        </div>
      )}

      {canSeeContractSummary && (
        <div className="mt-8">
          <ContractSummaryCard
            employeeId={employee.id}
            canRegenerate={canRegenerateSummary}
            initialSummary={
              contractSummary
                ? {
                    periodStart: contractSummary.periodStart.toISOString(),
                    periodEnd: contractSummary.periodEnd.toISOString(),
                    totalAppraisals: contractSummary.totalAppraisals,
                    averageRating: contractSummary.averageRating?.toString() ?? null,
                    ratingTrend: contractSummary.ratingTrend,
                    strengthsSummary: contractSummary.strengthsSummary,
                    improvementAreas: contractSummary.improvementAreas,
                    recommendation: contractSummary.recommendation,
                    generatedAt: contractSummary.generatedAt.toISOString(),
                  }
                : null
            }
          />
        </div>
      )}

      {(canSeeAppraisals || canManageKpi) && (
        <div className="mt-8">
          <KpiSection
            employeeId={employee.id}
            initialKpis={kpis.map((k) => ({ ...k, target: k.target.toString(), current: k.current.toString(), periodEnd: k.periodEnd.toISOString() }))}
            canManage={canManageKpi}
            isOwner={isOwnProfile}
          />
        </div>
      )}

      {canSeeAppraisals && (
        <div className="mt-8">
          <MeetingsSection
            employeeId={employee.id}
            initialMeetings={meetings.map((m) => ({ ...m, scheduledAt: m.scheduledAt.toISOString() }))}
            canManage={canScheduleMeeting}
          />
        </div>
      )}

      {canSeeAppraisals && (
        <div className="mt-8">
          <FeedbackSection
            employeeId={employee.id}
            initialRequests={feedbackRequests.map((r) => ({
              ...r,
              provider: canSeeProviders || r.relationship === "MANAGER" ? r.provider : null,
            }))}
            colleagues={colleagues}
            canRequest={canRequestFeedback}
          />
        </div>
      )}

      {canSeeOnboarding && (
        <div className="mt-8">
          <TrainingSection
            enrollments={enrollments.map((e) => ({ ...e, dueDate: e.dueDate ? e.dueDate.toISOString() : null }))}
            canUpdate={isOwnProfile || can(role, "training:manage")}
          />
        </div>
      )}

      {canSeeOnboarding && onboardingTasks.length > 0 && (
        <div className="mt-8">
          <OnboardingChecklist employeeId={employee.id} initialTasks={onboardingTasks} />
        </div>
      )}

      {canSeeDocuments && (
        <div className="mt-8">
          <DocumentsSection
            employeeId={employee.id}
            initialDocuments={documents.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }))}
            canDelete={can(role, "employee:update")}
          />
        </div>
      )}

      {can(role, "employee:update") && (
        <div className="mt-8">
          <EmployeeEditForm
            employee={{
              id: employee.id,
              jobTitle: employee.jobTitle,
              status: employee.status,
              baseSalary: employee.baseSalary.toString(),
              departmentId: employee.departmentId,
              contractEndDate: employee.contractEndDate ? employee.contractEndDate.toISOString() : null,
            }}
            departments={departments}
          />
        </div>
      )}
    </div>
  );
}
