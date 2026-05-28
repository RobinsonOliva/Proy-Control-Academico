import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Sexo } from "@prisma/client";

const schema = z.object({
  nombres: z.string().min(2).max(100).optional(),
  apellidos: z.string().min(2).max(100).optional(),
  dni: z.string().optional().nullable(),
  fechaNacimiento: z.string().optional().nullable(),
  sexo: z.nativeEnum(Sexo).optional(),
  email: z.string().email().optional().nullable(),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  gradoId: z.string().optional(),
  aulaId: z.string().optional(),
  activo: z.boolean().optional(),
});

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const alumno = await prisma.alumno.findUnique({
    where: { id: params.id },
    include: {
      grado: true,
      aula: true,
      matriculas: {
        where: { activo: true },
        include: {
          curso: { select: { nombre: true, color: true, codigo: true } },
        },
      },
    },
  });
  if (!alumno) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json(alumno);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "VISUALIZADOR") {
    return NextResponse.json({ error: "Sin autorización." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const alumno = await prisma.alumno.update({
      where: { id: params.id },
      data: {
        ...data,
        fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : undefined,
        nombres: data.nombres?.toUpperCase(),
        apellidos: data.apellidos?.toUpperCase(),
      },
    });
    return NextResponse.json(alumno);
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
    await prisma.alumno.update({ where: { id: params.id }, data: { activo: false } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar." }, { status: 500 });
  }
}
