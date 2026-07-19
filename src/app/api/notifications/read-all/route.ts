import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId: (session.user as any).id, read: false },
    data: { read: true },
  });

  return NextResponse.json({ success: true });
}
