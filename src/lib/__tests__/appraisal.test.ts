import { describe, it, expect } from "vitest";
import { computeOverallRating, recommendationFromAverage, trendFromRatings } from "../appraisal";

describe("appraisal: computeOverallRating", () => {
  it("averages the given scores", () => {
    expect(computeOverallRating({ a: 4, b: 2 })).toBe(3);
  });

  it("rounds to 2 decimal places", () => {
    expect(computeOverallRating({ a: 5, b: 4, c: 4 })).toBeCloseTo(4.33, 2);
  });

  it("returns 0 for an empty scores object rather than NaN", () => {
    expect(computeOverallRating({})).toBe(0);
  });
});

describe("appraisal: recommendationFromAverage", () => {
  it("recommends PROMOTE for very high averages", () => {
    expect(recommendationFromAverage(4.7)).toBe("PROMOTE");
  });

  it("recommends RENEW for solid-but-not-exceptional averages", () => {
    expect(recommendationFromAverage(3.8)).toBe("RENEW");
  });

  it("recommends EXTEND_PROBATION for middling averages", () => {
    expect(recommendationFromAverage(3.0)).toBe("EXTEND_PROBATION");
  });

  it("recommends DO_NOT_RENEW for low averages", () => {
    expect(recommendationFromAverage(1.5)).toBe("DO_NOT_RENEW");
  });

  it("returns null when there's no average to base a recommendation on", () => {
    expect(recommendationFromAverage(null)).toBeNull();
  });
});

describe("appraisal: trendFromRatings", () => {
  it("reports insufficient data with fewer than two ratings", () => {
    expect(trendFromRatings([])).toBe("Insufficient data");
    expect(trendFromRatings([4])).toBe("Insufficient data");
  });

  it("reports Improving when the most recent rating is meaningfully higher than the first", () => {
    expect(trendFromRatings([2, 3, 4])).toBe("Improving");
  });

  it("reports Declining when the most recent rating is meaningfully lower than the first", () => {
    expect(trendFromRatings([4.5, 3.5, 3])).toBe("Declining");
  });

  it("reports Stable when the change is within the noise threshold", () => {
    expect(trendFromRatings([3.5, 3.6, 3.7])).toBe("Stable");
  });
});
