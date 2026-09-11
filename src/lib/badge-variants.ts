// Maps each Prisma enum value to a <Badge variant>. Keeps status-color decisions
// in one place instead of a Record<string,string> re-declared in every component.

export type BadgeVariant = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

export const employeeStatusVariant: Record<string, BadgeVariant> = {
  ACTIVE: "success",
  ON_LEAVE: "warning",
  SUSPENDED: "danger",
  TERMINATED: "neutral",
};

export const leaveStatusVariant: Record<string, BadgeVariant> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

export const jobPostingStatusVariant: Record<string, BadgeVariant> = {
  DRAFT: "neutral",
  OPEN: "success",
  CLOSED: "danger",
};

export const applicationStageVariant: Record<string, BadgeVariant> = {
  APPLIED: "neutral",
  SCREENING: "info",
  INTERVIEW: "warning",
  OFFER: "primary",
  HIRED: "success",
  REJECTED: "danger",
};

export const interviewOutcomeVariant: Record<string, BadgeVariant> = {
  PENDING: "neutral",
  PASS: "success",
  FAIL: "danger",
};

export const meetingStatusVariant: Record<string, BadgeVariant> = {
  SCHEDULED: "info",
  COMPLETED: "success",
  CANCELLED: "neutral",
};

export const kpiStatusVariant: Record<string, BadgeVariant> = {
  NOT_STARTED: "neutral",
  ON_TRACK: "success",
  AT_RISK: "warning",
  OFF_TRACK: "danger",
  COMPLETED: "info",
  CANCELLED: "neutral",
};

export const documentTypeVariant: Record<string, BadgeVariant> = {
  CONTRACT: "primary",
  POLICY: "info",
  IDENTITY: "warning",
  CERTIFICATE: "success",
  OTHER: "neutral",
};

export const complianceStatusVariant: Record<string, BadgeVariant> = {
  UPCOMING: "info",
  COMPLETE: "success",
  OVERDUE: "danger",
};

export const trainingStatusVariant: Record<string, BadgeVariant> = {
  NOT_STARTED: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  OVERDUE: "danger",
};

export const courseCategoryVariant: Record<string, BadgeVariant> = {
  COMPLIANCE: "danger",
  SKILLS: "info",
  CAREER: "primary",
};

export const contractRecommendationVariant: Record<string, BadgeVariant> = {
  RENEW: "success",
  PROMOTE: "info",
  EXTEND_PROBATION: "warning",
  DO_NOT_RENEW: "danger",
};

export const offerStatusVariant: Record<string, BadgeVariant> = {
  PENDING: "warning",
  ACCEPTED: "success",
  DECLINED: "danger",
  EXPIRED: "neutral",
};

export const appraisalCycleStatusVariant: Record<string, BadgeVariant> = {
  ACTIVE: "success",
  CLOSED: "neutral",
};

export const attendanceStatusVariant: Record<string, BadgeVariant> = {
  PRESENT: "success",
  LATE: "warning",
  ABSENT: "danger",
  HALF_DAY: "info",
  ON_LEAVE: "neutral",
};

export function providerConnectionVariant(connected: boolean): BadgeVariant {
  return connected ? "success" : "warning";
}

export function feedbackSubmittedVariant(submitted: boolean): BadgeVariant {
  return submitted ? "success" : "neutral";
}

// Numeric 1-5 appraisal rating -> Badge variant. Not enum-based like the
// Record maps above, but centralized here so the appraisals list/detail/page
// views (which all render the same rating chip) share one threshold definition.
export function ratingVariant(rating: number): BadgeVariant {
  if (rating >= 4) return "success";
  if (rating >= 3) return "warning";
  return "danger";
}
