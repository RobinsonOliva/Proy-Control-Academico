import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ alumnos: [], cursos: [], grados: [] });
  }

  const [alumnos, cursos, grados] = await Promise.all([
    prisma.alumno.findMany({
      where: {
        activo: true,
        OR: [
          { nombres: { contains: q, mode: "insensitive" } },
          { apellidos: { contains: q, mode: "insensitive" } },
          { codigo: { contains: q, mode: "insensitive" } },
          { dni: { contains: q } },
        ],
      },
      take: 10,
      select: {
        id: true, nombres: true, apellidos: true, codigo: true,
        grado: { select: { nombre: true } },
        aula: { select: { seccion: true } },
      },
    }),
    prisma.curso.findMany({
      where: {
        activo: true,
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { codigo: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: {
        id: true, nombre: true, codigo: true, color: true,
        grado: { select: { nombre: true } },
      },
    }),
    prisma.grado.findMany({
      where: {
        activo: true,
        nombre: { contains: q, mode: "insensitive" },
      },
      take: 5,
      select: { id: true, nombre: true, nivel: true },
    }),
  ]);

  return NextResponse.json({ alumnos, cursos, grados });
}
