import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  bimestreId: z.string().min(1),
  nombre: z.string().min(1).max(100),
  peso: z.number().min(0).max(10),
  orden: z.number().int().default(0),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin autorización." }, { status: 403 });
  }
  try {
    const data = schema.parse(await req.json());
    const criterio = await prisma.criterio.create({ data });
    return NextResponse.json(criterio, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
    return NextResponse.json({ error: "Error al crear criterio." }, { status: 500 });
  }
}
