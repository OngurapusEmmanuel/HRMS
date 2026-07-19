import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT = 5; // requests
const RATE_WINDOW_MS = 15 * 60 * 1000; // per 15 minutes, per IP+email pair

// POST /api/auth/forgot-password — always responds success regardless of
// whether the email exists, so this endpoint can't be used to enumerate
// registered accounts. Rate-limited per IP+email so it can't be used to
// spam an inbox with reset emails either (see caveats in lib/rate-limit.ts).
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const key = `forgot-password:${clientIp(req)}:${parsed.data.email}`;
  const { allowed } = rateLimit(key, RATE_LIMIT, RATE_WINDOW_MS);
  if (!allowed) {
    // Same generic response as success — don't leak that rate limiting
    // exists or reveal timing that could aid enumeration.
    return NextResponse.json({ success: true });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (user) {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
    const { subject, body } = passwordResetEmail(resetUrl);
    sendEmail({ to: user.email, subject, body }).catch((err) =>
      console.error("Failed to send password reset email:", err)
    );
  }

  return NextResponse.json({ success: true });
}
