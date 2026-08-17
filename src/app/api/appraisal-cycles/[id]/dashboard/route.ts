import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCycleDashboard } from "@/lib/appraisal-cycle";

// GET /api/appraisal-cycles/:id/dashboard — completion snapshot for a cycle.
// Read-only for any authenticated role, same reasoning as the list route.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const organizationId = (session.user as any).organizationId;
  const dashboard = await getCycleDashboard(params.id, organizationId);
  if (!dashboard) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(dashboard);
}
