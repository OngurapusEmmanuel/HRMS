// Pure, read-time profile-completeness calculation — no stored field, no
// cron. Computed from data the caller already has on hand (matches this
// app's general "lazy reconciliation" style used for training/compliance
// status elsewhere).

export type ProfileCompletenessInput = {
  phone: string | null;
  departmentId: string | null;
  reportsToId: string | null;
  documentCount: number;
  onboardingTasks: { completed: boolean }[];
  appraisalCount: number;
};

export type ProfileCompleteness = {
  percent: number;
  missing: string[];
};

export function computeProfileCompleteness(employee: ProfileCompletenessInput): ProfileCompleteness {
  const checks: { done: boolean; label: string }[] = [
    { done: !!employee.phone, label: "phone number" },
    { done: !!employee.departmentId, label: "department assignment" },
    { done: !!employee.reportsToId, label: "reporting manager" },
    { done: employee.documentCount > 0, label: "an uploaded document" },
    { done: employee.appraisalCount > 0, label: "a completed appraisal" },
  ];

  // Onboarding is only a meaningful check if the employee actually has a
  // checklist — an employee with zero tasks (e.g. seeded before onboarding
  // existed) shouldn't be penalized for something that was never assigned.
  if (employee.onboardingTasks.length > 0) {
    checks.push({
      done: employee.onboardingTasks.every((t) => t.completed),
      label: "onboarding checklist completion",
    });
  }

  const doneCount = checks.filter((c) => c.done).length;
  const percent = Math.round((doneCount / checks.length) * 100);
  const missing = checks.filter((c) => !c.done).map((c) => c.label);

  return { percent, missing };
}
