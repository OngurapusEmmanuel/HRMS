import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { notify } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  interviewerId: z.string().min(1),
  scheduledAt: z.string().min(1),
});

// POST /api/applications/:id/interviews — schedule an interview and bump
// the application to the INTERVIEW stage if it hasn't reached there yet.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "recruitment:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = (session.user as any).organizationId;
  const application = await prisma.application.findFirst({
    where: { id: params.id, organizationId },
    include: { candidate: true },
  });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const interviewer = await prisma.employee.findFirst({
    where: { id: parsed.data.interviewerId, organizationId },
    select: { id: true, user: { select: { id: true } } },
  });
  if (!interviewer) return NextResponse.json({ error: "Interviewer not found" }, { status: 400 });

  const [interview] = await prisma.$transaction([
    prisma.interview.create({
      data: {
        applicationId: params.id,
        organizationId,
        interviewerId: parsed.data.interviewerId,
        scheduledAt: new Date(parsed.data.scheduledAt),
      },
    }),
    ...(application.stage === "APPLIED" || application.stage === "SCREENING"
      ? [prisma.application.update({ where: { id: params.id }, data: { stage: "INTERVIEW" } })]
      : []),
  ]);

  notify({
    userId: interviewer.user.id,
    organizationId,
    type: "INTERVIEW_SCHEDULED",
    title: `Interview scheduled with ${application.candidate.firstName} ${application.candidate.lastName}`,
    body: new Date(parsed.data.scheduledAt).toLocaleString(),
    link: `/recruitment/applications/${params.id}`,
  });

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "interview.schedule",
    targetType: "Interview",
    targetId: interview.id,
    metadata: { applicationId: params.id },
  });

  return NextResponse.json(interview, { status: 201 });
}
