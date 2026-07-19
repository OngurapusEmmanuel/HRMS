import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "recruitment:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const posting = await prisma.jobPosting.findFirst({
    where: { id: params.id, organizationId: (session.user as any).organizationId },
    include: {
      department: true,
      applications: {
        include: { candidate: true, offer: true, _count: { select: { interviews: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!posting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(posting);
}

const schema = z.object({
  title: z.string().min(1).optional(),
  departmentId: z.string().nullable().optional(),
  description: z.string().min(1).optional(),
  status: z.enum(["DRAFT", "OPEN", "CLOSED"]).optional(),
  closesAt: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "recruitment:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = (session.user as any).organizationId;
  const existing = await prisma.jobPosting.findFirst({ where: { id: params.id, organizationId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { closesAt, ...rest } = parsed.data;

  // Opening a DRAFT posting for the first time stamps postedAt — the "went
  // live" timestamp, not just record creation time.
  const postedAt =
    parsed.data.status === "OPEN" && existing.status !== "OPEN" ? new Date() : undefined;

  const updated = await prisma.jobPosting.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(closesAt !== undefined ? { closesAt: closesAt ? new Date(closesAt) : null } : {}),
      ...(postedAt ? { postedAt } : {}),
    },
  });

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "job_posting.update",
    targetType: "JobPosting",
    targetId: params.id,
    metadata: { changes: parsed.data },
  });

  return NextResponse.json(updated);
}
