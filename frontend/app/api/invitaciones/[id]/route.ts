import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }

  const inv = await prisma.invitation.findUnique({ where: { id: params.id } });
  if (!inv) return NextResponse.json({ error: "Invitación no encontrada." }, { status: 404 });
  if (inv.used) {
    return NextResponse.json({ error: "No se puede eliminar una invitación ya utilizada." }, { status: 409 });
  }

  await prisma.invitation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
