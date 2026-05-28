import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Role } from "@prisma/client";
import { generateCode } from "@/lib/utils";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role).default(Role.DOCENTE),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }

  const [users, invitations] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invitation.findMany({
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({ users, invitations });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }

  try {
    const { email, role } = inviteSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese correo." }, { status: 409 });
    }

    const code = generateCode(8);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const invitation = await prisma.invitation.create({
      data: {
        email: email.toLowerCase(),
        code,
        role,
        expiresAt,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ invitation, code }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
    return NextResponse.json({ error: "Error al crear invitación." }, { status: 500 });
  }
}
