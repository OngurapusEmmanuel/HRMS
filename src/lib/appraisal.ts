import { prisma } from "./db";
import { ContractRecommendation } from "@prisma/client";

// Fixed set of scoring criteria for now — every appraisal is scored 1-5 on
// each of these. Move to a per-organization editable list (same pattern as
// lib/onboarding.ts's template) if different roles/departments need
// different criteria later; kept as a constant for the MVP since scores are
// stored as JSON keyed by criterion name, so adding an editable template
// wouldn't require a data migration, just a new settings surface.
export const APPRAISAL_CRITERIA = [
  "Communication",
  "Technical Skills",
  "Teamwork",
  "Punctuality",
  "Initiative",
] as const;

export type AppraisalScores = Record<string, number>;

export function computeOverallRating(scores: AppraisalScores): number {
  const values = Object.values(scores);
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100) / 100; // 2 decimal places
}

export function recommendationFromAverage(average: number | null): ContractRecommendation | null {
  if (average === null) return null;
  if (average >= 4.5) return "PROMOTE";
  if (average >= 3.5) return "RENEW";
  if (average >= 2.5) return "EXTEND_PROBATION";
  return "DO_NOT_RENEW";
}

export function trendFromRatings(ratingsInOrder: number[]): string {
  if (ratingsInOrder.length < 2) return "Insufficient data";
  const first = ratingsInOrder[0];
  const last = ratingsInOrder[ratingsInOrder.length - 1];
  const delta = last - first;
  if (delta >= 0.5) return "Improving";
  if (delta <= -0.5) return "Declining";
  return "Stable";
}

// Pulls a short representative line out of free-text appraisal fields for
// the summary — not a real NLP summarizer, just "most recent non-empty
// entries, deduplicated, capped" so the rollup stays readable rather than
// concatenating years of review text verbatim.
function condenseText(entries: (string | null)[], maxItems = 3): string | null {
  const cleaned = entries
    .filter((e): e is string => Boolean(e && e.trim().length > 0))
    .map((e) => e.trim());
  if (cleaned.length === 0) return null;
  const unique = Array.from(new Set(cleaned));
  return unique.slice(-maxItems).join(" · ");
}

// Generates (or regenerates) the ContractSummary for an employee whose
// contract has ended, by rolling up every Appraisal on file for them.
// Called automatically on termination (see the employee DELETE route) and
// available as a manual HR/Admin action for fixed-term contracts that are
// ending without a termination event.
export async function generateContractSummary(
  employeeId: string,
  organizationId: string,
  generatedById: string | null
) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId },
    select: { hireDate: true, terminationDate: true, contractEndDate: true },
  });
  if (!employee) throw new Error("Employee not found");

  const appraisals = await prisma.appraisal.findMany({
    where: { employeeId },
    orderBy: { periodEnd: "asc" },
    select: { overallRating: true, strengths: true, areasForImprovement: true, periodEnd: true },
  });

  const ratings = appraisals.map((a) => Number(a.overallRating));
  const averageRating =
    ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100 : null;

  const periodEnd = employee.terminationDate ?? employee.contractEndDate ?? new Date();

  const summary = await prisma.contractSummary.upsert({
    where: { employeeId },
    create: {
      employeeId,
      organizationId,
      periodStart: employee.hireDate,
      periodEnd,
      totalAppraisals: appraisals.length,
      averageRating,
      ratingTrend: trendFromRatings(ratings),
      strengthsSummary: condenseText(appraisals.map((a) => a.strengths)),
      improvementAreas: condenseText(appraisals.map((a) => a.areasForImprovement)),
      recommendation: recommendationFromAverage(averageRating),
      generatedById,
    },
    update: {
      periodStart: employee.hireDate,
      periodEnd,
      totalAppraisals: appraisals.length,
      averageRating,
      ratingTrend: trendFromRatings(ratings),
      strengthsSummary: condenseText(appraisals.map((a) => a.strengths)),
      improvementAreas: condenseText(appraisals.map((a) => a.areasForImprovement)),
      recommendation: recommendationFromAverage(averageRating),
      generatedById,
      generatedAt: new Date(),
    },
  });

  return summary;
}
