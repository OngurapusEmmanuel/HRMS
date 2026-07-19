import { describe, it, expect, vi, afterEach } from "vitest";
import { rateLimit } from "../rate-limit";

describe("rateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit, then blocks", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
    }
    expect(rateLimit(key, 3, 60_000).allowed).toBe(false);
  });

  it("tracks separate keys independently", () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    expect(rateLimit(keyA, 1, 60_000).allowed).toBe(true);
    expect(rateLimit(keyA, 1, 60_000).allowed).toBe(false);
    // A different key should be unaffected by A's exhausted bucket.
    expect(rateLimit(keyB, 1, 60_000).allowed).toBe(true);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    const key = `test-reset-${Math.random()}`;
    expect(rateLimit(key, 1, 1_000).allowed).toBe(true);
    expect(rateLimit(key, 1, 1_000).allowed).toBe(false);

    vi.advanceTimersByTime(1_001);
    expect(rateLimit(key, 1, 1_000).allowed).toBe(true);
  });
});
