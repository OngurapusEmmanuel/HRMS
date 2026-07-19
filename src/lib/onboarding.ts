import { prisma } from "./db";

// Fallback checklist used only the first time an organization needs one
// (either a new hire is created, or the Settings page is opened) with no
// OnboardingTaskTemplate rows configured yet — seeded into the DB at that
// point so it becomes the organization's editable baseline rather than
// silently re-applying on every hire.
export const DEFAULT_ONBOARDING_TASKS: { title: string; description?: string }[] = [
  { title: "Sign employment contract", description: "Countersigned copy on file with HR" },
  { title: "Complete tax & benefits forms" },
  { title: "IT account & equipment setup", description: "Email, laptop, access badges" },
  { title: "Meet with manager", description: "Intro 1:1 and first-week expectations" },
  { title: "Complete orientation training" },
];

export type OnboardingTemplateItem = { title: string; description: string | null; order: number };

// Returns the organization's onboarding template, seeding DEFAULT_ONBOARDING_TASKS
// on first call if none exist. Used both when assigning a checklist to a new
// hire and when rendering the editable template in Settings.
export async function getOnboardingTemplate(organizationId: string): Promise<OnboardingTemplateItem[]> {
  const rows = await prisma.onboardingTaskTemplate.findMany({
    where: { organizationId },
    orderBy: { order: "asc" },
  });
  if (rows.length === 0) {
    await prisma.onboardingTaskTemplate.createMany({
      data: DEFAULT_ONBOARDING_TASKS.map((t, i) => ({
        organizationId,
        title: t.title,
        description: t.description,
        order: i,
      })),
    });
    return DEFAULT_ONBOARDING_TASKS.map((t, i) => ({ title: t.title, description: t.description ?? null, order: i }));
  }
  return rows.map((r) => ({ title: r.title, description: r.description, order: r.order }));
}
