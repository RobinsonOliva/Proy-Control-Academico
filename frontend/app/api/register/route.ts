import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  code: z.string().min(4).max(20),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const invitation = await prisma.invitation.findUnique({
      where: { code: data.code.toUpperCase() },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Código de invitación inválido." }, { status: 400 });
    }
    if (invitation.used) {
      return NextResponse.json({ error: "Este código ya fue utilizado." }, { status: 400 });
    }
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ error: "El código de invitación ha expirado." }, { status: 400 });
    }
    if (invitation.email.toLowerCase() !== data.email.toLowerCase()) {
      return NextResponse.json({ error: "El correo no coincide con la invitación." }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (exists) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese correo." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(data.password, 12);

    await prisma.$transaction([
      prisma.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          password: hashed,
          role: invitation.role,
          active: true,
        },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({ message: "Cuenta creada exitosamente." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 422 });
    }
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
