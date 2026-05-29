import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  docenteId: z.string().nullable(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }
  try {
    const { docenteId } = schema.parse(await req.json());
    const assignment = await prisma.cursoAula.update({
      where: { id: params.id },
      data: { docenteId },
      include: {
        aula: { select: { id: true, seccion: true } },
        docente: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(assignment);
  } catch {
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }
  try {
    await prisma.cursoAula.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar." }, { status: 500 });
  }
}
