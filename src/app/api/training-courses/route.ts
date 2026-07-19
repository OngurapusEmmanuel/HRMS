import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// GET /api/training-courses — the catalog. Visible to everyone (employees
// need to see it to self-enroll), unlike most HR data which is scoped.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const courses = await prisma.trainingCourse.findMany({
    where: { organizationId: (session.user as any).organizationId },
    include: { _count: { select: { enrollments: true } } },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
  return NextResponse.json(courses);
}

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(["COMPLIANCE", "SKILLS", "CAREER"]),
  durationHours: z.number().positive(),
  required: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "training:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const organizationId = (session.user as any).organizationId;
  const course = await prisma.trainingCourse.create({ data: { organizationId, ...parsed.data } });

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "training_course.create",
    targetType: "TrainingCourse",
    targetId: course.id,
    metadata: { title: course.title, category: course.category },
  });

  return NextResponse.json(course, { status: 201 });
}
