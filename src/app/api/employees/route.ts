import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getOnboardingTemplate } from "@/lib/onboarding";
import { notify } from "@/lib/notifications";

const createEmployeeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  jobTitle: z.string().min(1),
  departmentId: z.string().optional().nullable(),
  reportsToId: z.string().optional().nullable(),
  hireDate: z.string(), // ISO date string from the client
  baseSalary: z.number().nonnegative(),
  phone: z.string().optional(),
});

// GET /api/employees?department=&status=&search=&page=&pageSize=
// Every list endpoint is paginated and scoped to the caller's organization —
// never trust a client-supplied organizationId.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Math.min(Number(searchParams.get("pageSize") ?? "20"), 100);

  const where = {
    organizationId: (session.user as any).organizationId,
    ...(department ? { departmentId: department } : {}),
    ...(status ? { status: status as any } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { employeeCode: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: { department: true, user: { select: { email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

// POST /api/employees — create a User + Employee in one transaction.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "employee:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const organizationId = (session.user as any).organizationId;

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(data.password, 10);

  // Fetched outside the transaction — it may seed default template rows on
  // first use, which is a separate concern from creating this employee and
  // shouldn't be rolled back if the employee creation itself fails.
  const template = await getOnboardingTemplate(organizationId);

  try {
    const employee = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: data.email, passwordHash, role: "EMPLOYEE", organizationId },
      });

      const count = await tx.employee.count({ where: { organizationId } });
      const employeeCode = `EMP-${String(count + 1).padStart(4, "0")}`;

      const created = await tx.employee.create({
        data: {
          employeeCode,
          userId: user.id,
          organizationId,
          firstName: data.firstName,
          lastName: data.lastName,
          jobTitle: data.jobTitle,
          departmentId: data.departmentId || null,
          reportsToId: data.reportsToId || null,
          hireDate: new Date(data.hireDate),
          baseSalary: data.baseSalary,
          phone: data.phone,
        },
        include: { department: { include: { manager: true } } },
      });

      // Seed this employee's checklist from the org's onboarding template so
      // HR doesn't have to add tasks manually for every hire.
      await tx.onboardingTask.createMany({
        data: template.map((t) => ({
          employeeId: created.id,
          title: t.title,
          description: t.description,
          order: t.order,
        })),
      });

      return created;
    });

    logAudit({
      organizationId,
      actorUserId: (session.user as any).id,
      actorEmail: session.user.email ?? "",
      action: "employee.create",
      targetType: "Employee",
      targetId: employee.id,
      metadata: { employeeCode: employee.employeeCode, jobTitle: employee.jobTitle },
    });

    const managerUserId = employee.department?.manager?.userId;
    if (managerUserId) {
      notify({
        userId: managerUserId,
        organizationId,
        type: "ONBOARDING_ASSIGNED",
        title: `${employee.firstName} ${employee.lastName} joined your department`,
        body: "Onboarding checklist has been created — take a look when you get a chance.",
        link: `/employees/${employee.id}`,
      });
    }

    return NextResponse.json(employee, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}
