import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { ANIO_ACTUAL } from "@/lib/utils";

const schema = z.object({
  nombre: z.string().min(2).max(100),
  codigo: z.string().min(2).max(10).toUpperCase(),
  descripcion: z.string().optional(),
  color: z.string().default("#4F46E5"),
  gradoId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gradoId = searchParams.get("gradoId");

  const cursos = await prisma.curso.findMany({
    where: { activo: true, ...(gradoId ? { gradoId } : {}) },
    orderBy: [{ grado: { orden: "asc" } }, { nombre: "asc" }],
    include: {
      grado: { select: { id: true, nombre: true, nivel: true } },
      cursoAulas: {
        include: {
          aula: { select: { id: true, seccion: true } },
          docente: { select: { id: true, name: true } },
        },
      },
      _count: {
        select: {
          matriculas: { where: { anio: ANIO_ACTUAL, activo: true } },
          bimestres: true,
        },
      },
    },
  });
  return NextResponse.json(cursos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "VISUALIZADOR") {
    return NextResponse.json({ error: "Sin autorización." }, { status: 403 });
  }
  try {
    const data = schema.parse(await req.json());
    const curso = await prisma.curso.create({ data: { ...data, codigo: data.codigo.toUpperCase() } });

    await Promise.all(
      [1, 2, 3, 4].map((num) =>
        prisma.bimestre.create({
          data: { cursoId: curso.id, numero: num, nombre: `${num}° Bimestre` },
        })
      )
    );

    return NextResponse.json(curso, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
    if ((err as { code?: string }).code === "P2002")
      return NextResponse.json({ error: "Ya existe un curso con ese código en este grado." }, { status: 409 });
    return NextResponse.json({ error: "Error al crear curso." }, { status: 500 });
  }
}
