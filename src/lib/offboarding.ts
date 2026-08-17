import { prisma } from "./db";

// Mirrors DEFAULT_ONBOARDING_TASKS — the fallback checklist used the first
// time an organization needs one, seeded into the DB at that point so it
// becomes the organization's editable baseline rather than silently
// re-applying on every termination.
export const DEFAULT_OFFBOARDING_TASKS: { title: string; description?: string }[] = [
  { title: "Revoke system access", description: "Disable email, SSO, and internal tool accounts" },
  { title: "Collect company equipment", description: "Laptop, access badge, and any other issued hardware" },
  { title: "Final payroll processing", description: "Last payslip, outstanding leave payout" },
  { title: "Exit interview" },
  { title: "Reassign direct reports", description: "Only relevant if this employee managed others" },
];

export type OffboardingTemplateItem = { title: string; description: string | null; order: number };

// Returns the organization's offboarding template, seeding
// DEFAULT_OFFBOARDING_TASKS on first call if none exist. Used both when
// assigning a checklist on termination and when rendering the editable
// template in Settings.
export async function getOffboardingTemplate(organizationId: string): Promise<OffboardingTemplateItem[]> {
  const rows = await prisma.offboardingTaskTemplate.findMany({
    where: { organizationId },
    orderBy: { order: "asc" },
  });
  if (rows.length === 0) {
    await prisma.offboardingTaskTemplate.createMany({
      data: DEFAULT_OFFBOARDING_TASKS.map((t, i) => ({
        organizationId,
        title: t.title,
        description: t.description,
        order: i,
      })),
    });
    return DEFAULT_OFFBOARDING_TASKS.map((t, i) => ({ title: t.title, description: t.description ?? null, order: i }));
  }
  return rows.map((r) => ({ title: r.title, description: r.description, order: r.order }));
}

// Copies the org's offboarding template onto one employee's own
// OffboardingTask rows. Called from the employee-termination route right
// alongside its existing (also non-transactional, best-effort)
// generateContractSummary call — termination itself is a single
// prisma.employee.update, not a transaction, so this mirrors that style
// rather than taking a tx client.
export async function assignOffboardingChecklist(employeeId: string, organizationId: string) {
  const template = await getOffboardingTemplate(organizationId);
  await prisma.offboardingTask.createMany({
    data: template.map((t) => ({
      employeeId,
      title: t.title,
      description: t.description,
      order: t.order,
    })),
  });
}
