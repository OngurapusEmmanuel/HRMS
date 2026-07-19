import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "EXPIRED"]).optional(),
  proposedSalary: z.number().positive().optional(),
  startDate: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "recruitment:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = (session.user as any).organizationId;
  const existing = await prisma.offer.findFirst({ where: { id: params.id, organizationId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { startDate, status, ...rest } = parsed.data;

  const updated = await prisma.offer.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(status ? { status, respondedAt: status !== "PENDING" ? new Date() : existing.respondedAt } : {}),
      ...(startDate ? { startDate: new Date(startDate) } : {}),
    },
  });

  if (status) {
    logAudit({
      organizationId,
      actorUserId: (session.user as any).id,
      actorEmail: session.user.email ?? "",
      action: "offer.status_change",
      targetType: "Offer",
      targetId: params.id,
      metadata: { status },
    });
  }

  return NextResponse.json(updated);
}
