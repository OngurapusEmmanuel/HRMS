import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// GET /api/appraisal-cycles?page=&pageSize= — list cycles in the org, newest
// first. Deliberately read-only for any authenticated role (not gated behind
// appraisal:cycle_manage): MANAGER/EMPLOYEE need this to find the active
// cycle for self-review prompts elsewhere, even though only HR/Admin can
// create or close cycles. The Cycles tab UI itself is only linked for
// roles that pass appraisal:cycle_manage — that tab fetches straight from
// Prisma server-side rather than this route, but every list endpoint here
// paginates and scopes to the caller's organization on principle.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Math.min(Number(searchParams.get("pageSize") ?? "20"), 100);

  const organizationId = (session.user as any).organizationId;
  const where = { organizationId };

  const [items, total] = await Promise.all([
    prisma.appraisalCycle.findMany({
      where,
      include: { department: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.appraisalCycle.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

const schema = z.object({
  name: z.string().min(1),
  periodStart: z.string(),
  periodEnd: z.string(),
  dueAt: z.string(),
  departmentId: z.string().nullable().optional(),
  requireSelfReview: z.boolean().default(true),
});

// POST /api/appraisal-cycles — create a new review cycle. ADMIN/HR only.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const role = (session.user as any).role;
  if (!can(role, "appraisal:cycle_manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, periodStart, periodEnd, dueAt, departmentId, requireSelfReview } = parsed.data;

  const organizationId = (session.user as any).organizationId;

  if (departmentId) {
    const department = await prisma.department.findFirst({ where: { id: departmentId, organizationId } });
    if (!department) return NextResponse.json({ error: "Department not found" }, { status: 400 });
  }

  const cycle = await prisma.appraisalCycle.create({
    data: {
      organizationId,
      name,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      dueAt: new Date(dueAt),
      departmentId: departmentId || null,
      requireSelfReview,
      createdById: (session.user as any).id,
    },
  });

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "appraisal_cycle.create",
    targetType: "AppraisalCycle",
    targetId: cycle.id,
    metadata: { name: cycle.name, departmentId: cycle.departmentId },
  });

  return NextResponse.json(cycle, { status: 201 });
}
