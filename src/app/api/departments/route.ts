import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";

const schema = z.object({ name: z.string().min(1), managerId: z.string().optional().nullable() });

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const departments = await prisma.department.findMany({
    where: { organizationId: (session.user as any).organizationId },
    include: { _count: { select: { employees: true } }, manager: { select: { firstName: true, lastName: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(departments);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "department:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const dept = await prisma.department.create({
      data: {
        name: parsed.data.name,
        managerId: parsed.data.managerId || null,
        organizationId: (session.user as any).organizationId,
      },
    });
    return NextResponse.json(dept, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") return NextResponse.json({ error: "Department already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
  }
}
