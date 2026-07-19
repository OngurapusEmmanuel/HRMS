import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { completeRecord } from "@/lib/compliance";
import { logAudit } from "@/lib/audit";

const schema = z.object({ notes: z.string().optional() });

// POST /api/compliance-records/:id/complete — mark this occurrence done;
// for recurring requirements this also opens the next occurrence (see
// lib/compliance.ts).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "compliance:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = (session.user as any).organizationId;
  const record = await prisma.complianceRecord.findFirst({ where: { id: params.id, organizationId } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (record.status === "COMPLETE") return NextResponse.json({ error: "Already complete" }, { status: 409 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await completeRecord(params.id, (session.user as any).employeeId ?? "", parsed.data.notes);

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "compliance_record.complete",
    targetType: "ComplianceRecord",
    targetId: params.id,
  });

  return NextResponse.json(updated);
}
