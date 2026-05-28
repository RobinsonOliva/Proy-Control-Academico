import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  cursoId: z.string().min(1),
  numero: z.number().int().min(1).max(4),
  nombre: z.string().min(1).max(50),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cursoId = searchParams.get("cursoId");
  if (!cursoId) return NextResponse.json({ error: "cursoId requerido." }, { status: 400 });

  const bimestres = await prisma.bimestre.findMany({
    where: { cursoId, activo: true },
    orderBy: { numero: "asc" },
    include: {
      criterios: { where: { activo: true }, orderBy: { orden: "asc" } },
    },
  });
  return NextResponse.json(bimestres);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "VISUALIZADOR") {
    return NextResponse.json({ error: "Sin autorización." }, { status: 403 });
  }
  try {
    const data = schema.parse(await req.json());
    const bimestre = await prisma.bimestre.create({ data });
    return NextResponse.json(bimestre, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
    return NextResponse.json({ error: "Error al crear bimestre." }, { status: 500 });
  }
}
