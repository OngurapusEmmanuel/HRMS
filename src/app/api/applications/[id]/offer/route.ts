import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { notifyRoles } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  proposedSalary: z.number().positive(),
  startDate: z.string().min(1),
});

// POST /api/applications/:id/offer — extends an offer and moves the
// application to the OFFER stage. One offer per application (schema-enforced
// via a unique applicationId) — to revise terms, update the existing offer
// via PATCH rather than creating a second one.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "recruitment:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = (session.user as any).organizationId;
  const application = await prisma.application.findFirst({
    where: { id: params.id, organizationId },
    include: { candidate: true, offer: true },
  });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (application.offer) return NextResponse.json({ error: "An offer already exists — update it instead" }, { status: 409 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [offer] = await prisma.$transaction([
    prisma.offer.create({
      data: {
        applicationId: params.id,
        organizationId,
        proposedSalary: parsed.data.proposedSalary,
        startDate: new Date(parsed.data.startDate),
        extendedById: (session.user as any).employeeId ?? "",
      },
    }),
    prisma.application.update({ where: { id: params.id }, data: { stage: "OFFER" } }),
  ]);

  notifyRoles({
    organizationId,
    roles: ["ADMIN", "HR"],
    type: "OFFER_EXTENDED",
    title: `Offer extended to ${application.candidate.firstName} ${application.candidate.lastName}`,
    link: `/recruitment/applications/${params.id}`,
  });

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "offer.extend",
    targetType: "Offer",
    targetId: offer.id,
    metadata: { applicationId: params.id, proposedSalary: parsed.data.proposedSalary },
  });

  return NextResponse.json(offer, { status: 201 });
}
