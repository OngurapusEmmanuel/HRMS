import Link from "next/link";
import { ClipboardList, CalendarClock } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, managedDepartmentIds } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button";
import { ratingVariant, appraisalCycleStatusVariant } from "@/lib/badge-variants";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import AddCycleButton from "@/components/AddCycleButton";

// Two independent lists share this one page/URL. Rather than build a
// two-axis pagination scheme, each tab gets its own searchParam
// (historyPage / cyclesPage) plus a `tab` param so a Previous/Next click
// lands back on the tab it came from (Tabs below is uncontrolled, seeded
// from this searchParam on the server render).
const HISTORY_PAGE_SIZE = 25;
const CYCLES_PAGE_SIZE = 12;

export default async function AppraisalsPage({
  searchParams,
}: {
  searchParams: { tab?: string; historyPage?: string; cyclesPage?: string };
}) {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;
  const employeeId = (session!.user as any).employeeId;
  const canManageCycles = can(role, "appraisal:cycle_manage");

  const activeTab = searchParams.tab === "cycles" ? "cycles" : "history";
  const historyPage = Math.max(1, Number(searchParams.historyPage ?? "1") || 1);
  const cyclesPage = Math.max(1, Number(searchParams.cyclesPage ?? "1") || 1);

  // Same scoping model as leaves/attendance/payroll: ADMIN/HR org-wide,
  // MANAGER limited to department(s) they head, EMPLOYEE sees only their own.
  let scopeFilter = {};
  if (role === "EMPLOYEE") {
    scopeFilter = { employeeId };
  } else if (role === "MANAGER") {
    const deptIds = employeeId ? await managedDepartmentIds(employeeId) : [];
    scopeFilter = { employee: { departmentId: { in: deptIds } } };
  }

  const appraisalsWhere = {
    employee: { organizationId },
    ...scopeFilter,
  };

  const [appraisals, appraisalsTotal, cycles, cyclesTotal, departments] = await Promise.all([
    prisma.appraisal.findMany({
      where: appraisalsWhere,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        reviewer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { periodEnd: "desc" },
      skip: (historyPage - 1) * HISTORY_PAGE_SIZE,
      take: HISTORY_PAGE_SIZE,
    }),
    prisma.appraisal.count({ where: appraisalsWhere }),
    // Cheap, single query for the Cycles tab — no per-cycle completion
    // fetches here, that detail lives on the cycle detail page instead.
    prisma.appraisalCycle.findMany({
      where: { organizationId },
      include: { department: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (cyclesPage - 1) * CYCLES_PAGE_SIZE,
      take: CYCLES_PAGE_SIZE,
    }),
    prisma.appraisalCycle.count({ where: { organizationId } }),
    canManageCycles
      ? prisma.department.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  const historyTotalPages = Math.max(1, Math.ceil(appraisalsTotal / HISTORY_PAGE_SIZE));
  const cyclesTotalPages = Math.max(1, Math.ceil(cyclesTotal / CYCLES_PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Performance Appraisals"
        description={
          role === "EMPLOYEE"
            ? "Your review history."
            : "Recent appraisals across your scope. Open an employee's profile to file a new one."
        }
      />

      <Tabs defaultValue={activeTab}>
        <TabsList>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="cycles">Cycles</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  {role !== "EMPLOYEE" && <TableHead>Employee</TableHead>}
                  <TableHead>Period</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Reviewer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appraisals.map((a) => {
                  const rating = Number(a.overallRating);
                  return (
                    <TableRow key={a.id}>
                      {role !== "EMPLOYEE" && (
                        <TableCell>
                          <Link href={`/employees/${a.employee.id}`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                            {a.employee.firstName} {a.employee.lastName}
                          </Link>
                        </TableCell>
                      )}
                      <TableCell className="text-secondary">
                        {a.periodStart.toLocaleDateString()} – {a.periodEnd.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ratingVariant(rating)}>{rating.toFixed(2)} / 5</Badge>
                      </TableCell>
                      <TableCell className="text-secondary">
                        {a.reviewer.firstName} {a.reviewer.lastName}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {appraisals.length === 0 && (
              <EmptyState icon={<ClipboardList className="h-8 w-8" />} title="No appraisals on file yet." />
            )}
          </TableContainer>

          {historyTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-secondary">
              <span>
                Page {historyPage} of {historyTotalPages} · {appraisalsTotal} appraisal{appraisalsTotal === 1 ? "" : "s"}
              </span>
              <div className="flex gap-2">
                <Link
                  href={`/appraisals?tab=history&historyPage=${Math.max(1, historyPage - 1)}`}
                  className={buttonVariants({ variant: "outline", size: "sm", className: historyPage <= 1 ? "pointer-events-none opacity-40" : "" })}
                >
                  Previous
                </Link>
                <Link
                  href={`/appraisals?tab=history&historyPage=${Math.min(historyTotalPages, historyPage + 1)}`}
                  className={buttonVariants({ variant: "outline", size: "sm", className: historyPage >= historyTotalPages ? "pointer-events-none opacity-40" : "" })}
                >
                  Next
                </Link>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cycles">
          {canManageCycles && (
            <div className="mb-4 flex justify-end">
              <AddCycleButton departments={departments} />
            </div>
          )}

          {cycles.length === 0 ? (
            <EmptyState icon={<CalendarClock className="h-8 w-8" />} title="No appraisal cycles yet." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cycles.map((cycle) => (
                <Link key={cycle.id} href={`/appraisals/cycles/${cycle.id}`}>
                  <Card className="h-full transition-all hover:border-primary-300 hover:shadow-popover">
                    <CardContent className="p-5">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-foreground">{cycle.name}</h3>
                        <Badge variant={appraisalCycleStatusVariant[cycle.status] ?? "neutral"}>{cycle.status}</Badge>
                      </div>
                      <p className="text-sm text-secondary">
                        {cycle.periodStart.toLocaleDateString()} – {cycle.periodEnd.toLocaleDateString()}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Due {cycle.dueAt.toLocaleDateString()} · {cycle.department ? cycle.department.name : "Org-wide"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {cyclesTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-secondary">
              <span>
                Page {cyclesPage} of {cyclesTotalPages} · {cyclesTotal} cycle{cyclesTotal === 1 ? "" : "s"}
              </span>
              <div className="flex gap-2">
                <Link
                  href={`/appraisals?tab=cycles&cyclesPage=${Math.max(1, cyclesPage - 1)}`}
                  className={buttonVariants({ variant: "outline", size: "sm", className: cyclesPage <= 1 ? "pointer-events-none opacity-40" : "" })}
                >
                  Previous
                </Link>
                <Link
                  href={`/appraisals?tab=cycles&cyclesPage=${Math.min(cyclesTotalPages, cyclesPage + 1)}`}
                  className={buttonVariants({ variant: "outline", size: "sm", className: cyclesPage >= cyclesTotalPages ? "pointer-events-none opacity-40" : "" })}
                >
                  Next
                </Link>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
