import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { toCsv } from "@/lib/csv";
import { reconcileOverdueRecords } from "@/lib/compliance";

// GET /api/compliance-requirements/export — CSV of every requirement's
// current open record, for handing to auditors or filing internally.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "compliance:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = (session.user as any).organizationId;
  await reconcileOverdueRecords(organizationId);

  const requirements = await prisma.complianceRequirement.findMany({
    where: { organizationId },
    include: { records: { orderBy: { dueDate: "desc" }, take: 1 } },
    orderBy: { nextDueDate: "asc" },
  });

  const rows = requirements.map((r) => ({
    title: r.title,
    jurisdiction: r.jurisdiction ?? "",
    frequency: r.frequency,
    nextDueDate: r.nextDueDate.toISOString().slice(0, 10),
    currentStatus: r.records[0]?.status ?? "",
    active: r.active ? "yes" : "no",
  }));
  const csv = toCsv(rows, ["title", "jurisdiction", "frequency", "nextDueDate", "currentStatus", "active"]);

  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="compliance-report.csv"` },
  });
}
