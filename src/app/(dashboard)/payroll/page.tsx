import Link from "next/link";
import { Download, Wallet } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, managedDepartmentIds } from "@/lib/rbac";
import GeneratePayrollButton from "@/components/GeneratePayrollButton";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const PAGE_SIZE = 20;

function money(n: unknown) {
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function PayrollPage({
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

  const where = {
    employee: { organizationId },
    ...scopeFilter,
  };

  const [payslips, total] = await Promise.all([
    prisma.payslip.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.payslip.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Generated payslips for your organization."
        actions={
          <>
            {can(role, "payroll:manage") && (
              <a href="/api/payroll/export" className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Download className="h-4 w-4" />
                Export CSV
              </a>
            )}
            {can(role, "payroll:manage") && <GeneratePayrollButton />}
          </>
        }
      />

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              {role !== "EMPLOYEE" && <TableHead>Employee</TableHead>}
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Deductions</TableHead>
              <TableHead className="text-right">Net Pay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payslips.map((p) => (
              <TableRow key={p.id}>
                {role !== "EMPLOYEE" && (
                  <TableCell>{p.employee.firstName} {p.employee.lastName}</TableCell>
                )}
                <TableCell className="text-secondary">{p.periodMonth}/{p.periodYear}</TableCell>
                <TableCell className="text-right tabular-nums">{money(p.grossPay)}</TableCell>
                <TableCell className="text-right tabular-nums text-danger-500">-{money(p.deductions)}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{money(p.netPay)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {payslips.length === 0 && (
          <EmptyState
            icon={<Wallet className="h-8 w-8" />}
            title="No payslips generated yet"
            description={can(role, "payroll:manage") ? "Generate payroll for a period to see payslips here." : "Check back once payroll has been generated."}
          />
        )}
      </TableContainer>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-secondary">
          <span>
            Page {page} of {totalPages} · {total} payslip{total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Link
              href={`/payroll?page=${Math.max(1, page - 1)}`}
              className={buttonVariants({ variant: "outline", size: "sm", className: page <= 1 ? "pointer-events-none opacity-40" : "" })}
            >
              Previous
            </Link>
            <Link
              href={`/payroll?page=${Math.min(totalPages, page + 1)}`}
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
