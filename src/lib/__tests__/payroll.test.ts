import { describe, it, expect } from "vitest";
import { monthlyDeduction, payslipFromSalary, DEFAULT_BRACKETS, Bracket } from "../payroll";

describe("payroll: progressive tax brackets", () => {
  it("taxes income entirely within the first bracket at that bracket's rate", () => {
    const brackets: Bracket[] = [{ upTo: 24_000, rate: 0.10 }, { upTo: null, rate: 0.35 }];
    const monthlyGross = 1_000; // 12,000/yr — fully inside the first bracket
    const deduction = monthlyDeduction(monthlyGross, brackets);
    // 12,000 * 0.10 / 12 = 100
    expect(deduction).toBeCloseTo(100, 5);
  });

  it("applies marginal rates across multiple bands, not the top rate to the whole amount", () => {
    const brackets: Bracket[] = [
      { upTo: 10_000, rate: 0.10 },
      { upTo: 20_000, rate: 0.20 },
      { upTo: null, rate: 0.30 },
    ];
    // Annual gross = 15,000: 10,000 @ 10% + 5,000 @ 20% = 1,000 + 1,000 = 2,000
    const monthlyGross = 15_000 / 12;
    const deduction = monthlyDeduction(monthlyGross, brackets);
    expect(deduction).toBeCloseTo(2_000 / 12, 5);
  });

  it("never applies the top marginal rate to income below its threshold (no cliff effect)", () => {
    const brackets: Bracket[] = [
      { upTo: 10_000, rate: 0.10 },
      { upTo: null, rate: 0.90 },
    ];
    // Someone earning exactly at the threshold should pay only the low rate.
    const deduction = monthlyDeduction(10_000 / 12, brackets);
    expect(deduction).toBeCloseTo(1_000 / 12, 5);
  });

  it("matches a hand-computed total against the default bracket schedule", () => {
    // Annual gross = 100,000 against DEFAULT_BRACKETS:
    // 24,000 @ 10%  = 2,400
    //  8,333 @ 25%  = 2,083.25   (32,333 - 24,000)
    // 67,667 @ 30%  = 20,300.10  (100,000 - 32,333)
    const expectedAnnualTax = 2_400 + 8_333 * 0.25 + 67_667 * 0.30;
    const monthlyGross = 100_000 / 12;
    const deduction = monthlyDeduction(monthlyGross, DEFAULT_BRACKETS);
    expect(deduction * 12).toBeCloseTo(expectedAnnualTax, 1);
  });

  it("payslipFromSalary returns gross - deductions = net", () => {
    const { gross, deductions, net } = payslipFromSalary(120_000, DEFAULT_BRACKETS);
    expect(net).toBeCloseTo(gross - deductions, 6);
    expect(gross).toBeCloseTo(10_000, 6); // 120,000 / 12
  });

  it("handles zero income without throwing or going negative", () => {
    const deduction = monthlyDeduction(0, DEFAULT_BRACKETS);
    expect(deduction).toBe(0);
  });
});
