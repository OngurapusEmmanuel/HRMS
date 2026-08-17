import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  status: z.literal("CLOSED"),
});

// PATCH /api/appraisal-cycles/:id — one-way close. No reopening, no other
// field is editable here; ADMIN/HR only.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const role = (session.user as any).role;
  if (!can(role, "appraisal:cycle_manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = (session.user as any).organizationId;
  const existing = await prisma.appraisalCycle.findFirst({ where: { id: params.id, organizationId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.appraisalCycle.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
  });

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "appraisal_cycle.close",
    targetType: "AppraisalCycle",
    targetId: params.id,
  });

  return NextResponse.json(updated);
}
