import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, managedDepartmentIds } from "@/lib/rbac";
import GeneratePayrollButton from "@/components/GeneratePayrollButton";

function money(n: unknown) {
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function PayrollPage() {
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

  const payslips = await prisma.payslip.findMany({
    where: {
      employee: { organizationId },
      ...scopeFilter,
    },
    include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    take: 100,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Payroll</h1>
        <div className="flex items-center gap-3">
          {can(role, "payroll:manage") && (
            <a href="/api/payroll/export" className="text-sm text-brand-600 hover:underline">
              Export CSV
            </a>
          )}
          {can(role, "payroll:manage") && <GeneratePayrollButton />}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              {role !== "EMPLOYEE" && <th className="px-4 py-3 font-medium">Employee</th>}
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Gross</th>
              <th className="px-4 py-3 font-medium">Deductions</th>
              <th className="px-4 py-3 font-medium">Net Pay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payslips.map((p) => (
              <tr key={p.id}>
                {role !== "EMPLOYEE" && (
                  <td className="px-4 py-3">{p.employee.firstName} {p.employee.lastName}</td>
                )}
                <td className="px-4 py-3 text-gray-500">{p.periodMonth}/{p.periodYear}</td>
                <td className="px-4 py-3">{money(p.grossPay)}</td>
                <td className="px-4 py-3 text-red-500">-{money(p.deductions)}</td>
                <td className="px-4 py-3 font-medium">{money(p.netPay)}</td>
              </tr>
            ))}
            {payslips.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No payslips generated yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
