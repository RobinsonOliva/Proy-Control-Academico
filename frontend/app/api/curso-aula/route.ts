import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  cursoId: z.string().min(1),
  aulaId: z.string().min(1),
  docenteId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cursoId = searchParams.get("cursoId");

  const assignments = await prisma.cursoAula.findMany({
    where: { ...(cursoId ? { cursoId } : {}) },
    include: {
      aula: { select: { id: true, seccion: true } },
      docente: { select: { id: true, name: true } },
    },
    orderBy: { aula: { seccion: "asc" } },
  });
  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }
  try {
    const data = schema.parse(await req.json());
    const assignment = await prisma.cursoAula.upsert({
      where: { cursoId_aulaId: { cursoId: data.cursoId, aulaId: data.aulaId } },
      update: { docenteId: data.docenteId ?? null },
      create: { cursoId: data.cursoId, aulaId: data.aulaId, docenteId: data.docenteId ?? null },
      include: {
        aula: { select: { id: true, seccion: true } },
        docente: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(assignment, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
    return NextResponse.json({ error: "Error al guardar asignación." }, { status: 500 });
  }
}
