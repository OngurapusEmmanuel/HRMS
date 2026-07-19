import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const employeeId = (session.user as any).employeeId;
  if (!employeeId) return NextResponse.json({ error: "No employee profile linked" }, { status: 400 });

  const today = new Date(new Date().toDateString());
  const existing = await prisma.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });
  if (!existing) return NextResponse.json({ error: "No check-in found for today" }, { status: 400 });

  const record = await prisma.attendanceRecord.update({
    where: { employeeId_date: { employeeId, date: today } },
    data: { checkOut: new Date() },
  });

  return NextResponse.json(record);
}
