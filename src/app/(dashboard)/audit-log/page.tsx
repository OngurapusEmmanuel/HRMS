import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";

function describe(action: string) {
  const labels: Record<string, string> = {
    "employee.create": "created employee",
    "employee.update": "updated employee",
    "employee.terminate": "terminated employee",
    "leave.approve": "approved leave request",
    "leave.reject": "rejected leave request",
    "payroll.generate": "generated payroll",
    "payroll.export": "exported payroll CSV",
  };
  return labels[action] ?? action;
}

export default async function AuditLogPage() {
  const session = await getServerSession(authOptions);
  const role = (session!.user as any).role;
  if (!can(role, "audit:view")) redirect("/dashboard");

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: (session!.user as any).organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Audit Log</h1>
      <p className="text-sm text-gray-500 mb-6">Last 100 sensitive actions across the organization.</p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {log.createdAt.toLocaleString()}
                </td>
                <td className="px-4 py-3">{log.actorEmail}</td>
                <td className="px-4 py-3">{describe(log.action)}</td>
                <td className="px-4 py-3 text-gray-500">
                  {log.targetType}
                  {log.targetId ? ` · ${log.targetId.slice(0, 8)}…` : ""}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No activity recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
