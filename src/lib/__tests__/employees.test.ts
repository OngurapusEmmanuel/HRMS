import { describe, it, expect } from "vitest";
import { computeProfileCompleteness } from "../employees";

const complete = {
  phone: "+1-555-0100",
  departmentId: "dept-1",
  reportsToId: "emp-1",
  documentCount: 2,
  onboardingTasks: [{ completed: true }, { completed: true }],
  appraisalCount: 1,
};

describe("computeProfileCompleteness", () => {
  it("returns 100% and no missing fields when every check passes", () => {
    const result = computeProfileCompleteness(complete);
    expect(result.percent).toBe(100);
    expect(result.missing).toEqual([]);
  });

  it("flags missing phone, department, and manager, with the right percent", () => {
    const result = computeProfileCompleteness({
      ...complete,
      phone: null,
      departmentId: null,
      reportsToId: null,
    });
    expect(result.missing).toEqual(
      expect.arrayContaining(["phone number", "department assignment", "reporting manager"])
    );
    // 3 of 6 checks pass (documents, appraisal, onboarding) -> 50%
    expect(result.percent).toBe(50);
  });

  it("does not penalize an employee with zero onboarding tasks assigned", () => {
    const result = computeProfileCompleteness({ ...complete, onboardingTasks: [] });
    expect(result.missing).not.toContain("onboarding checklist completion");
    expect(result.percent).toBe(100);
  });

  it("flags an incomplete onboarding checklist", () => {
    const result = computeProfileCompleteness({
      ...complete,
      onboardingTasks: [{ completed: true }, { completed: false }],
    });
    expect(result.missing).toContain("onboarding checklist completion");
  });

  it("flags missing documents and appraisals", () => {
    const result = computeProfileCompleteness({ ...complete, documentCount: 0, appraisalCount: 0 });
    expect(result.missing).toEqual(
      expect.arrayContaining(["an uploaded document", "a completed appraisal"])
    );
  });
});
