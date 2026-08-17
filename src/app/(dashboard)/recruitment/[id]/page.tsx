import { notFound } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import AddCandidateButton from "@/components/recruitment/AddCandidateButton";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { jobPostingStatusVariant, applicationStageVariant } from "@/lib/badge-variants";

export default async function JobPostingDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;

  const posting = await prisma.jobPosting.findFirst({
    where: { id: params.id, organizationId },
    include: {
      department: true,
      applications: {
        include: { candidate: true, _count: { select: { interviews: true } }, offer: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!posting) notFound();

  return (
    <div>
      <PageHeader
        title={posting.title}
        description={`${posting.department?.name ?? "No department"} · ${posting.status}`}
        breadcrumb={[{ label: "Recruitment", href: "/recruitment" }, { label: posting.title }]}
        actions={can(role, "recruitment:manage") && <AddCandidateButton jobPostingId={posting.id} />}
      />

      <Card className="mb-6">
        <CardContent className="whitespace-pre-wrap text-sm text-secondary">{posting.description}</CardContent>
      </Card>

      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">Pipeline</h2>
        <Badge variant={jobPostingStatusVariant[posting.status] ?? "neutral"}>{posting.status}</Badge>
      </div>
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Interviews</TableHead>
              <TableHead>Offer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posting.applications.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link href={`/recruitment/applications/${a.id}`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                    {a.candidate.firstName} {a.candidate.lastName}
                  </Link>
                  <p className="text-xs text-muted">{a.candidate.email}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={applicationStageVariant[a.stage] ?? "neutral"}>{a.stage}</Badge>
                </TableCell>
                <TableCell className="text-secondary">{a._count.interviews}</TableCell>
                <TableCell className="text-secondary">{a.offer ? a.offer.status : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {posting.applications.length === 0 && (
          <EmptyState icon={<Users className="h-8 w-8" />} title="No candidates yet" description="Add a candidate to start the pipeline." />
        )}
      </TableContainer>
    </div>
  );
}
