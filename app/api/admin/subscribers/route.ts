import { NextRequest, NextResponse } from "next/server";
import { farkliKokenReddi } from "@/lib/csrf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filter = req.nextUrl.searchParams.get("filter") || "all";
  const where = filter === "active" ? { active: true } : filter === "inactive" ? { active: false } : {};

  const [subscribers, total, activeCount, confirmedCount] = await Promise.all([
    prisma.subscriber.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.subscriber.count(),
    prisma.subscriber.count({ where: { active: true } }),
    prisma.subscriber.count({ where: { confirmed: true } }),
  ]);

  return NextResponse.json({ subscribers, total, activeCount, confirmedCount });
}

export async function PATCH(req: NextRequest) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) return kokenReddi;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, active } = await req.json();
  await prisma.subscriber.update({ where: { id }, data: { active } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) return kokenReddi;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.subscriber.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
