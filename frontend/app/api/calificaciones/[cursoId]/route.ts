import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { ANIO_ACTUAL } from "@/lib/utils";

// GET: Obtener todas las notas para un curso (grilla de calificaciones)
export async function GET(req: NextRequest, { params }: { params: { cursoId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const anio = parseInt(searchParams.get("anio") ?? String(ANIO_ACTUAL));

  const [curso, matriculas] = await Promise.all([
    prisma.curso.findUnique({
      where: { id: params.cursoId },
      include: {
        grado: true,
        bimestres: {
          where: { activo: true },
          orderBy: { numero: "asc" },
          include: { criterios: { where: { activo: true }, orderBy: { orden: "asc" } } },
        },
      },
    }),
    prisma.matricula.findMany({
      where: { cursoId: params.cursoId, anio, activo: true },
      include: {
        alumno: { select: { id: true, nombres: true, apellidos: true, codigo: true } },
        calificaciones: {
          include: { criterio: { select: { id: true, bimestreId: true } } },
        },
      },
      orderBy: [{ alumno: { apellidos: "asc" } }, { alumno: { nombres: "asc" } }],
    }),
  ]);

  if (!curso) return NextResponse.json({ error: "Curso no encontrado." }, { status: 404 });

  return NextResponse.json({ curso, matriculas });
}

// POST: Guardar o actualizar una nota individual
const notaSchema = z.object({
  matriculaId: z.string().min(1),
  criterioId: z.string().min(1),
  nota: z.number().min(0).max(20).nullable(),
  observacion: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params: _ }: { params: { cursoId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "VISUALIZADOR") {
    return NextResponse.json({ error: "Sin autorización." }, { status: 403 });
  }

  try {
    const data = notaSchema.parse(await req.json());

    const calificacion = await prisma.calificacion.upsert({
      where: { matriculaId_criterioId: { matriculaId: data.matriculaId, criterioId: data.criterioId } },
      update: { nota: data.nota, observacion: data.observacion },
      create: { matriculaId: data.matriculaId, criterioId: data.criterioId, nota: data.nota, observacion: data.observacion },
    });

    return NextResponse.json(calificacion);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
    return NextResponse.json({ error: "Error al guardar nota." }, { status: 500 });
  }
}

// PUT: Guardar múltiples notas a la vez (batch update)
const batchSchema = z.object({
  notas: z.array(z.object({
    matriculaId: z.string(),
    criterioId: z.string(),
    nota: z.number().min(0).max(20).nullable(),
  })),
});

export async function PUT(req: NextRequest, { params: _ }: { params: { cursoId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "VISUALIZADOR") {
    return NextResponse.json({ error: "Sin autorización." }, { status: 403 });
  }

  try {
    const { notas } = batchSchema.parse(await req.json());

    await Promise.all(
      notas.map(({ matriculaId, criterioId, nota }) =>
        prisma.calificacion.upsert({
          where: { matriculaId_criterioId: { matriculaId, criterioId } },
          update: { nota },
          create: { matriculaId, criterioId, nota },
        })
      )
    );

    return NextResponse.json({ ok: true, updated: notas.length });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
    return NextResponse.json({ error: "Error al guardar notas." }, { status: 500 });
  }
}
