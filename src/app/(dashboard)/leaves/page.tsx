import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import RequestLeaveButton from "@/components/RequestLeaveButton";
import LeaveActions from "@/components/LeaveActions";

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Leave Requests</h1>
        {can(role, "leave:request") && <RequestLeaveButton />}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3 font-medium">Days</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canApprove && <th className="px-4 py-3 font-medium">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{r.employee.firstName} {r.employee.lastName}</td>
                <td className="px-4 py-3">{r.type}</td>
                <td className="px-4 py-3 text-gray-500">
                  {r.startDate.toDateString()} – {r.endDate.toDateString()}
                </td>
                <td className="px-4 py-3">{r.daysCount}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.status === "APPROVED" ? "bg-green-100 text-green-700" :
                    r.status === "REJECTED" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>{r.status}</span>
                </td>
                {canApprove && (
                  <td className="px-4 py-3">
                    {r.status === "PENDING" && <LeaveActions leaveId={r.id} />}
                  </td>
                )}
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No leave requests.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
