import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  resumeUrl: z.string().optional(),
  source: z.string().optional(),
});

// POST /api/job-postings/:id/applications — logs a candidate into this
// posting's pipeline. Reuses an existing Candidate by email within the org
// if one exists (the same person applying to a second role shouldn't create
// a duplicate candidate record), otherwise creates one.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "recruitment:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = (session.user as any).organizationId;
  const posting = await prisma.jobPosting.findFirst({ where: { id: params.id, organizationId } });
  if (!posting) return NextResponse.json({ error: "Job posting not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { firstName, lastName, email, phone, resumeUrl, source } = parsed.data;

  const candidate = await prisma.candidate.upsert({
    where: { organizationId_email: { organizationId, email } },
    create: { organizationId, firstName, lastName, email, phone, resumeUrl, source },
    update: { firstName, lastName, phone: phone ?? undefined, resumeUrl: resumeUrl ?? undefined },
  });

  const existingApplication = await prisma.application.findFirst({
    where: { candidateId: candidate.id, jobPostingId: params.id },
  });
  if (existingApplication) {
    return NextResponse.json({ error: "This candidate has already applied to this posting" }, { status: 409 });
  }

  const application = await prisma.application.create({
    data: { organizationId, candidateId: candidate.id, jobPostingId: params.id },
    include: { candidate: true },
  });

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "application.create",
    targetType: "Application",
    targetId: application.id,
    metadata: { jobPostingId: params.id, candidateEmail: email },
  });

  return NextResponse.json(application, { status: 201 });
}
