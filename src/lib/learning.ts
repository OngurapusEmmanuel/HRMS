import { prisma } from "./db";

// Lazily flips stale enrollments to OVERDUE at read time rather than
// requiring a cron job — any GET that lists enrollments calls this first,
// so the status is always accurate as of "now" without background jobs.
export async function reconcileOverdueEnrollments(organizationId: string) {
  await prisma.trainingEnrollment.updateMany({
    where: {
      employee: { organizationId },
      status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
      dueDate: { lt: new Date() },
    },
    data: { status: "OVERDUE" },
  });
}
