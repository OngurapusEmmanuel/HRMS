import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/health — unauthenticated by design (load balancers, Docker
// healthchecks, and uptime monitors can't do a login flow). Confirms the
// process is up AND the database is reachable, which is the failure mode
// that actually matters for readiness — a live process with a dead DB
// connection should still be reported unhealthy.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (err) {
    console.error("Health check: database unreachable", err);
    return NextResponse.json({ status: "error", database: "unreachable" }, { status: 503 });
  }
}
