import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { reconcileOverdueRecords } from "@/lib/compliance";
import NewRequirementButton from "@/components/compliance/NewRequirementButton";
import ComplianceList from "@/components/compliance/ComplianceList";

export default async function CompliancePage() {
  const session = await getServerSession(authOptions);
  const role = (session!.user as any).role;
  if (!can(role, "compliance:manage")) redirect("/dashboard");

  const organizationId = (session!.user as any).organizationId;
  await reconcileOverdueRecords(organizationId);

  const requirements = await prisma.complianceRequirement.findMany({
    where: { organizationId },
    include: { records: { orderBy: { dueDate: "desc" }, take: 1 } },
    orderBy: { nextDueDate: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold text-gray-900">Compliance</h1>
        <div className="flex items-center gap-3">
          <a href="/api/compliance-requirements/export" className="text-sm text-brand-600 hover:underline">Export CSV</a>
          <NewRequirementButton />
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">Statutory deadlines and labor law obligations tracked for your organization.</p>

      <ComplianceList
        initialRequirements={requirements.map((r) => ({
          id: r.id,
          title: r.title,
          jurisdiction: r.jurisdiction,
          frequency: r.frequency,
          nextDueDate: r.nextDueDate.toISOString(),
          currentRecord: r.records[0]
            ? { id: r.records[0].id, status: r.records[0].status, dueDate: r.records[0].dueDate.toISOString() }
            : null,
        }))}
      />
    </div>
  );
}
