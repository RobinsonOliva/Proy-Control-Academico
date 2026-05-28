import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  descripcion: z.string().optional().nullable(),
  color: z.string().optional(),
  docenteId: z.string().optional().nullable(),
  activo: z.boolean().optional(),
});

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const curso = await prisma.curso.findUnique({
    where: { id: params.id },
    include: {
      grado: true,
      docente: { select: { id: true, name: true, email: true } },
      bimestres: {
        where: { activo: true },
        orderBy: { numero: "asc" },
        include: {
          criterios: { where: { activo: true }, orderBy: { orden: "asc" } },
        },
      },
      _count: { select: { matriculas: true } },
    },
  });
  if (!curso) return NextResponse.json({ error: "Curso no encontrado." }, { status: 404 });
  return NextResponse.json(curso);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "VISUALIZADOR") {
    return NextResponse.json({ error: "Sin autorización." }, { status: 403 });
  }
  try {
    const data = schema.parse(await req.json());
    const curso = await prisma.curso.update({ where: { id: params.id }, data });
    return NextResponse.json(curso);
  } catch {
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }
  try {
    await prisma.curso.update({ where: { id: params.id }, data: { activo: false } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar." }, { status: 500 });
  }
}
