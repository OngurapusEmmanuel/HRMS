import { Clock } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { managedDepartmentIds } from "@/lib/rbac";
import AttendanceActions from "@/components/AttendanceActions";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { attendanceStatusVariant } from "@/lib/badge-variants";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default async function AttendancePage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;
  const employeeId = (session!.user as any).employeeId;

  let scopeFilter = {};
  if (role === "EMPLOYEE") {
    scopeFilter = { employeeId };
  } else if (role === "MANAGER") {
    const deptIds = employeeId ? await managedDepartmentIds(employeeId) : [];
    scopeFilter = { employee: { departmentId: { in: deptIds } } };
  }

  const today = new Date(new Date().toDateString());
  const records = await prisma.attendanceRecord.findMany({
    where: {
      date: today,
      employee: { organizationId },
      ...scopeFilter,
    },
    include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Attendance — Today"
        actions={role === "EMPLOYEE" && <AttendanceActions />}
      />

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.employee.firstName} {r.employee.lastName}</TableCell>
                <TableCell className="text-secondary">{r.checkIn ? r.checkIn.toLocaleTimeString() : "—"}</TableCell>
                <TableCell className="text-secondary">{r.checkOut ? r.checkOut.toLocaleTimeString() : "—"}</TableCell>
                <TableCell>
                  <Badge variant={attendanceStatusVariant[r.status] ?? "neutral"}>{r.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {records.length === 0 && (
          <EmptyState
            icon={<Clock className="h-8 w-8" />}
            title="No attendance records"
            description="No attendance records for today."
          />
        )}
      </TableContainer>
    </div>
  );
}
