import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getAnalyticsSummary } from "@/lib/analytics";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "reports:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const months = Number(new URL(req.url).searchParams.get("months") ?? "12");
  const summary = await getAnalyticsSummary((session.user as any).organizationId, Math.min(24, Math.max(3, months)));
  return NextResponse.json(summary);
}
