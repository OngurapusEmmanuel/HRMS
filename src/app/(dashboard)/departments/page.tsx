import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import AddDepartmentButton from "@/components/AddDepartmentButton";

export default async function DepartmentsPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;

  const departments = await prisma.department.findMany({
    where: { organizationId },
    include: { _count: { select: { employees: true } }, manager: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Departments</h1>
        {can(role, "department:manage") && <AddDepartmentButton />}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((d) => (
          <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="font-medium text-gray-900">{d.name}</p>
            <p className="text-sm text-gray-500 mt-1">{d._count.employees} employees</p>
            <p className="text-xs text-gray-400 mt-2">
              Manager: {d.manager ? `${d.manager.firstName} ${d.manager.lastName}` : "Unassigned"}
            </p>
          </div>
        ))}
        {departments.length === 0 && <p className="text-gray-400 text-sm">No departments yet.</p>}
      </div>
    </div>
  );
}
