import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const config = await prisma.configuracion.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ anioEscolar: config?.anioEscolar ?? new Date().getFullYear() });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }
  const { anioEscolar } = z.object({ anioEscolar: z.number().int().min(2000).max(2100) }).parse(await req.json());
  const config = await prisma.configuracion.upsert({
    where: { id: "singleton" },
    update: { anioEscolar },
    create: { id: "singleton", anioEscolar },
  });
  return NextResponse.json({ anioEscolar: config.anioEscolar });
}
