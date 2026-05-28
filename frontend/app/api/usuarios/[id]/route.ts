import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Role } from "@prisma/client";

const schema = z.object({
  name: z.string().min(2).optional(),
  role: z.nativeEnum(Role).optional(),
  active: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }

  if (params.id === session.user.id) {
    return NextResponse.json({ error: "No puedes modificar tu propio usuario." }, { status: 400 });
  }

  try {
    const data = schema.parse(await req.json());
    const user = await prisma.user.update({ where: { id: params.id }, data });
    return NextResponse.json({ id: user.id, name: user.name, role: user.role, active: user.active });
  } catch {
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  }
}
