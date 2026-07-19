import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const LATE_CUTOFF_HOUR = 9; // after 9:00 local server time counts as LATE

// POST /api/attendance/checkin — self check-in for the current day.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const employeeId = (session.user as any).employeeId;
  if (!employeeId) return NextResponse.json({ error: "No employee profile linked" }, { status: 400 });

  const now = new Date();
  const today = new Date(now.toDateString());
  const status = now.getHours() >= LATE_CUTOFF_HOUR ? "LATE" : "PRESENT";

  const record = await prisma.attendanceRecord.upsert({
    where: { employeeId_date: { employeeId, date: today } },
    create: { employeeId, date: today, checkIn: now, status },
    update: { checkIn: now, status },
  });

  return NextResponse.json(record, { status: 201 });
}
