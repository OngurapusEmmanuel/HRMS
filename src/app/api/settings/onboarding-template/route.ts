import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { getOnboardingTemplate } from "@/lib/onboarding";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "settings:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Seeds defaults on first view, same pattern as tax brackets.
  const items = await getOnboardingTemplate((session.user as any).organizationId);
  return NextResponse.json(items);
}

const itemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
});
const replaceSchema = z.object({ items: z.array(itemSchema).min(1).max(20) });

// PUT /api/settings/onboarding-template — full replace, since the UI edits
// the whole ordered list as one form. Existing employees' already-assigned
// OnboardingTask rows are untouched — this only changes what future hires get.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!can((session.user as any).role, "settings:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = replaceSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const organizationId = (session.user as any).organizationId;

  await prisma.$transaction([
    prisma.onboardingTaskTemplate.deleteMany({ where: { organizationId } }),
    prisma.onboardingTaskTemplate.createMany({
      data: parsed.data.items.map((item, i) => ({
        organizationId,
        title: item.title,
        description: item.description || null,
        order: i,
      })),
    }),
  ]);

  logAudit({
    organizationId,
    actorUserId: (session.user as any).id,
    actorEmail: session.user.email ?? "",
    action: "settings.onboarding_template_update",
    targetType: "OnboardingTaskTemplate",
    metadata: { itemCount: parsed.data.items.length },
  });

  const updated = await prisma.onboardingTaskTemplate.findMany({ where: { organizationId }, orderBy: { order: "asc" } });
  return NextResponse.json(updated);
}
