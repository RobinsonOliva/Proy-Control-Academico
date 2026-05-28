export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import Link from "next/link";
import { Award, ChevronRight } from "lucide-react";

async function getCursos() {
  return prisma.curso.findMany({
    where: { activo: true },
    orderBy: [{ grado: { orden: "asc" } }, { nombre: "asc" }],
    include: {
      grado: { select: { nombre: true, nivel: true } },
      _count: { select: { matriculas: true } },
    },
  });
}

export default async function CalificacionesPage() {
  const cursos = await getCursos();

  const cursosPorGrado = cursos.reduce<Record<string, typeof cursos>>((acc, c) => {
    const key = c.grado.nombre;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Calificaciones</h1>
          <p className="page-subtitle">Selecciona un curso para ingresar o ver las notas</p>
        </div>
      </div>

      {Object.keys(cursosPorGrado).length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Award size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay cursos registrados</p>
          <p className="text-sm mt-1">Registra cursos y matricula alumnos para comenzar</p>
        </div>
      ) : (
        Object.entries(cursosPorGrado).map(([grado, lista]) => (
          <div key={grado} className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">{grado}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              {lista.map((c) => (
                <Link
                  key={c.id}
                  href={`/calificaciones/${c.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.codigo.slice(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{c.nombre}</p>
                    <p className="text-xs text-gray-400">{c._count.matriculas} alumnos matriculados</p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-gray-300 group-hover:text-primary-500 transition-colors shrink-0"
                  />
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
