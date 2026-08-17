import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { managedDepartmentIds } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { kpiStatusVariant } from "@/lib/badge-variants";
import type { KpiStatus } from "@prisma/client";

const COLUMNS: KpiStatus[] = ["NOT_STARTED", "ON_TRACK", "AT_RISK", "OFF_TRACK", "COMPLETED", "CANCELLED"];

export default async function GoalsPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;
  const employeeId = (session!.user as any).employeeId;

  // Same role-scoping shape as leaves/appraisals: EMPLOYEE sees only their
  // own goals, MANAGER sees their own + their direct reports' + anyone in a
  // department they head, ADMIN/HR see every goal in the org.
  const where: any = { organizationId };
  if (role === "EMPLOYEE") {
    where.employeeId = employeeId;
  } else if (role === "MANAGER") {
    const deptIds = employeeId ? await managedDepartmentIds(employeeId) : [];
    where.OR = [
      { employeeId },
      { employee: { reportsToId: employeeId } },
      ...(deptIds.length > 0 ? [{ employee: { departmentId: { in: deptIds } } }] : []),
    ];
  }

  const goals = await prisma.kpi.findMany({
    where,
    include: {
      employee: { select: { firstName: true, lastName: true } },
      _count: { select: { checkIns: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

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
      />

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
                    <Card key={goal.id}>
                      <CardContent className="space-y-2 p-4">
                        <p className="text-sm font-medium text-foreground">{goal.title}</p>
                        <div className="flex items-center gap-2">
                          <Avatar name={ownerName} size="sm" />
                          <span className="truncate text-xs text-secondary">{ownerName}</span>
                        </div>
                        <div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                            <div className="h-full bg-primary-500" style={{ width: `${pct}%` }} />
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
                {columnGoals.length === 0 && <p className="px-1 text-xs text-muted">No goals</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
