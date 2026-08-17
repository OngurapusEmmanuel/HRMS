import { CalendarDays } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import RequestLeaveButton from "@/components/RequestLeaveButton";
import LeaveActions from "@/components/LeaveActions";
import CancelLeaveButton from "@/components/CancelLeaveButton";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { leaveStatusVariant } from "@/lib/badge-variants";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import TeamCalendar from "@/components/leave/TeamCalendar";

export default async function LeavesPage() {
  const session = await getServerSession(authOptions);
  const role = (session!.user as any).role;
  const organizationId = (session!.user as any).organizationId;
  const employeeId = (session!.user as any).employeeId;

  const requests = await prisma.leaveRequest.findMany({
    where: {
      employee: { organizationId },
      ...(role === "EMPLOYEE" ? { employeeId } : {}),
    },
    include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const canApprove = can(role, "leave:approve");

  const showActionColumn =
    canApprove ||
    requests.some(
      (r) => r.employeeId === employeeId && (r.status === "PENDING" || r.status === "APPROVED")
    );

  return (
    <div>
      <PageHeader
        title="Leave Requests"
        actions={can(role, "leave:request") && <RequestLeaveButton />}
      />

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  {showActionColumn && <TableHead>Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => {
                  const isOwnRow = r.employeeId === employeeId;
                  const canCancelOwn = isOwnRow && (r.status === "PENDING" || r.status === "APPROVED");
                  const canReviewRow = canApprove && !isOwnRow && r.status === "PENDING";
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        {r.employee.firstName} {r.employee.lastName}
                      </TableCell>
                      <TableCell>{r.type}</TableCell>
                      <TableCell className="text-secondary">
                        {r.startDate.toDateString()} – {r.endDate.toDateString()}
                      </TableCell>
                      <TableCell>{r.daysCount}</TableCell>
                      <TableCell>
                        <Badge variant={leaveStatusVariant[r.status] ?? "neutral"}>{r.status}</Badge>
                      </TableCell>
                      {showActionColumn && (
                        <TableCell>
                          {canCancelOwn ? (
                            <CancelLeaveButton leaveId={r.id} />
                          ) : (
                            canReviewRow && <LeaveActions leaveId={r.id} />
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {requests.length === 0 && (
              <EmptyState
                icon={<CalendarDays className="h-8 w-8" />}
                title="No leave requests"
                description="Leave requests will appear here once submitted."
              />
            )}
          </TableContainer>
        </TabsContent>

        <TabsContent value="calendar">
          <TeamCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}
