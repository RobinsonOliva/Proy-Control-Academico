import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const config = await prisma.configuracion.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    anioEscolar: config?.anioEscolar ?? new Date().getFullYear(),
    institucionEducativa: config?.institucionEducativa ?? "Santa María",
    seccionLibreta: config?.seccionLibreta ?? "Única",
    bimestreMerito: config?.bimestreMerito ?? 4,
  });
}

const configSchema = z.object({
  anioEscolar: z.number().int().min(2000).max(2100),
  institucionEducativa: z.string().min(1).max(200),
  seccionLibreta: z.string().min(1).max(50),
  bimestreMerito: z.number().int().min(1).max(4),
});

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }
  const { anioEscolar, institucionEducativa, seccionLibreta, bimestreMerito } = configSchema.parse(
    await req.json()
  );
  const config = await prisma.configuracion.upsert({
    where: { id: "singleton" },
    update: { anioEscolar, institucionEducativa, seccionLibreta, bimestreMerito },
    create: { id: "singleton", anioEscolar, institucionEducativa, seccionLibreta, bimestreMerito },
  });
  return NextResponse.json({
    anioEscolar: config.anioEscolar,
    institucionEducativa: config.institucionEducativa,
    seccionLibreta: config.seccionLibreta,
    bimestreMerito: config.bimestreMerito,
  });
}
