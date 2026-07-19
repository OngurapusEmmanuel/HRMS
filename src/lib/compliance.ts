import { prisma } from "./db";
import { ComplianceFrequency } from "@prisma/client";

// Lazily flips stale UPCOMING records to OVERDUE at read time — same
// pattern as lib/learning.ts's reconcileOverdueEnrollments, no cron needed.
export async function reconcileOverdueRecords(organizationId: string) {
  await prisma.complianceRecord.updateMany({
    where: { organizationId, status: "UPCOMING", dueDate: { lt: new Date() } },
    data: { status: "OVERDUE" },
  });
}

function advance(date: Date, frequency: ComplianceFrequency): Date | null {
  const next = new Date(date);
  switch (frequency) {
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      return next;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      return next;
    case "ANNUAL":
      next.setFullYear(next.getFullYear() + 1);
      return next;
    case "ONE_TIME":
      return null;
  }
}

// Marks a compliance record COMPLETE and, for recurring requirements,
// creates the next occurrence and advances the requirement's nextDueDate —
// so the requirement always has exactly one open (non-COMPLETE) record.
export async function completeRecord(recordId: string, completedById: string, notes?: string) {
  const record = await prisma.complianceRecord.findUniqueOrThrow({
    where: { id: recordId },
    include: { requirement: true },
  });

  const [updated] = await prisma.$transaction([
    prisma.complianceRecord.update({
      where: { id: recordId },
      data: { status: "COMPLETE", completedAt: new Date(), completedById, notes },
    }),
    ...(() => {
      const nextDue = advance(record.dueDate, record.requirement.frequency);
      if (!nextDue) return [];
      return [
        prisma.complianceRecord.create({
          data: {
            requirementId: record.requirementId,
            organizationId: record.organizationId,
            dueDate: nextDue,
            status: nextDue < new Date() ? "OVERDUE" : "UPCOMING",
          },
        }),
        prisma.complianceRequirement.update({
          where: { id: record.requirementId },
          data: { nextDueDate: nextDue },
        }),
      ];
    })(),
  ]);

  return updated;
}
