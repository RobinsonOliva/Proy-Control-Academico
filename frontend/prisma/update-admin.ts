import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@colegio.edu";
  const password = process.env.ADMIN_PASSWORD || "Admin2025!";
  const name = process.env.ADMIN_NAME || "Administrador";

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, password: hashed },
    create: { name, email, password: hashed, role: "ADMIN", active: true },
  });

  console.log(`✅ Admin actualizado: ${user.email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
