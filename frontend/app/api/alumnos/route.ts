import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Sexo } from "@prisma/client";
import { ANIO_ACTUAL } from "@/lib/utils";

const schema = z.object({
  nombres: z.string().min(2).max(100),
  apellidos: z.string().min(2).max(100),
  codigo: z.string().min(3).max(20),
  dni: z.string().max(20).optional().nullable(),
  fechaNacimiento: z.string().optional().nullable(),
  sexo: z.nativeEnum(Sexo).default(Sexo.MASCULINO),
  email: z.string().email().optional().nullable(),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  gradoId: z.string().min(1),
  aulaId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gradoId = searchParams.get("gradoId");
  const aulaId = searchParams.get("aulaId");
  const q = searchParams.get("q");

  const alumnos = await prisma.alumno.findMany({
    where: {
      activo: true,
      ...(gradoId ? { gradoId } : {}),
      ...(aulaId ? { aulaId } : {}),
      ...(q ? {
        OR: [
          { nombres: { contains: q, mode: "insensitive" } },
          { apellidos: { contains: q, mode: "insensitive" } },
          { codigo: { contains: q, mode: "insensitive" } },
          { dni: { contains: q } },
        ],
      } : {}),
    },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    include: {
      grado: { select: { id: true, nombre: true, nivel: true } },
      aula: { select: { id: true, seccion: true } },
      _count: { select: { matriculas: { where: { anio: ANIO_ACTUAL, activo: true } } } },
    },
  });
  return NextResponse.json(alumnos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "VISUALIZADOR") {
    return NextResponse.json({ error: "Sin autorización." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const alumno = await prisma.alumno.create({
      data: {
        ...data,
        fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : null,
        nombres: data.nombres.toUpperCase(),
        apellidos: data.apellidos.toUpperCase(),
      },
    });
    return NextResponse.json(alumno, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
    if ((err as { code?: string }).code === "P2002")
      return NextResponse.json({ error: "Ya existe un alumno con ese código o DNI." }, { status: 409 });
    return NextResponse.json({ error: "Error al registrar alumno." }, { status: 500 });
  }
}
