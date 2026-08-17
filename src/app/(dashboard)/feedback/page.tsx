import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import FeedbackTaskList from "@/components/performance/FeedbackTaskList";
import { PageHeader } from "@/components/ui/page-header";

export default async function MyFeedbackPage() {
  const session = await getServerSession(authOptions);
  const providerId = (session!.user as any).employeeId;
  const organizationId = (session!.user as any).organizationId;

  const requests = providerId
    ? await prisma.feedbackRequest.findMany({
        where: { providerId, organizationId },
        include: { employee: { select: { firstName: true, lastName: true } } },
        orderBy: [{ submitted: "asc" }, { createdAt: "desc" }],
      })
    : [];

  return (
    <div className="max-w-2xl">
      <PageHeader title="My Feedback Requests" description="Performance feedback you've been asked to give." />

      <FeedbackTaskList
        requests={requests.map((r) => ({
          id: r.id,
          employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
          relationship: r.relationship,
          submitted: r.submitted,
        }))}
      />
    </div>
  );
}
