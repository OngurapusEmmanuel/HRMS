import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { emailStatus } from "@/lib/email";
import { storageStatus } from "@/lib/storage";

// GET /api/settings/status — reports which providers are active/configured
// without exposing any secret values, just booleans for the Settings page.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "settings:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ email: emailStatus(), storage: storageStatus() });
}
