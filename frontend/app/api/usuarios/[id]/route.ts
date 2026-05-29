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

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }

  if (params.id === session.user.id) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta." }, { status: 400 });
  }

  const assignments = await prisma.cursoAula.count({ where: { docenteId: params.id } });
  if (assignments > 0) {
    return NextResponse.json({
      error: `El usuario tiene ${assignments} sección(es) asignada(s). Retira las asignaciones desde Cursos antes de eliminar.`,
    }, { status: 409 });
  }

  await prisma.invitation.deleteMany({ where: { createdById: params.id } });
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
