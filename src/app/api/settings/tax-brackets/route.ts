import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { getTaxBrackets } from "@/lib/payroll";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "settings:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ensures defaults are seeded on first view, so the settings page always
  // has something to render/edit rather than an empty state.
  await getTaxBrackets((session.user as any).organizationId);
  const brackets = await prisma.taxBracket.findMany({
    where: { organizationId: (session.user as any).organizationId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(brackets);
}

const bracketSchema = z.object({
  upTo: z.number().positive().nullable(), // null only allowed on the last entry, checked below
  rate: z.number().min(0).max(1),
});
const replaceSchema = z.object({ brackets: z.array(bracketSchema).min(1).max(10) });

// PUT /api/settings/tax-brackets — full replace, since brackets are
// order-dependent and the UI edits the whole schedule as one table.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "settings:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = replaceSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { brackets } = parsed.data;
  const last = brackets[brackets.length - 1];
  if (last.upTo !== null) {
    return NextResponse.json({ error: "The last bracket must be uncapped (no upper threshold)" }, { status: 400 });
  }
  // Thresholds must strictly increase, ignoring the final null entry.
  for (let i = 1; i < brackets.length - 1; i++) {
    if ((brackets[i].upTo ?? Infinity) <= (brackets[i - 1].upTo ?? -Infinity)) {
      return NextResponse.json({ error: "Bracket thresholds must strictly increase" }, { status: 400 });
    }
  }

  const organizationId = (session.user as any).organizationId;

  await prisma.$transaction([
    prisma.taxBracket.deleteMany({ where: { organizationId } }),
    prisma.taxBracket.createMany({
      data: brackets.map((b, i) => ({ organizationId, upTo: b.upTo, rate: b.rate, order: i })),
    }),
  ]);

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "settings.tax_brackets_update",
    targetType: "TaxBracket",
    metadata: { bracketCount: brackets.length },
  });

  const updated = await prisma.taxBracket.findMany({ where: { organizationId }, orderBy: { order: "asc" } });
  return NextResponse.json(updated);
}
