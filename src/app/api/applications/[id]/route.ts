import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { notifyRoles } from "@/lib/notifications";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "recruitment:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const application = await prisma.application.findFirst({
    where: { id: params.id, organizationId: (session.user as any).organizationId },
    include: {
      candidate: true,
      jobPosting: { select: { id: true, title: true } },
      interviews: { include: { interviewer: { select: { firstName: true, lastName: true } } }, orderBy: { scheduledAt: "asc" } },
      offer: true,
    },
  });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(application);
}

const schema = z.object({
  stage: z.enum(["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]).optional(),
  notes: z.string().optional(),
});

// PATCH /api/applications/:id — move a candidate through the pipeline.
// Moving to HIRED directly isn't allowed here — that's only ever set by
// POST /api/applications/:id/hire, which also does the employee conversion.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "recruitment:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = (session.user as any).organizationId;
  const existing = await prisma.application.findFirst({
    where: { id: params.id, organizationId },
    include: { candidate: true, jobPosting: { select: { title: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.stage === "HIRED") {
    return NextResponse.json({ error: "Use POST /api/applications/:id/hire to mark a candidate as hired" }, { status: 400 });
  }

  const updated = await prisma.application.update({
    where: { id: params.id },
    data: parsed.data,
  });

  if (parsed.data.stage && parsed.data.stage !== existing.stage) {
    logAudit({
      organizationId,
      actorUserId: (session.user as any).id,
      actorEmail: session.user.email ?? "",
      action: "application.stage_change",
      targetType: "Application",
      targetId: params.id,
      metadata: { from: existing.stage, to: parsed.data.stage },
    });
    notifyRoles({
      organizationId,
      roles: ["ADMIN", "HR"],
      type: "APPLICATION_STAGE_CHANGED",
      title: `${existing.candidate.firstName} ${existing.candidate.lastName} moved to ${parsed.data.stage}`,
      body: existing.jobPosting.title,
      link: `/recruitment/applications/${params.id}`,
    });
  }

  return NextResponse.json(updated);
}
