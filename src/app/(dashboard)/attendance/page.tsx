import Link from "next/link";
import { Clock } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { managedDepartmentIds } from "@/lib/rbac";
import AttendanceActions from "@/components/AttendanceActions";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { attendanceStatusVariant } from "@/lib/badge-variants";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const PAGE_SIZE = 20;

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;
  const employeeId = (session!.user as any).employeeId;

  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);

  let scopeFilter = {};
  if (role === "EMPLOYEE") {
    scopeFilter = { employeeId };
  } else if (role === "MANAGER") {
    const deptIds = employeeId ? await managedDepartmentIds(employeeId) : [];
    scopeFilter = { employee: { departmentId: { in: deptIds } } };
  }

  const today = new Date(new Date().toDateString());
  const where = {
    date: today,
    employee: { organizationId },
    ...scopeFilter,
  };

  const [records, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      orderBy: { employee: { firstName: "asc" } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.attendanceRecord.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-secondary">
          <span>
            Page {page} of {totalPages} · {total} record{total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Link
              href={`/attendance?page=${Math.max(1, page - 1)}`}
              className={buttonVariants({ variant: "outline", size: "sm", className: page <= 1 ? "pointer-events-none opacity-40" : "" })}
            >
              Previous
            </Link>
            <Link
              href={`/attendance?page=${Math.min(totalPages, page + 1)}`}
              className={buttonVariants({ variant: "outline", size: "sm", className: page >= totalPages ? "pointer-events-none opacity-40" : "" })}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
