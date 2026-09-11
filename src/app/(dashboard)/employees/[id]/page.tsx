import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, canActOnDepartment } from "@/lib/rbac";
import EmployeeEditForm from "@/components/EmployeeEditForm";
import DocumentsSection from "@/components/DocumentsSection";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import OffboardingChecklist from "@/components/OffboardingChecklist";
import TerminateEmployeeButton from "@/components/TerminateEmployeeButton";
import AppraisalForm from "@/components/AppraisalForm";
import AppraisalsList from "@/components/AppraisalsList";
import ContractSummaryCard from "@/components/ContractSummaryCard";
import KpiSection from "@/components/performance/KpiSection";
import MeetingsSection from "@/components/performance/MeetingsSection";
import FeedbackSection from "@/components/performance/FeedbackSection";
import TrainingSection from "@/components/learning/TrainingSection";
import { reconcileOverdueEnrollments } from "@/lib/learning";
import { computeProfileCompleteness } from "@/lib/employees";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;
  const sessionEmployeeId = (session!.user as any).employeeId;
  const isOwnProfile = sessionEmployeeId === params.id;

  await reconcileOverdueEnrollments(organizationId);

  const [employee, departments, documents, onboardingTasks, offboardingTasks, appraisals, contractSummary, kpis, meetings, feedbackRequests, colleagues, enrollments] = await Promise.all([
    prisma.employee.findFirst({
      where: { id: params.id, organizationId },
      include: { department: true, leaveBalances: true, user: { select: { email: true } } },
    }),
    prisma.department.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.employeeDocument.findMany({ where: { employeeId: params.id }, orderBy: { createdAt: "desc" } }),
    prisma.onboardingTask.findMany({ where: { employeeId: params.id }, orderBy: { order: "asc" } }),
    prisma.offboardingTask.findMany({ where: { employeeId: params.id }, orderBy: { order: "asc" } }),
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

  // Active cycle requiring a self-review from this employee (org-wide or
  // scoped to their department), if any, and whether they've already
  // submitted one — drives the self-review prompt on their own Overview tab.
  const isOwnProfileForCycle = sessionEmployeeId === params.id;
  const activeSelfReviewCycle = isOwnProfileForCycle
    ? await prisma.appraisalCycle.findFirst({
        where: {
          organizationId,
          status: "ACTIVE",
          requireSelfReview: true,
          OR: [{ departmentId: null }, { departmentId: employee.departmentId }],
        },
        orderBy: { createdAt: "desc" },
      })
    : null;
  const alreadySelfReviewed =
    activeSelfReviewCycle &&
    (await prisma.appraisal.findFirst({
      where: { cycleId: activeSelfReviewCycle.id, employeeId: params.id, reviewType: "SELF" },
      select: { id: true },
    }));
  const showSelfReviewPrompt = !!activeSelfReviewCycle && !alreadySelfReviewed;

  const profileCompleteness = computeProfileCompleteness({
    phone: employee.phone,
    departmentId: employee.departmentId,
    reportsToId: employee.reportsToId,
    documentCount: documents.length,
    onboardingTasks: onboardingTasks.map((t) => ({ completed: t.completed })),
    appraisalCount: appraisals.length,
  });

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
  const canEdit = can(role, "employee:update");

  const hasPerformanceTab = canSeeAppraisals || canManageKpi;
  const hasLearningTab = canSeeOnboarding;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`${employee.firstName} ${employee.lastName}`}
        description={`${employee.jobTitle} · ${employee.employeeCode}`}
        breadcrumb={[{ label: "Employees", href: "/employees" }, { label: `${employee.firstName} ${employee.lastName}` }]}
        actions={
          can(role, "employee:delete") &&
          employee.status !== "TERMINATED" && (
            <TerminateEmployeeButton employeeId={employee.id} employeeName={`${employee.firstName} ${employee.lastName}`} />
          )
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {hasPerformanceTab && <TabsTrigger value="performance">Performance</TabsTrigger>}
          {hasLearningTab && <TabsTrigger value="learning">Learning</TabsTrigger>}
          {canSeeDocuments && <TabsTrigger value="documents">Documents</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-secondary">Email</p>
                <p className="font-medium text-foreground">{employee.user.email}</p>
              </div>
              <div>
                <p className="text-secondary">Department</p>
                <p className="font-medium text-foreground">{employee.department?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-secondary">Status</p>
                <p className="font-medium text-foreground">{employee.status}</p>
              </div>
              <div>
                <p className="text-secondary">Hire Date</p>
                <p className="font-medium text-foreground">{employee.hireDate.toDateString()}</p>
              </div>
              {employee.contractEndDate && (
                <div>
                  <p className="text-secondary">Contract End</p>
                  <p className="font-medium text-foreground">{employee.contractEndDate.toDateString()}</p>
                </div>
              )}
              <div className="col-span-2 border-t border-border pt-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-secondary">Profile completeness</p>
                  <span className="font-medium text-foreground">{profileCompleteness.percent}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full bg-primary-500 transition-all" style={{ width: `${profileCompleteness.percent}%` }} />
                </div>
                {profileCompleteness.missing.length > 0 && (
                  <p className="mt-1 text-xs text-muted">Missing: {profileCompleteness.missing.join(", ")}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {showSelfReviewPrompt && activeSelfReviewCycle && (
            <Card className="border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-950">
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">Self-review due for "{activeSelfReviewCycle.name}"</p>
                  <p className="text-sm text-secondary">Due {activeSelfReviewCycle.dueAt.toDateString()}</p>
                </div>
                <AppraisalForm
                  employeeId={employee.id}
                  cycleId={activeSelfReviewCycle.id}
                  reviewType="SELF"
                  triggerLabel="Submit self-review"
                  title="Self Review"
                />
              </CardContent>
            </Card>
          )}

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">Leave Balances</h2>
            <Card>
              <div className="divide-y divide-border">
                {employee.leaveBalances.length === 0 && <p className="px-4 py-4 text-sm text-muted">No balances recorded yet.</p>}
                {employee.leaveBalances.map((b) => (
                  <div key={b.id} className="flex justify-between px-4 py-3 text-sm">
                    <span className="text-foreground">{b.type}</span>
                    <span className="text-secondary">
                      {b.used} / {b.entitled} days used
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {canEdit && (
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
          )}

          {employee.status === "TERMINATED" && offboardingTasks.length > 0 && (
            <OffboardingChecklist employeeId={employee.id} initialTasks={offboardingTasks} />
          )}
        </TabsContent>

        {hasPerformanceTab && (
          <TabsContent value="performance" className="space-y-6">
            {canSeeAppraisals && (
              <Card>
                <CardContent>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-semibold text-foreground">Performance Appraisals</h2>
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
                </CardContent>
              </Card>
            )}

            {canSeeContractSummary && (
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
            )}

            <KpiSection
              employeeId={employee.id}
              initialKpis={kpis.map((k) => ({ ...k, target: k.target.toString(), current: k.current.toString(), periodEnd: k.periodEnd.toISOString() }))}
              canManage={canManageKpi}
              isOwner={isOwnProfile}
            />

            {canSeeAppraisals && (
              <MeetingsSection
                employeeId={employee.id}
                initialMeetings={meetings.map((m) => ({ ...m, scheduledAt: m.scheduledAt.toISOString() }))}
                canManage={canScheduleMeeting}
              />
            )}

            {canSeeAppraisals && (
              <FeedbackSection
                employeeId={employee.id}
                initialRequests={feedbackRequests.map((r) => ({
                  ...r,
                  provider: canSeeProviders || r.relationship === "MANAGER" ? r.provider : null,
                }))}
                colleagues={colleagues}
                canRequest={canRequestFeedback}
              />
            )}
          </TabsContent>
        )}

        {hasLearningTab && (
          <TabsContent value="learning" className="space-y-6">
            <TrainingSection
              enrollments={enrollments.map((e) => ({ ...e, dueDate: e.dueDate ? e.dueDate.toISOString() : null }))}
              canUpdate={isOwnProfile || can(role, "training:manage")}
            />
            {onboardingTasks.length > 0 && <OnboardingChecklist employeeId={employee.id} initialTasks={onboardingTasks} />}
          </TabsContent>
        )}

        {canSeeDocuments && (
          <TabsContent value="documents">
            <DocumentsSection
              employeeId={employee.id}
              initialDocuments={documents.map((d) => ({
                ...d,
                createdAt: d.createdAt.toISOString(),
                expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
              }))}
              canDelete={can(role, "employee:update")}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
