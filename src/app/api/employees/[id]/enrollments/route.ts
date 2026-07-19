import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, canActOnDepartment } from "@/lib/rbac";
import { reconcileOverdueEnrollments } from "@/lib/learning";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const organizationId = (session.user as any).organizationId;
  const employee = await prisma.employee.findFirst({ where: { id: params.id, organizationId }, select: { id: true, departmentId: true } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = (session.user as any).role;
  const actorEmployeeId = (session.user as any).employeeId;
  const isOwner = actorEmployeeId === params.id;
  if (!isOwner && !can(role, "training:manage") && !(await canActOnDepartment(role, actorEmployeeId, employee.departmentId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await reconcileOverdueEnrollments(organizationId);
  const enrollments = await prisma.trainingEnrollment.findMany({
    where: { employeeId: params.id },
    include: { course: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(enrollments);
}
