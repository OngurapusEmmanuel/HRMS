import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getCycleDashboard } from "@/lib/appraisal-cycle";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import CloseCycleButton from "@/components/CloseCycleButton";
import { Users } from "lucide-react";

function pct(submitted: number, total: number) {
  return total === 0 ? 0 : Math.round((submitted / total) * 100);
}

function ReviewMeter({ label, submitted, total }: { label: string; submitted: number; total: number }) {
  const percent = pct(submitted, total);
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-secondary">{label}</span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {submitted}/{total} ({percent}%)
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-primary-500 transition-all" style={{ width: `${percent}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AppraisalCycleDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;

  const dashboard = await getCycleDashboard(params.id, organizationId);
  if (!dashboard) notFound();

  const { cycle, employees, totals } = dashboard;

  // Overall completion = manager reviews plus self reviews (only counted
  // when the cycle requires them), against the combined denominator.
  const overallSubmitted = totals.managerSubmitted + totals.selfSubmitted;
  const overallTotal = totals.managerTotal + totals.selfTotal;
  const overallPercent = pct(overallSubmitted, overallTotal);

  const canManage = can(role, "appraisal:cycle_manage");

  return (
    <div>
      <PageHeader
        breadcrumb={[
          { label: "Appraisals", href: "/appraisals" },
          { label: "Cycles", href: "/appraisals" },
          { label: cycle.name },
        ]}
        title={cycle.name}
        description={cycle.department ? `Scoped to ${cycle.department.name}` : "Org-wide"}
        actions={canManage && cycle.status === "ACTIVE" ? <CloseCycleButton cycleId={cycle.id} /> : undefined}
      />

      <Card className="mb-6 border-0 bg-primary-500 text-white shadow-soft">
        <CardContent className="flex flex-wrap items-center justify-between gap-6 p-6">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-lg font-semibold">{cycle.name}</h2>
              <Badge variant={cycle.status === "ACTIVE" ? "success" : "neutral"} className="bg-white/20 text-white">
                {cycle.status}
              </Badge>
            </div>
            <p className="text-sm text-primary-50">
              {cycle.periodStart.toLocaleDateString()} – {cycle.periodEnd.toLocaleDateString()} · Due{" "}
              {cycle.dueAt.toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold tabular-nums">{overallPercent}%</p>
            <p className="text-sm text-primary-50">complete</p>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ReviewMeter label="Manager reviews" submitted={totals.managerSubmitted} total={totals.managerTotal} />
        {cycle.requireSelfReview && (
          <ReviewMeter label="Self reviews" submitted={totals.selfSubmitted} total={totals.selfTotal} />
        )}
      </div>

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Manager review</TableHead>
              {cycle.requireSelfReview && <TableHead>Self review</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium text-foreground">
                  {e.firstName} {e.lastName}
                </TableCell>
                <TableCell>
                  <Badge variant={e.managerReview === "SUBMITTED" ? "success" : "neutral"}>
                    {e.managerReview === "SUBMITTED" ? "Submitted" : "Not started"}
                  </Badge>
                </TableCell>
                {cycle.requireSelfReview && (
                  <TableCell>
                    <Badge variant={e.selfReview === "SUBMITTED" ? "success" : "neutral"}>
                      {e.selfReview === "SUBMITTED" ? "Submitted" : "Not started"}
                    </Badge>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {employees.length === 0 && (
          <EmptyState icon={<Users className="h-8 w-8" />} title="No employees in this cycle's population." />
        )}
      </TableContainer>
    </div>
  );
}
