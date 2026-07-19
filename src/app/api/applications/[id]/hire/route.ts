import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getOnboardingTemplate } from "@/lib/onboarding";

const schema = z.object({
  password: z.string().min(8), // temporary password for the new account
  jobTitle: z.string().min(1).optional(), // defaults to the job posting's title
  departmentId: z.string().optional().nullable(), // defaults to the job posting's department
  reportsToId: z.string().optional().nullable(),
  baseSalary: z.number().nonnegative().optional(), // defaults to the offer's proposedSalary
});

// POST /api/applications/:id/hire — converts an accepted offer into a real
// User + Employee, exactly like POST /api/employees does for a manually
// added hire (same onboarding-template seeding), then marks the application
// HIRED and closes the loop back to the job posting.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "employee:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = (session.user as any).organizationId;
  const application = await prisma.application.findFirst({
    where: { id: params.id, organizationId },
    include: { candidate: true, jobPosting: true, offer: true },
  });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (application.stage === "HIRED") {
    return NextResponse.json({ error: "This application has already been hired" }, { status: 409 });
  }
  if (!application.offer || application.offer.status !== "ACCEPTED") {
    return NextResponse.json({ error: "The offer must be ACCEPTED before hiring" }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(data.password, 10);
  const template = await getOnboardingTemplate(organizationId);

  try {
    const employee = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: application.candidate.email, passwordHash, role: "EMPLOYEE", organizationId },
      });

      const count = await tx.employee.count({ where: { organizationId } });
      const employeeCode = `EMP-${String(count + 1).padStart(4, "0")}`;

      const created = await tx.employee.create({
        data: {
          employeeCode,
          userId: user.id,
          organizationId,
          firstName: application.candidate.firstName,
          lastName: application.candidate.lastName,
          jobTitle: data.jobTitle ?? application.jobPosting.title,
          departmentId: data.departmentId ?? application.jobPosting.departmentId ?? null,
          reportsToId: data.reportsToId || null,
          hireDate: application.offer!.startDate,
          baseSalary: data.baseSalary ?? application.offer!.proposedSalary,
        },
      });

      await tx.onboardingTask.createMany({
        data: template.map((t) => ({
          employeeId: created.id,
          title: t.title,
          description: t.description,
          order: t.order,
        })),
      });

      await tx.application.update({
        where: { id: params.id },
        data: { stage: "HIRED", hiredEmployeeId: created.id },
      });

      return created;
    });

    logAudit({
      organizationId,
      actorUserId: (session.user as any).id,
      actorEmail: session.user.email ?? "",
      action: "application.hire",
      targetType: "Employee",
      targetId: employee.id,
      metadata: { applicationId: params.id, candidateEmail: application.candidate.email },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to hire candidate" }, { status: 500 });
  }
}
