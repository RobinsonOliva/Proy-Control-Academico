import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Nivel } from "@prisma/client";

const schema = z.object({
  nombre: z.string().min(2).max(100),
  nivel: z.nativeEnum(Nivel),
  orden: z.number().int().positive(),
});

export async function GET() {
  try {
    const grados = await prisma.grado.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
      include: {
        aulas: { where: { activo: true }, select: { id: true, seccion: true, capacidad: true, gradoId: true } },
        _count: { select: { alumnos: true, cursos: true } },
      },
    });
    return NextResponse.json(grados);
  } catch {
    return NextResponse.json({ error: "Error al obtener grados." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "VISUALIZADOR") {
    return NextResponse.json({ error: "Sin autorización." }, { status: 403 });
  }

  try {
    const data = schema.parse(await req.json());
    const grado = await prisma.grado.create({ data });
    return NextResponse.json(grado, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
    return NextResponse.json({ error: "Error al crear grado." }, { status: 500 });
  }
}
