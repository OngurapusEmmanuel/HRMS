import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ScrollText } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

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
      <PageHeader
        title="Audit Log"
        description="Last 100 sensitive actions across the organization."
      />

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-secondary">
                  {log.createdAt.toLocaleString()}
                </TableCell>
                <TableCell>{log.actorEmail}</TableCell>
                <TableCell>{describe(log.action)}</TableCell>
                <TableCell className="text-secondary">
                  {log.targetType}
                  {log.targetId ? ` · ${log.targetId.slice(0, 8)}…` : ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {logs.length === 0 && (
          <EmptyState
            icon={<ScrollText className="h-8 w-8" />}
            title="No activity recorded yet"
          />
        )}
      </TableContainer>
    </div>
  );
}
