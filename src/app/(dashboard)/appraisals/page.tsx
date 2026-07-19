import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, managedDepartmentIds } from "@/lib/rbac";

function ratingColor(rating: number) {
  if (rating >= 4) return "bg-green-100 text-green-700";
  if (rating >= 3) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

export default async function AppraisalsPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;
  const employeeId = (session!.user as any).employeeId;

  // Same scoping model as leaves/attendance/payroll: ADMIN/HR org-wide,
  // MANAGER limited to department(s) they head, EMPLOYEE sees only their own.
  let scopeFilter = {};
  if (role === "EMPLOYEE") {
    scopeFilter = { employeeId };
  } else if (role === "MANAGER") {
    const deptIds = employeeId ? await managedDepartmentIds(employeeId) : [];
    scopeFilter = { employee: { departmentId: { in: deptIds } } };
  }

  const appraisals = await prisma.appraisal.findMany({
    where: {
      employee: { organizationId },
      ...scopeFilter,
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      reviewer: { select: { firstName: true, lastName: true } },
    },
    orderBy: { periodEnd: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Performance Appraisals</h1>
      <p className="text-sm text-gray-500 mb-6">
        {role === "EMPLOYEE"
          ? "Your review history."
          : "Recent appraisals across your scope. Open an employee's profile to file a new one."}
      </p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              {role !== "EMPLOYEE" && <th className="px-4 py-3 font-medium">Employee</th>}
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Rating</th>
              <th className="px-4 py-3 font-medium">Reviewer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {appraisals.map((a) => {
              const rating = Number(a.overallRating);
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  {role !== "EMPLOYEE" && (
                    <td className="px-4 py-3">
                      <Link href={`/employees/${a.employee.id}`} className="text-brand-600 hover:underline font-medium">
                        {a.employee.firstName} {a.employee.lastName}
                      </Link>
                    </td>
                  )}
                  <td className="px-4 py-3 text-gray-500">
                    {a.periodStart.toLocaleDateString()} – {a.periodEnd.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ratingColor(rating)}`}>
                      {rating.toFixed(2)} / 5
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{a.reviewer.firstName} {a.reviewer.lastName}</td>
                </tr>
              );
            })}
            {appraisals.length === 0 && (
              <tr>
                <td colSpan={role === "EMPLOYEE" ? 3 : 4} className="px-4 py-8 text-center text-gray-400">
                  No appraisals on file yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
