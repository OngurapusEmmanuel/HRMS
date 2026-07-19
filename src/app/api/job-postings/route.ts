import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// GET /api/job-postings — anyone who can view recruitment sees every
// posting in the org (postings aren't department-private the way leave/
// attendance are; hiring visibility is intentionally broader).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "recruitment:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const postings = await prisma.jobPosting.findMany({
    where: { organizationId: (session.user as any).organizationId },
    include: { department: true, _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(postings);
}

const schema = z.object({
  title: z.string().min(1),
  departmentId: z.string().optional().nullable(),
  description: z.string().min(1),
  status: z.enum(["DRAFT", "OPEN", "CLOSED"]).default("DRAFT"),
  closesAt: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "recruitment:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const organizationId = (session.user as any).organizationId;
  const postedById = (session.user as any).employeeId;
  const { title, departmentId, description, status, closesAt } = parsed.data;

  const posting = await prisma.jobPosting.create({
    data: {
      organizationId,
      title,
      departmentId: departmentId || null,
      description,
      status,
      postedById: postedById ?? "",
      postedAt: status === "OPEN" ? new Date() : null,
      closesAt: closesAt ? new Date(closesAt) : null,
    },
  });

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "job_posting.create",
    targetType: "JobPosting",
    targetId: posting.id,
    metadata: { title, status },
  });

  return NextResponse.json(posting, { status: 201 });
}
