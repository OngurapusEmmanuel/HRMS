// Server Actions' CSRF protection checks the request's Origin header against
// this allowlist — a wildcard defeats that check entirely. Derive the real
// production origin from NEXTAUTH_URL (already required) instead of hardcoding
// a domain that would silently go stale on a new deployment.
function allowedOrigin() {
  try {
    return new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000").host;
  } catch {
    return "localhost:3000";
  }
}

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    // 'unsafe-inline'/'unsafe-eval' on script-src are required by Next.js's
    // own hydration/dev runtime without a nonce-based setup — still meaningfully
    // restricts everything else (no third-party scripts, no framing, no
    // cross-origin fetches beyond same-origin API routes).
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: [allowedOrigin()] } },
  // Produces a minimal self-contained server bundle (.next/standalone) —
  // what the Dockerfile copies into the final image. Vercel ignores this
  // and uses its own build output, so it's safe to leave on for both targets.
  output: 'standalone',
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
module.exports = nextConfig;
