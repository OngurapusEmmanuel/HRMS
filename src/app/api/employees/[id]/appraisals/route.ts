import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, canActOnDepartment } from "@/lib/rbac";
import { APPRAISAL_CRITERIA, computeOverallRating } from "@/lib/appraisal";
import { notify } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

// Who can see an employee's appraisal history: HR/Admin org-wide, the
// manager of that employee's department, or the employee themselves
// (read-only — transparency into your own review history is standard
// practice, and the create check below is separate and stricter).
async function canViewAppraisals(session: any, targetEmployee: { id: string; departmentId: string | null }) {
  const role = session.user.role;
  if (can(role, "appraisal:view_all")) return true;
  if (session.user.employeeId === targetEmployee.id) return true;
  return canActOnDepartment(role, session.user.employeeId, targetEmployee.departmentId);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const employee = await prisma.employee.findFirst({
    where: { id: params.id, organizationId: (session.user as any).organizationId },
    select: { id: true, departmentId: true },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canViewAppraisals(session, employee))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const appraisals = await prisma.appraisal.findMany({
    where: { employeeId: params.id },
    include: { reviewer: { select: { firstName: true, lastName: true } } },
    orderBy: { periodEnd: "desc" },
  });
  return NextResponse.json(appraisals);
}

const schema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  scores: z.record(z.number().min(1).max(5)),
  strengths: z.string().optional(),
  areasForImprovement: z.string().optional(),
  goals: z.string().optional(),
  comments: z.string().optional(),
  cycleId: z.string().optional(),
  reviewType: z.enum(["SELF", "MANAGER"]).optional(),
});

// POST /api/employees/:id/appraisals — file a new periodic review.
//
// Authorization branches on `reviewType`:
// - "SELF": the employee reviewing themselves — allowed when the acting
//   session's employeeId matches the target employee, regardless of role.
//   No canActOnDepartment check (there's no "department" to be gated on when
//   you're reviewing yourself).
// - "MANAGER" or unset (legacy ad-hoc appraisals predating cycles): today's
//   existing rule — ADMIN/HR can appraise anyone; MANAGER only employees in
//   a department they head (canActOnDepartment); EMPLOYEE cannot create.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const role = (session.user as any).role;
  const actorEmployeeId = (session.user as any).employeeId;
  const organizationId = (session.user as any).organizationId;

  const employee = await prisma.employee.findFirst({
    where: { id: params.id, organizationId },
    select: { id: true, departmentId: true, firstName: true, lastName: true, user: { select: { id: true } } },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { periodStart, periodEnd, scores, strengths, areasForImprovement, goals, comments, cycleId, reviewType } =
    parsed.data;

  const isSelfReview = reviewType === "SELF";
  let reviewerEmployeeId: string;

  if (isSelfReview) {
    if (actorEmployeeId !== params.id) {
      return NextResponse.json({ error: "You can only submit a self-review for yourself" }, { status: 403 });
    }
    reviewerEmployeeId = params.id;
  } else {
    if (!can(role, "appraisal:create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const allowed = await canActOnDepartment(role, actorEmployeeId, employee.departmentId);
    if (!allowed) {
      return NextResponse.json(
        { error: "You can only appraise employees in your own department" },
        { status: 403 }
      );
    }
    if (!actorEmployeeId) {
      return NextResponse.json(
        { error: "Your account has no linked employee profile to appraise as" },
        { status: 400 }
      );
    }
    reviewerEmployeeId = actorEmployeeId;
  }

  if (cycleId) {
    const cycle = await prisma.appraisalCycle.findFirst({ where: { id: cycleId, organizationId } });
    if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 400 });
    if (cycle.status === "CLOSED") {
      return NextResponse.json({ error: "This appraisal cycle is closed" }, { status: 400 });
    }
  }

  const unknownCriteria = Object.keys(scores).filter((k) => !(APPRAISAL_CRITERIA as readonly string[]).includes(k));
  if (unknownCriteria.length > 0) {
    return NextResponse.json({ error: `Unknown criteria: ${unknownCriteria.join(", ")}` }, { status: 400 });
  }
  if (Object.keys(scores).length !== APPRAISAL_CRITERIA.length) {
    return NextResponse.json({ error: "All criteria must be scored" }, { status: 400 });
  }

  const overallRating = computeOverallRating(scores);

  const appraisal = await prisma.appraisal.create({
    data: {
      employeeId: params.id,
      reviewerId: reviewerEmployeeId,
      organizationId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      scores,
      overallRating,
      strengths,
      areasForImprovement,
      goals,
      comments,
      cycleId: cycleId || null,
      reviewType: reviewType || null,
    },
  });

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "appraisal.create",
    targetType: "Appraisal",
    targetId: appraisal.id,
    metadata: { employeeId: params.id, overallRating, cycleId: cycleId ?? null, reviewType: reviewType ?? null },
  });

  notify({
    userId: employee.user.id,
    organizationId,
    type: "APPRAISAL_SUBMITTED",
    title: "You have a new performance appraisal",
    body: `Overall rating: ${overallRating.toFixed(2)} / 5`,
    link: `/employees/${params.id}`,
  });

  return NextResponse.json(appraisal, { status: 201 });
}
