import { z } from "zod";

// Validated once at import time, so a missing/malformed env var fails fast
// at boot with a clear message instead of surfacing wherever it's first
// read at runtime (mid-request, often as a confusing downstream error).
// Import this module early — src/lib/db.ts does, and it's imported by
// virtually every server-side code path in the app.
const schema = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),
    NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
    NEXTAUTH_SECRET: z.string().min(16, "NEXTAUTH_SECRET must be at least 16 characters"),
    STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),
    S3_PUBLIC_URL_BASE: z.string().optional(),
    EMAIL_PROVIDER: z.enum(["console", "resend", "ses"]).default("console"),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    CRON_SECRET: z.string().optional(),
    LOW_BALANCE_THRESHOLD_DAYS: z.coerce.number().int().positive().default(2),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  })
  .superRefine((vars, ctx) => {
    if (vars.STORAGE_PROVIDER === "s3" && !vars.S3_BUCKET) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["S3_BUCKET"], message: "S3_BUCKET is required when STORAGE_PROVIDER=s3" });
    }
    if (vars.EMAIL_PROVIDER === "resend" && !vars.RESEND_API_KEY) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["RESEND_API_KEY"], message: "RESEND_API_KEY is required when EMAIL_PROVIDER=resend" });
    }
    if (vars.NODE_ENV === "production" && !vars.CRON_SECRET) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["CRON_SECRET"], message: "CRON_SECRET is required in production — the leave-reminders cron route rejects all requests without it" });
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}\n\nCheck .env against .env.example.`);
}

export const env = parsed.data;
