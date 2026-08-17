import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Download } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { reconcileOverdueRecords } from "@/lib/compliance";
import NewRequirementButton from "@/components/compliance/NewRequirementButton";
import ComplianceList from "@/components/compliance/ComplianceList";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";

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
      <PageHeader
        title="Compliance"
        description="Statutory deadlines and labor law obligations tracked for your organization."
        actions={
          <>
            <a href="/api/compliance-requirements/export" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Download className="h-4 w-4" />
              Export CSV
            </a>
            <NewRequirementButton />
          </>
        }
      />

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
