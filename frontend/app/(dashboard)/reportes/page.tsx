export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { getAnioEscolar } from "@/lib/config";
import Link from "next/link";
import { BarChart3, TrendingUp, Users, Award } from "lucide-react";

async function getReportData(anio: number) {
  const [cursos, totalAlumnos, totalMatriculas, resumenCursos] = await Promise.all([
    prisma.curso.count({ where: { activo: true } }),
    prisma.alumno.count({ where: { activo: true } }),
    prisma.matricula.count({ where: { activo: true, anio } }),
    prisma.curso.findMany({
      where: { activo: true },
      orderBy: [{ grado: { orden: "asc" } }, { nombre: "asc" }],
      include: {
        grado: { select: { nombre: true } },
        _count: { select: { matriculas: { where: { anio, activo: true } } } },
        bimestres: {
          where: { activo: true },
          include: {
            criterios: {
              where: { activo: true },
              include: {
                calificaciones: {
                  select: { nota: true },
                  where: { nota: { not: null }, matricula: { anio, activo: true } },
                },
              },
            },
          },
        },
      },
      take: 20,
    }),
  ]);
  return { cursos, totalAlumnos, totalMatriculas, resumenCursos };
}

function calcCourseAverage(curso: Awaited<ReturnType<typeof getReportData>>["resumenCursos"][0]) {
  const notas: number[] = [];
  for (const b of curso.bimestres)
    for (const c of b.criterios)
      for (const cal of c.calificaciones)
        if (cal.nota !== null) notas.push(cal.nota);
  if (notas.length === 0) return null;
  return notas.reduce((a, b) => a + b, 0) / notas.length;
}

export default async function ReportesPage() {
  const anio = await getAnioEscolar();
  const data = await getReportData(anio);

  const statsCards = [
    { label: "Alumnos Activos", value: data.totalAlumnos,   icon: Users,     color: "text-blue-600",   bg: "bg-blue-50" },
    { label: "Cursos Activos",  value: data.cursos,          icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Matrículas",      value: data.totalMatriculas, icon: Award,     color: "text-emerald-600",bg: "bg-emerald-50" },
    { label: "Año Escolar",     value: anio,                 icon: TrendingUp,color: "text-amber-600",  bg: "bg-amber-50" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Visión global del rendimiento académico {anio}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={20} className={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Rendimiento por Curso</h3>
          <span className="badge badge-blue">{anio}</span>
        </div>
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead>
              <tr>
                <th>Curso</th><th>Grado</th><th>Alumnos</th>
                <th>Promedio General</th><th>Nivel</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.resumenCursos.map((curso) => {
                const promedio = calcCourseAverage(curso);
                const nivel = promedio === null ? "—"
                  : promedio >= 18 ? "AD" : promedio >= 14 ? "A" : promedio >= 11 ? "B" : "C";
                const color = promedio === null ? "badge-gray"
                  : promedio >= 18 ? "badge-green" : promedio >= 14 ? "badge-blue"
                  : promedio >= 11 ? "badge-yellow" : "badge-red";
                const bar = promedio !== null ? Math.round((promedio / 20) * 100) : 0;
                return (
                  <tr key={curso.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: curso.color }} />
                        <span className="font-medium">{curso.nombre}</span>
                      </div>
                    </td>
                    <td className="text-sm text-gray-500">{curso.grado.nombre}</td>
                    <td>{curso._count.matriculas}</td>
                    <td>
                      {promedio !== null ? (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-24">
                            <div className={`h-2 rounded-full ${promedio >= 18 ? "bg-emerald-400" : promedio >= 14 ? "bg-blue-400" : promedio >= 11 ? "bg-amber-400" : "bg-red-400"}`}
                              style={{ width: `${bar}%` }} />
                          </div>
                          <span className="font-semibold text-sm w-10 text-right">{promedio.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-sm">Sin notas</span>
                      )}
                    </td>
                    <td><span className={`badge ${color}`}>{nivel}</span></td>
                    <td>
                      <Link href={`/calificaciones/${curso.id}`} className="btn-ghost btn-sm text-primary-600">
                        Ver notas
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
