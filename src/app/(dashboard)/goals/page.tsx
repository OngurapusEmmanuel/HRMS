import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, managedDepartmentIds } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import AddGoalButton from "@/components/AddGoalButton";
import { kpiStatusVariant } from "@/lib/badge-variants";
import { Target } from "lucide-react";
import type { KpiStatus } from "@prisma/client";

const COLUMNS: KpiStatus[] = ["NOT_STARTED", "ON_TRACK", "AT_RISK", "OFF_TRACK", "COMPLETED", "CANCELLED"];

// A kanban board isn't a great fit for classic page-based pagination, so
// instead of Previous/Next controls we cap the query at a sane ceiling
// (most-recently-updated first) and surface a note when that ceiling is hit.
const BOARD_GOAL_CAP = 200;

export default async function GoalsPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;
  const employeeId = (session!.user as any).employeeId;

  // Same role-scoping shape as leaves/appraisals: EMPLOYEE sees only their
  // own goals, MANAGER sees their own + their direct reports' + anyone in a
  // department they head, ADMIN/HR see every goal in the org.
  const where: any = { organizationId };
  let managerDeptIds: string[] = [];
  if (role === "EMPLOYEE") {
    where.employeeId = employeeId;
  } else if (role === "MANAGER") {
    managerDeptIds = employeeId ? await managedDepartmentIds(employeeId) : [];
    where.OR = [
      { employeeId },
      { employee: { reportsToId: employeeId } },
      ...(managerDeptIds.length > 0 ? [{ employee: { departmentId: { in: managerDeptIds } } }] : []),
    ];
  }

  const goals = await prisma.kpi.findMany({
    where,
    include: {
      employee: { select: { firstName: true, lastName: true } },
      _count: { select: { checkIns: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: BOARD_GOAL_CAP,
  });

  // Same "kpi:manage" gate KpiSection.tsx uses for its own inline add-form,
  // extended to the org-wide board: ADMIN/HR can set a goal for anyone,
  // MANAGER only for employees in a department they head (mirrors
  // canActOnDepartment), and the button is hidden entirely for MANAGERs who
  // don't head any department (nobody they could pick).
  const canManageKpis = can(role, "kpi:manage");
  const canAddGoal = canManageKpis && (role !== "MANAGER" || managerDeptIds.length > 0);

  const assignableEmployees = canAddGoal
    ? await prisma.employee.findMany({
        where: {
          organizationId,
          status: "ACTIVE",
          ...(role === "MANAGER" ? { departmentId: { in: managerDeptIds } } : {}),
        },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { firstName: "asc" },
      })
    : [];

  // Reuse the goals already loaded for the board as candidate parent goals,
  // instead of a second query — good enough for the "optionally cascade
  // from a team/company goal" use case without over-building the picker.
  const parentGoalOptions = goals.map((g) => ({
    id: g.id,
    title: g.title,
    employeeName: `${g.employee.firstName} ${g.employee.lastName}`,
  }));

  const byStatus = new Map<KpiStatus, typeof goals>();
  for (const status of COLUMNS) byStatus.set(status, []);
  for (const goal of goals) {
    byStatus.get(goal.status)?.push(goal);
  }

  return (
    <div>
      <PageHeader
        title="Goals"
        description={
          role === "EMPLOYEE"
            ? "Your goals, grouped by status."
            : "Goals across your scope, grouped by status. Change a goal's status from the employee's profile."
        }
        actions={canAddGoal ? <AddGoalButton employees={assignableEmployees} parentGoalOptions={parentGoalOptions} /> : undefined}
      />

      {goals.length === BOARD_GOAL_CAP && (
        <p className="mb-3 text-xs text-muted">Showing the most recently updated {BOARD_GOAL_CAP} goals.</p>
      )}

      {goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-8 w-8" />}
          title="No goals yet"
          description={
            role === "EMPLOYEE"
              ? "You don't have any goals set yet."
              : "No goals have been set across your scope yet. Create one to get the board started."
          }
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((status) => {
            const columnGoals = byStatus.get(status) ?? [];
            return (
              <div key={status} className="w-72 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{status.replace("_", " ")}</h2>
                  <Badge variant={kpiStatusVariant[status] ?? "neutral"}>{columnGoals.length}</Badge>
                </div>

                <div className="space-y-3">
                  {columnGoals.map((goal) => {
                    const target = Number(goal.target);
                    const current = Number(goal.current);
                    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
                    const ownerName = `${goal.employee.firstName} ${goal.employee.lastName}`;
                    return (
                      <Card key={goal.id} className="transition-all hover:-translate-y-0.5 hover:shadow-popover">
                        <CardContent className="space-y-2 p-4">
                          <p className="text-sm font-medium text-foreground">{goal.title}</p>
                          <div className="flex items-center gap-2">
                            <Avatar name={ownerName} size="sm" />
                            <span className="truncate text-xs text-secondary">{ownerName}</span>
                          </div>
                          <div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                              <div
                                className="h-full bg-primary-500 transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="mt-1 text-xs text-muted">
                              {goal.current.toString()}
                              {goal.unit ?? ""} / {goal.target.toString()}
                              {goal.unit ?? ""}
                            </p>
                          </div>
                          <Badge variant="neutral">{goal._count.checkIns} check-in{goal._count.checkIns === 1 ? "" : "s"}</Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {columnGoals.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-8 text-center">
                      <Target className="h-5 w-5 text-muted" />
                      <p className="text-xs text-muted">No goals</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
