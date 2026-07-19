import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import ApplicationDetail from "@/components/recruitment/ApplicationDetail";

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const organizationId = (session!.user as any).organizationId;
  const role = (session!.user as any).role;

  const [application, employees] = await Promise.all([
    prisma.application.findFirst({
      where: { id: params.id, organizationId },
      include: {
        candidate: true,
        jobPosting: { select: { id: true, title: true } },
        interviews: { include: { interviewer: { select: { firstName: true, lastName: true } } }, orderBy: { scheduledAt: "asc" } },
        offer: true,
      },
    }),
    prisma.employee.findMany({
      where: { organizationId, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);
  if (!application) notFound();

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-gray-500 mb-1">{application.jobPosting.title}</p>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">
        {application.candidate.firstName} {application.candidate.lastName}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {application.candidate.email}
        {application.candidate.phone ? ` · ${application.candidate.phone}` : ""}
        {application.candidate.source ? ` · via ${application.candidate.source}` : ""}
      </p>

      <ApplicationDetail
        applicationId={application.id}
        currentStage={application.stage}
        interviews={application.interviews.map((i) => ({ ...i, scheduledAt: i.scheduledAt.toISOString() }))}
        offer={
          application.offer
            ? {
                id: application.offer.id,
                proposedSalary: application.offer.proposedSalary.toString(),
                startDate: application.offer.startDate.toISOString(),
                status: application.offer.status,
              }
            : null
        }
        employees={employees}
        canManage={can(role, "recruitment:manage")}
        canHire={can(role, "employee:create")}
      />
    </div>
  );
}
