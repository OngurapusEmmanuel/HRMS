import { NextRequest, NextResponse } from "next/server";
import { startOfDay, addDays } from "date-fns";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";

// GET /api/cron/leave-reminders — the one genuinely scheduled job in this
// app. Everything else (training/compliance overdue status) is reconciled
// lazily at read time, but a "your leave starts in 3 days" push can't be
// produced that way — it has to fire on its own regardless of whether
// anyone loads a page that day. Triggered by a Vercel Cron entry in
// vercel.json; protected by a bearer secret since Vercel Cron just issues a
// plain HTTP GET with no other auth of its own.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = startOfDay(new Date());
  const targetDay = addDays(today, 3);
  const nextDay = addDays(targetDay, 1);

  const upcoming = await prisma.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      startDate: { gte: targetDay, lt: nextDay },
    },
    include: {
      employee: { select: { organizationId: true, firstName: true, lastName: true, user: { select: { id: true } } } },
    },
  });

  let upcomingNotified = 0;
  for (const leave of upcoming) {
    await notify({
      userId: leave.employee.user.id,
      organizationId: leave.employee.organizationId,
      type: "LEAVE_UPCOMING",
      title: "Your leave starts in 3 days",
      body: `${leave.type} · ${leave.startDate.toDateString()} – ${leave.endDate.toDateString()}`,
      link: "/leaves",
    });
    upcomingNotified++;
  }

  const threshold = Number(process.env.LOW_BALANCE_THRESHOLD_DAYS ?? "2");
  const currentYear = new Date().getFullYear();

  const balances = await prisma.leaveBalance.findMany({
    where: { year: currentYear },
    include: {
      employee: { select: { organizationId: true, firstName: true, lastName: true, user: { select: { id: true } } } },
    },
  });

  let lowBalanceNotified = 0;
  for (const balance of balances) {
    // `entitled` is only ever set to a real value when something other than
    // the default upsert-on-first-approval path has populated it (today
    // that defaults to 0, see POST /api/leaves/[id]) — skip rows where it's
    // still 0 rather than flag every employee who's ever taken leave as
    // "low balance".
    if (balance.entitled <= 0) continue;
    const remaining = balance.entitled - balance.used;
    if (remaining > threshold) continue;
    await notify({
      userId: balance.employee.user.id,
      organizationId: balance.employee.organizationId,
      type: "LEAVE_LOW_BALANCE",
      title: "Low leave balance",
      body: `${remaining} day${remaining === 1 ? "" : "s"} of ${balance.type} leave remaining this year.`,
      link: "/leaves",
    });
    lowBalanceNotified++;
  }

  return NextResponse.json({ upcomingNotified, lowBalanceNotified });
}
