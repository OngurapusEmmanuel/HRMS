import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "settings:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const policies = await prisma.leavePolicy.findMany({
    where: { organizationId: (session.user as any).organizationId },
    orderBy: { type: "asc" },
  });
  return NextResponse.json(policies);
}

const schema = z.object({
  type: z.enum(["ANNUAL", "SICK", "UNPAID", "MATERNITY", "PATERNITY", "OTHER"]),
  annualDays: z.number().int().min(0).max(365),
});

// PUT /api/settings/leave-policies — upsert the entitlement for one leave
// type. Upsert rather than a full-list replace since types are independent
// of each other and the UI edits them one at a time.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "settings:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const organizationId = (session.user as any).organizationId;
  const policy = await prisma.leavePolicy.upsert({
    where: { organizationId_type: { organizationId, type: parsed.data.type } },
    create: { organizationId, type: parsed.data.type, annualDays: parsed.data.annualDays },
    update: { annualDays: parsed.data.annualDays },
  });

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "settings.leave_policy_update",
    targetType: "LeavePolicy",
    targetId: policy.id,
    metadata: { type: parsed.data.type, annualDays: parsed.data.annualDays },
  });

  return NextResponse.json(policy);
}
