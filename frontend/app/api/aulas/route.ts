import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  seccion: z.string().min(1).max(10),
  capacidad: z.number().int().min(1).max(60).default(35),
  gradoId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gradoId = searchParams.get("gradoId");

  const aulas = await prisma.aula.findMany({
    where: { activo: true, ...(gradoId ? { gradoId } : {}) },
    orderBy: [{ grado: { orden: "asc" } }, { seccion: "asc" }],
    include: {
      grado: { select: { nombre: true, nivel: true } },
      _count: { select: { alumnos: true } },
    },
  });
  return NextResponse.json(aulas);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "VISUALIZADOR") {
    return NextResponse.json({ error: "Sin autorización." }, { status: 403 });
  }
  try {
    const data = schema.parse(await req.json());
    const aula = await prisma.aula.create({ data });
    return NextResponse.json(aula, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
    if ((err as { code?: string }).code === "P2002")
      return NextResponse.json({ error: "Ya existe esa sección en este grado." }, { status: 409 });
    return NextResponse.json({ error: "Error al crear aula." }, { status: 500 });
  }
}
