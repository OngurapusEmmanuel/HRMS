/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ['*'] } },
  // Produces a minimal self-contained server bundle (.next/standalone) —
  // what the Dockerfile copies into the final image. Vercel ignores this
  // and uses its own build output, so it's safe to leave on for both targets.
  output: 'standalone',
};
module.exports = nextConfig;
