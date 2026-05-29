import { PrismaClient, Role, Nivel } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // Admin user
  const adminPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || "Admin2025!",
    12
  );

  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || "admin@colegio.edu" },
    update: {},
    create: {
      name: process.env.ADMIN_NAME || "Administrador",
      email: process.env.ADMIN_EMAIL || "admin@colegio.edu",
      password: adminPassword,
      role: Role.ADMIN,
      active: true,
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // Grados - Primaria
  const gradosPrimaria = [
    { nombre: "1° Primaria", nivel: Nivel.PRIMARIA, orden: 1 },
    { nombre: "2° Primaria", nivel: Nivel.PRIMARIA, orden: 2 },
    { nombre: "3° Primaria", nivel: Nivel.PRIMARIA, orden: 3 },
    { nombre: "4° Primaria", nivel: Nivel.PRIMARIA, orden: 4 },
    { nombre: "5° Primaria", nivel: Nivel.PRIMARIA, orden: 5 },
    { nombre: "6° Primaria", nivel: Nivel.PRIMARIA, orden: 6 },
  ];

  const gradosSecundaria = [
    { nombre: "1° Secundaria", nivel: Nivel.SECUNDARIA, orden: 7 },
    { nombre: "2° Secundaria", nivel: Nivel.SECUNDARIA, orden: 8 },
    { nombre: "3° Secundaria", nivel: Nivel.SECUNDARIA, orden: 9 },
    { nombre: "4° Secundaria", nivel: Nivel.SECUNDARIA, orden: 10 },
    { nombre: "5° Secundaria", nivel: Nivel.SECUNDARIA, orden: 11 },
  ];

  const todosGrados = [...gradosPrimaria, ...gradosSecundaria];
  const gradosCreados: { id: string; nombre: string }[] = [];

  for (const g of todosGrados) {
    const grado = await prisma.grado.upsert({
      where: { id: `grado-${g.orden}` },
      update: {},
      create: { id: `grado-${g.orden}`, ...g },
    });
    gradosCreados.push(grado);
  }
  console.log(`✅ ${gradosCreados.length} grados creados`);

  // Aulas para los primeros 2 grados (demo)
  for (const gradoRef of gradosCreados.slice(0, 2)) {
    for (const seccion of ["A", "B"]) {
      await prisma.aula.upsert({
        where: { gradoId_seccion: { gradoId: gradoRef.id, seccion } },
        update: {},
        create: { gradoId: gradoRef.id, seccion, capacidad: 35 },
      });
    }
  }
  console.log("✅ Aulas de ejemplo creadas");

  // Cursos para primer grado primaria
  const primerGrado = gradosCreados.find((g) => g.nombre === "1° Primaria");
  if (primerGrado) {
    const cursosBase = [
      { nombre: "Matemática", codigo: "MAT", color: "#3B82F6" },
      { nombre: "Comunicación", codigo: "COM", color: "#10B981" },
      { nombre: "Ciencia y Tecnología", codigo: "CYT", color: "#F59E0B" },
      { nombre: "Personal Social", codigo: "PSO", color: "#EF4444" },
      { nombre: "Arte y Cultura", codigo: "AYC", color: "#8B5CF6" },
      { nombre: "Educación Física", codigo: "EDF", color: "#06B6D4" },
    ];

    for (const curso of cursosBase) {
      const c = await prisma.curso.upsert({
        where: { gradoId_codigo: { gradoId: primerGrado.id, codigo: curso.codigo } },
        update: {},
        create: { ...curso, gradoId: primerGrado.id },
      });

      // Crear 4 bimestres con criterios por defecto
      for (let num = 1; num <= 4; num++) {
        const bimestre = await prisma.bimestre.upsert({
          where: { cursoId_numero: { cursoId: c.id, numero: num } },
          update: {},
          create: {
            cursoId: c.id,
            numero: num,
            nombre: `${num}° Bimestre`,
          },
        });

        const criteriosDefault = [
          { nombre: "Evaluación Escrita", peso: 0.4, orden: 1 },
          { nombre: "Trabajo Práctico", peso: 0.3, orden: 2 },
          { nombre: "Participación", peso: 0.2, orden: 3 },
          { nombre: "Comportamiento", peso: 0.1, orden: 4 },
        ];

        for (const crit of criteriosDefault) {
          const existing = await prisma.criterio.findFirst({
            where: { bimestreId: bimestre.id, nombre: crit.nombre },
          });
          if (!existing) {
            await prisma.criterio.create({
              data: { ...crit, bimestreId: bimestre.id },
            });
          }
        }
      }
    }
    console.log(`✅ Cursos y bimestres para ${primerGrado.nombre}`);
  }

  console.log("\n🎉 Seed completado!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📧 Admin: ${process.env.ADMIN_EMAIL || "admin@colegio.edu"}`);
  console.log(`🔑 Contraseña: ${process.env.ADMIN_PASSWORD || "Admin2025!"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
