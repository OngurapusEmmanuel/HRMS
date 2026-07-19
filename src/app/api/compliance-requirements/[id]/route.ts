import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  jurisdiction: z.string().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "compliance:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = (session.user as any).organizationId;
  const existing = await prisma.complianceRequirement.findFirst({ where: { id: params.id, organizationId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.complianceRequirement.update({ where: { id: params.id }, data: parsed.data });

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "compliance_requirement.update",
    targetType: "ComplianceRequirement",
    targetId: params.id,
    metadata: { changes: parsed.data },
  });

  return NextResponse.json(updated);
}
