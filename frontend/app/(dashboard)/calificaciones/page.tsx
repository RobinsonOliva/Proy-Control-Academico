export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { ANIO_ACTUAL } from "@/lib/utils";
import Link from "next/link";
import { Award, ChevronRight, Lock } from "lucide-react";

async function getDataAdmin() {
  return prisma.curso.findMany({
    where: { activo: true },
    orderBy: [{ grado: { orden: "asc" } }, { nombre: "asc" }],
    include: {
      grado: { select: { nombre: true, nivel: true } },
      cursoAulas: {
        include: {
          aula: { select: { id: true, seccion: true } },
          docente: { select: { name: true } },
        },
        orderBy: { aula: { seccion: "asc" } },
      },
      _count: { select: { matriculas: true } },
    },
  });
}

async function getDataDocente(userId: string) {
  return prisma.cursoAula.findMany({
    where: { docenteId: userId },
    include: {
      curso: {
        include: { grado: { select: { nombre: true, nivel: true, orden: true } } },
      },
      aula: { select: { id: true, seccion: true } },
    },
    orderBy: [{ curso: { grado: { orden: "asc" } } }, { curso: { nombre: "asc" } }],
  });
}

async function countMatriculasPorAula(cursoId: string, aulaId: string) {
  return prisma.matricula.count({
    where: { cursoId, anio: ANIO_ACTUAL, activo: true, alumno: { aulaId } },
  });
}

export default async function CalificacionesPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const userId = session?.user?.id;

  if (role === "DOCENTE") {
    const asignaciones = await getDataDocente(userId!);

    if (asignaciones.length === 0) {
      return (
        <div className="space-y-6 animate-fade-in">
          <div className="page-header">
            <div>
              <h1 className="page-title">Calificaciones</h1>
              <p className="page-subtitle">Mis cursos asignados</p>
            </div>
          </div>
          <div className="card p-12 text-center text-gray-400">
            <Lock size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No tienes cursos asignados</p>
            <p className="text-sm mt-1">El administrador debe asignarte como docente de alguna sección.</p>
          </div>
        </div>
      );
    }

    const counts = await Promise.all(
      asignaciones.map((a) => countMatriculasPorAula(a.cursoId, a.aulaId))
    );

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Calificaciones</h1>
            <p className="page-subtitle">Mis secciones asignadas · {ANIO_ACTUAL}</p>
          </div>
        </div>
        <div className="card">
          <div className="divide-y divide-gray-100">
            {asignaciones.map((a, i) => (
              <Link
                key={a.id}
                href={`/calificaciones/${a.cursoId}/${a.aulaId}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: a.curso.color }}
                >
                  {a.curso.codigo.slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{a.curso.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {a.curso.grado.nombre} · Sección {a.aula.seccion} · {counts[i]} alumnos
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-primary-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ADMIN / VISUALIZADOR: all courses grouped by grade
  const cursos = await getDataAdmin();

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
          <p className="page-subtitle">Selecciona un curso y sección para ingresar notas</p>
        </div>
      </div>

      {Object.keys(cursosPorGrado).length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Award size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay cursos registrados</p>
          <p className="text-sm mt-1">Registra cursos y asigna docentes por sección para comenzar</p>
        </div>
      ) : (
        Object.entries(cursosPorGrado).map(([grado, lista]) => (
          <div key={grado} className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900">{grado}</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {lista.map((c) => (
                <div key={c.id}>
                  {c.cursoAulas.length === 0 ? (
                    // Course with no section assignments — admin can still access via course level
                    <Link
                      href={`/calificaciones/${c.id}`}
                      className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors group"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: c.color }}
                      >
                        {c.codigo.slice(0, 3)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{c.nombre}</p>
                        <p className="text-xs text-amber-500">Sin secciones asignadas · {c._count.matriculas} alumnos totales</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-primary-500 shrink-0" />
                    </Link>
                  ) : (
                    // One link per assigned section
                    c.cursoAulas.map((ca) => (
                      <Link
                        key={ca.aula.id}
                        href={`/calificaciones/${c.id}/${ca.aula.id}`}
                        className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors group"
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: c.color }}
                        >
                          {c.codigo.slice(0, 3)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">
                            {c.nombre}
                            <span className="ml-2 text-xs font-normal text-gray-400">Sec. {ca.aula.seccion}</span>
                          </p>
                          <p className="text-xs text-gray-400">
                            {ca.docente?.name ?? <span className="text-amber-500">Sin docente</span>}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-primary-500 shrink-0" />
                      </Link>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
