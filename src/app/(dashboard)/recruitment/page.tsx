import Link from "next/link";
import { Briefcase } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import NewJobPostingButton from "@/components/recruitment/NewJobPostingButton";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { jobPostingStatusVariant } from "@/lib/badge-variants";

export default async function RecruitmentPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;

  const [postings, departments] = await Promise.all([
    prisma.jobPosting.findMany({
      where: { organizationId },
      include: { department: true, _count: { select: { applications: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.department.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Recruitment"
        description={`${postings.length} job posting${postings.length === 1 ? "" : "s"}.`}
        actions={can(role, "recruitment:manage") && <NewJobPostingButton departments={departments} />}
      />

      {postings.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Briefcase className="h-8 w-8" />}
            title="No job postings yet"
            description="Create a job posting to start building your candidate pipeline."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {postings.map((p) => (
            <Link key={p.id} href={`/recruitment/${p.id}`}>
              <Card className="p-5 transition-colors hover:border-primary-300">
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant={jobPostingStatusVariant[p.status] ?? "neutral"}>{p.status}</Badge>
                  <span className="text-xs text-muted">
                    {p._count.applications} applicant{p._count.applications === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="font-medium text-foreground">{p.title}</p>
                <p className="text-sm text-secondary">{p.department?.name ?? "No department"}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
