import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getAnioEscolar } from "@/lib/config";

const schema = z.object({
  alumnoId: z.string().min(1),
  cursoId: z.string().min(1),
  anio: z.number().int().optional(),
});

const bulkSchema = z.object({
  alumnoId: z.string().min(1),
  cursoIds: z.array(z.string()).min(1),
  anio: z.number().int().optional(),
});

async function validarDocente(alumnoId: string, cursoIds: string[]): Promise<string | null> {
  const alumno = await prisma.alumno.findUnique({ where: { id: alumnoId }, select: { aulaId: true } });
  if (!alumno) return "Alumno no encontrado.";

  for (const cursoId of cursoIds) {
    const asignacion = await prisma.cursoAula.findFirst({
      where: { cursoId, aulaId: alumno.aulaId, docenteId: { not: null } },
      include: { curso: { select: { nombre: true } } },
    });
    if (!asignacion) {
      const curso = await prisma.curso.findUnique({ where: { id: cursoId }, select: { nombre: true } });
      return `El curso "${curso?.nombre ?? cursoId}" no tiene docente asignado en la sección del alumno.`;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const alumnoId = searchParams.get("alumnoId");
  const cursoId  = searchParams.get("cursoId");
  const anio     = searchParams.get("anio");
  const gradoId  = searchParams.get("gradoId");

  const matriculas = await prisma.matricula.findMany({
    where: {
      activo: true,
      ...(alumnoId ? { alumnoId } : {}),
      ...(cursoId  ? { cursoId }  : {}),
      ...(anio     ? { anio: parseInt(anio) } : {}),
      ...(gradoId  ? { alumno: { gradoId } }  : {}),
    },
    include: {
      alumno: {
        select: {
          id: true, nombres: true, apellidos: true, codigo: true,
          grado: { select: { id: true, nombre: true } },
          aula:  { select: { id: true, seccion: true } },
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
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores pueden matricular." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const anioActual = await getAnioEscolar();

    if (body.cursoIds) {
      const parsed = bulkSchema.parse(body);
      const { alumnoId, cursoIds } = parsed;
      const anio = parsed.anio ?? anioActual;

      const error = await validarDocente(alumnoId, cursoIds);
      if (error) return NextResponse.json({ error }, { status: 422 });

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

    const parsed = schema.parse(body);
    const { alumnoId, cursoId } = parsed;
    const anio = parsed.anio ?? anioActual;

    const error = await validarDocente(alumnoId, [cursoId]);
    if (error) return NextResponse.json({ error }, { status: 422 });

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
