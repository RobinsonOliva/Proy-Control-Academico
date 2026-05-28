import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  peso: z.number().min(0).max(10).optional(),
  orden: z.number().int().optional(),
  activo: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "VISUALIZADOR") {
    return NextResponse.json({ error: "Sin autorización." }, { status: 403 });
  }
  try {
    const data = schema.parse(await req.json());
    const criterio = await prisma.criterio.update({ where: { id: params.id }, data });
    return NextResponse.json(criterio);
  } catch {
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "VISUALIZADOR") {
    return NextResponse.json({ error: "Sin autorización." }, { status: 403 });
  }
  try {
    await prisma.criterio.update({ where: { id: params.id }, data: { activo: false } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar." }, { status: 500 });
  }
}
