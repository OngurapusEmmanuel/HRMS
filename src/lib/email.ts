// Email abstraction with a provider switch, selected by EMAIL_PROVIDER:
//   - "console" (default): logs instead of sending — zero external deps,
//     safe default for local dev and CI.
//   - "resend": sends via Resend's HTTP API (RESEND_API_KEY required).
//   - "ses": sends via AWS SES (reuses the same AWS credentials env vars
//     as lib/storage.ts's S3 backend — SES_REGION defaults to S3_REGION).
//
// Every call site only depends on sendEmail()'s signature, so switching
// providers or adding a new one (Postmark, SendGrid, ...) is contained here.

type EmailPayload = { to: string; subject: string; body: string };

const PROVIDER = (process.env.EMAIL_PROVIDER ?? "console").toLowerCase();

async function sendViaResend({ to, subject, body }: EmailPayload) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "hr@example.com",
      to,
      subject,
      text: body,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend API returned ${res.status}: ${await res.text()}`);
  }
}

async function sendViaSes({ to, subject, body }: EmailPayload) {
  // Dynamically imported so the AWS SDK is never bundled/loaded when
  // running with the console or Resend providers.
  const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");
  const client = new SESClient({
    region: process.env.SES_REGION ?? process.env.S3_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });

  await client.send(
    new SendEmailCommand({
      Source: process.env.EMAIL_FROM ?? "hr@example.com",
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: { Text: { Data: body } },
      },
    })
  );
}

export async function sendEmail(payload: EmailPayload) {
  try {
    if (PROVIDER === "resend" && process.env.RESEND_API_KEY) {
      await sendViaResend(payload);
      return;
    }
    if (PROVIDER === "ses") {
      await sendViaSes(payload);
      return;
    }
  } catch (err) {
    console.error(`sendEmail via ${PROVIDER} failed, falling back to console log:`, err);
  }
  console.log(`[email:${PROVIDER === "console" ? "dev" : "fallback"}] to=${payload.to} subject="${payload.subject}"\n${payload.body}`);
}

export function emailStatus(): { provider: string; configured: boolean } {
  if (PROVIDER === "resend") return { provider: "resend", configured: Boolean(process.env.RESEND_API_KEY) };
  if (PROVIDER === "ses") {
    return {
      provider: "ses",
      configured: Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY),
    };
  }
  return { provider: "console", configured: true };
}

export function leaveDecisionEmail(status: "APPROVED" | "REJECTED", opts: {
  employeeName: string;
  type: string;
  startDate: Date;
  endDate: Date;
}) {
  const verb = status === "APPROVED" ? "approved" : "rejected";
  return {
    subject: `Your ${opts.type} leave request was ${verb}`,
    body: `Hi ${opts.employeeName},\n\nYour leave request from ${opts.startDate.toDateString()} to ${opts.endDate.toDateString()} has been ${verb}.\n\n— HR System`,
  };
}

export function passwordResetEmail(resetUrl: string) {
  return {
    subject: "Reset your HR System password",
    body: `We received a request to reset your password. This link expires in 1 hour and can only be used once:\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
  };
}

export function testEmail(triggeredBy: string) {
  return {
    subject: "HR System — test email",
    body: `This is a test email triggered by ${triggeredBy} from the Settings page. If you received this, your email provider is configured correctly.`,
  };
}
