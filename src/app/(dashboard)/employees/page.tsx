import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import AddEmployeeButton from "@/components/AddEmployeeButton";

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Employees</h1>
        <div className="flex items-center gap-3">
          {can(role, "employee:update") && (
            <a href="/api/employees/export" className="text-sm text-brand-600 hover:underline">
              Export CSV
            </a>
          )}
          {can(role, "employee:create") && <AddEmployeeButton departments={departments} />}
        </div>
      </div>

      <form className="mb-4" action="/employees" method="get">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search by name or employee code..."
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Job Title</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{e.employeeCode}</td>
                <td className="px-4 py-3">
                  <Link href={`/employees/${e.id}`} className="text-brand-600 hover:underline font-medium">
                    {e.firstName} {e.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3">{e.jobTitle}</td>
                <td className="px-4 py-3">{e.department?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      e.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            Page {page} of {totalPages} · {total} employee{total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Link
              href={`/employees?page=${Math.max(1, page - 1)}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
              className={`px-3 py-1.5 rounded-lg border border-gray-300 ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-gray-50"}`}
            >
              Previous
            </Link>
            <Link
              href={`/employees?page=${Math.min(totalPages, page + 1)}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
              className={`px-3 py-1.5 rounded-lg border border-gray-300 ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-gray-50"}`}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
