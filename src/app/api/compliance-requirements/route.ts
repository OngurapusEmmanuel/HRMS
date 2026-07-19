import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { reconcileOverdueRecords } from "@/lib/compliance";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "compliance:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = (session.user as any).organizationId;
  await reconcileOverdueRecords(organizationId);

  const requirements = await prisma.complianceRequirement.findMany({
    where: { organizationId },
    include: { records: { orderBy: { dueDate: "desc" }, take: 5 } },
    orderBy: { nextDueDate: "asc" },
  });
  return NextResponse.json(requirements);
}

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  jurisdiction: z.string().optional(),
  frequency: z.enum(["ONE_TIME", "MONTHLY", "QUARTERLY", "ANNUAL"]),
  nextDueDate: z.string().min(1),
});

// POST /api/compliance-requirements — creates the requirement AND its first
// open ComplianceRecord in one step, so it shows up as trackable immediately.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "compliance:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const organizationId = (session.user as any).organizationId;
  const dueDate = new Date(parsed.data.nextDueDate);

  const requirement = await prisma.complianceRequirement.create({
    data: {
      organizationId,
      title: parsed.data.title,
      description: parsed.data.description,
      jurisdiction: parsed.data.jurisdiction,
      frequency: parsed.data.frequency,
      nextDueDate: dueDate,
      records: {
        create: { organizationId, dueDate, status: dueDate < new Date() ? "OVERDUE" : "UPCOMING" },
      },
    },
    include: { records: true },
  });

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "compliance_requirement.create",
    targetType: "ComplianceRequirement",
    targetId: requirement.id,
    metadata: { title: requirement.title, frequency: requirement.frequency },
  });

  return NextResponse.json(requirement, { status: 201 });
}
