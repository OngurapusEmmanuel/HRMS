import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { managedDepartmentIds } from "@/lib/rbac";
import AttendanceActions from "@/components/AttendanceActions";

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Attendance — Today</h1>
        {role === "EMPLOYEE" && <AttendanceActions />}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Check In</th>
              <th className="px-4 py-3 font-medium">Check Out</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">{r.employee.firstName} {r.employee.lastName}</td>
                <td className="px-4 py-3 text-gray-500">{r.checkIn ? r.checkIn.toLocaleTimeString() : "—"}</td>
                <td className="px-4 py-3 text-gray-500">{r.checkOut ? r.checkOut.toLocaleTimeString() : "—"}</td>
                <td className="px-4 py-3">{r.status}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No attendance records for today.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
