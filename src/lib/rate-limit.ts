// Minimal in-memory fixed-window rate limiter. Deliberately simple:
//
// CAVEAT — this only works correctly on a single, persistent process. On
// serverless (Vercel) or any multi-instance deployment, each instance has
// its own memory, so the effective limit is (your limit) × (instance count)
// and resets whenever an instance recycles. That's an acceptable trade-off
// for an MVP guarding a low-value endpoint (forgot-password), but before
// relying on this for anything higher-stakes, swap it for a shared store —
// Upstash Redis (`@upstash/ratelimit`) is the standard choice on Vercel.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
