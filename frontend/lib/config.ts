import { prisma } from "@/lib/db";

export async function getAnioEscolar(): Promise<number> {
  try {
    const config = await prisma.configuracion.findUnique({ where: { id: "singleton" } });
    return config?.anioEscolar ?? new Date().getFullYear();
  } catch {
    return new Date().getFullYear();
  }
}
