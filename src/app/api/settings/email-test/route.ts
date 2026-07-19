import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { sendEmail, testEmail } from "@/lib/email";

// POST /api/settings/email-test — sends a test email to the current user so
// HR/Admin can verify provider configuration without needing DB/console access.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "settings:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { subject, body } = testEmail(session.user.email ?? "settings page");
  try {
    await sendEmail({ to: session.user.email ?? "", subject, body });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Test email failed:", err);
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }
}
