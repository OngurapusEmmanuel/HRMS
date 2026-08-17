import Link from "next/link";
import { Download, Search, Users } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import AddEmployeeButton from "@/components/AddEmployeeButton";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { employeeStatusVariant } from "@/lib/badge-variants";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const PAGE_SIZE = 20;

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string };
}) {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;

  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const search = searchParams.search?.trim();

  const where = {
    organizationId,
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { employeeCode: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [employees, total, departments] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: { department: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.employee.count({ where }),
    prisma.department.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Employees"
        description={`${total} employee${total === 1 ? "" : "s"} in your organization.`}
        actions={
          <>
            {can(role, "employee:update") && (
              <a
                href="/api/employees/export"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </a>
            )}
            {can(role, "employee:create") && <AddEmployeeButton departments={departments} />}
          </>
        }
      />

      <form className="mb-4 max-w-sm" action="/employees" method="get">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input type="text" name="search" defaultValue={search} placeholder="Search by name or employee code..." className="pl-9" />
        </div>
      </form>

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-muted">{e.employeeCode}</TableCell>
                <TableCell>
                  <Link href={`/employees/${e.id}`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                    {e.firstName} {e.lastName}
                  </Link>
                </TableCell>
                <TableCell>{e.jobTitle}</TableCell>
                <TableCell>{e.department?.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={employeeStatusVariant[e.status] ?? "neutral"}>{e.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {employees.length === 0 && (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No employees found"
            description={search ? "Try a different search term." : "Add your first employee to get started."}
          />
        )}
      </TableContainer>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-secondary">
          <span>
            Page {page} of {totalPages} · {total} employee{total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Link
              href={`/employees?page=${Math.max(1, page - 1)}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
              className={buttonVariants({ variant: "outline", size: "sm", className: page <= 1 ? "pointer-events-none opacity-40" : "" })}
            >
              Previous
            </Link>
            <Link
              href={`/employees?page=${Math.min(totalPages, page + 1)}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
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
