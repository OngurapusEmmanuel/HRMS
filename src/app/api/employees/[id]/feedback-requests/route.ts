import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, canActOnDepartment } from "@/lib/rbac";
import { notify } from "@/lib/notifications";

async function canView(session: any, employee: { id: string; departmentId: string | null }) {
  const role = session.user.role;
  if (can(role, "appraisal:view_all")) return true;
  if (session.user.employeeId === employee.id) return true;
  return canActOnDepartment(role, session.user.employeeId, employee.departmentId);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const employee = await prisma.employee.findFirst({
    where: { id: params.id, organizationId: (session.user as any).organizationId },
    select: { id: true, departmentId: true },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canView(session, employee))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const requests = await prisma.feedbackRequest.findMany({
    where: { employeeId: params.id },
    include: { provider: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Anonymize peer/direct-report feedback in the response for anyone other
  // than HR/Admin — the point of 360 feedback is honest input without the
  // subject (or their manager) being able to attribute a specific comment.
  const canSeeProviders = can((session.user as any).role, "appraisal:view_all");
  const sanitized = requests.map((r) => ({
    ...r,
    provider: canSeeProviders || r.relationship === "MANAGER" ? r.provider : null,
  }));

  return NextResponse.json(sanitized);
}

const schema = z.object({
  providers: z
    .array(z.object({ providerId: z.string().min(1), relationship: z.enum(["SELF", "MANAGER", "PEER", "DIRECT_REPORT"]) }))
    .min(1)
    .max(15),
});

// POST /api/employees/:id/feedback-requests — open a 360 round by creating
// one FeedbackRequest per named provider. Providers submit their own via
// PATCH /api/feedback-requests/:id.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const role = (session.user as any).role;
  const requestedById = (session.user as any).employeeId;
  if (!can(role, "feedback:request")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const organizationId = (session.user as any).organizationId;
  const employee = await prisma.employee.findFirst({ where: { id: params.id, organizationId }, select: { id: true, departmentId: true } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canActOnDepartment(role, requestedById, employee.departmentId))) {
    return NextResponse.json({ error: "You can only request feedback for your own department" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const providerIds = parsed.data.providers.map((p) => p.providerId);
  const providers = await prisma.employee.findMany({
    where: { id: { in: providerIds }, organizationId },
    select: { id: true, user: { select: { id: true } } },
  });
  const providerMap = new Map(providers.map((p) => [p.id, p]));

  const created = await prisma.$transaction(
    parsed.data.providers.map((p) =>
      prisma.feedbackRequest.create({
        data: {
          employeeId: params.id,
          providerId: p.providerId,
          requestedById: requestedById ?? "",
          organizationId,
          relationship: p.relationship,
        },
      })
    )
  );

  for (const p of parsed.data.providers) {
    const provider = providerMap.get(p.providerId);
    if (provider) {
      notify({
        userId: provider.user.id,
        organizationId,
        type: "FEEDBACK_REQUESTED",
        title: "You've been asked to give performance feedback",
        link: `/feedback`,
      });
    }
  }

  return NextResponse.json(created, { status: 201 });
}
