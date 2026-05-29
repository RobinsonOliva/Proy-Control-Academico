import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { ANIO_ACTUAL } from "@/lib/utils";

const schema = z.object({
  alumnoId: z.string().min(1),
  cursoId: z.string().min(1),
  anio: z.number().int().default(ANIO_ACTUAL),
});

const bulkSchema = z.object({
  alumnoId: z.string().min(1),
  cursoIds: z.array(z.string()).min(1),
  anio: z.number().int().default(ANIO_ACTUAL),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const alumnoId = searchParams.get("alumnoId");
  const cursoId = searchParams.get("cursoId");
  const anio = searchParams.get("anio");
  const gradoId = searchParams.get("gradoId");

  const matriculas = await prisma.matricula.findMany({
    where: {
      activo: true,
      ...(alumnoId ? { alumnoId } : {}),
      ...(cursoId ? { cursoId } : {}),
      ...(anio ? { anio: parseInt(anio) } : {}),
      ...(gradoId ? { alumno: { gradoId } } : {}),
    },
    include: {
      alumno: {
        select: {
          id: true, nombres: true, apellidos: true, codigo: true,
          grado: { select: { id: true, nombre: true } },
          aula: { select: { id: true, seccion: true } },
        },
      },
      curso: {
        select: {
          id: true, nombre: true, codigo: true, color: true,
          grado: { select: { nombre: true } },
        },
      },
    },
    orderBy: [{ alumno: { apellidos: "asc" } }],
  });
  return NextResponse.json(matriculas);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "VISUALIZADOR") {
    return NextResponse.json({ error: "Sin autorización." }, { status: 403 });
  }
  try {
    const body = await req.json();

    // Matrícula masiva (varios cursos a la vez)
    if (body.cursoIds) {
      const { alumnoId, cursoIds, anio } = bulkSchema.parse(body);
      const created = await Promise.allSettled(
        cursoIds.map((cursoId) =>
          prisma.matricula.upsert({
            where: { alumnoId_cursoId_anio: { alumnoId, cursoId, anio } },
            update: { activo: true },
            create: { alumnoId, cursoId, anio },
          })
        )
      );
      const ok = created.filter((r) => r.status === "fulfilled").length;
      return NextResponse.json({ created: ok });
    }

    // Matrícula individual
    const { alumnoId, cursoId, anio } = schema.parse(body);
    const matricula = await prisma.matricula.upsert({
      where: { alumnoId_cursoId_anio: { alumnoId, cursoId, anio } },
      update: { activo: true },
      create: { alumnoId, cursoId, anio },
    });
    return NextResponse.json(matricula, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
    return NextResponse.json({ error: "Error al matricular." }, { status: 500 });
  }
}
