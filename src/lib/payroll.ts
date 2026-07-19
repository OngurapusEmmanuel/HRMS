import { prisma } from "./db";

// A progressive tax-bracket engine. Brackets are per-organization and live
// in the TaxBracket table (editable from /settings) rather than hardcoded,
// so different orgs/jurisdictions can run different schedules without a
// code change.
export type Bracket = { upTo: number | null; rate: number }; // upTo: null for the uncapped top bracket

// Fallback schedule used only the first time an organization generates
// payroll with no TaxBracket rows configured yet — seeded into the DB at
// that point so it becomes the organization's editable baseline rather than
// silently re-applying on every run.
export const DEFAULT_BRACKETS: Bracket[] = [
  { upTo: 24_000, rate: 0.10 },
  { upTo: 32_333, rate: 0.25 },
  { upTo: 500_000, rate: 0.30 },
  { upTo: 800_000, rate: 0.325 },
  { upTo: null, rate: 0.35 },
];

export async function getTaxBrackets(organizationId: string): Promise<Bracket[]> {
  const rows = await prisma.taxBracket.findMany({
    where: { organizationId },
    orderBy: { order: "asc" },
  });
  if (rows.length === 0) {
    await prisma.taxBracket.createMany({
      data: DEFAULT_BRACKETS.map((b, i) => ({
        organizationId,
        upTo: b.upTo,
        rate: b.rate,
        order: i,
      })),
    });
    return DEFAULT_BRACKETS;
  }
  return rows.map((r) => ({ upTo: r.upTo === null ? null : Number(r.upTo), rate: Number(r.rate) }));
}

function annualTax(annualIncome: number, brackets: Bracket[]): number {
  let remaining = annualIncome;
  let lastThreshold = 0;
  let tax = 0;

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const upTo = bracket.upTo ?? Infinity;
    const bandSize = upTo - lastThreshold;
    const taxableInBand = Math.min(remaining, bandSize);
    tax += taxableInBand * bracket.rate;
    remaining -= taxableInBand;
    lastThreshold = upTo;
  }
  return tax;
}

// Computes the monthly deduction for a given monthly gross pay by
// annualizing the calculation (gross * 12), so a mid-year raise or a
// partial-month gross doesn't distort the bracket the person falls into.
export function monthlyDeduction(monthlyGross: number, brackets: Bracket[]): number {
  const annualGross = monthlyGross * 12;
  return annualTax(annualGross, brackets) / 12;
}

export function payslipFromSalary(annualBaseSalary: number, brackets: Bracket[]) {
  const gross = annualBaseSalary / 12;
  const deductions = monthlyDeduction(gross, brackets);
  return { gross, deductions, net: gross - deductions };
}
