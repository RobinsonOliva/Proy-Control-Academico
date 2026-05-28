export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { Users, BookOpen, GraduationCap, School, TrendingUp, Award } from "lucide-react";
import Link from "next/link";

async function getStats() {
  const [totalAlumnos, totalDocentes, totalCursos, totalGrados, cursosRecientes, alumnosPorNivel] =
    await Promise.all([
      prisma.alumno.count({ where: { activo: true } }),
      prisma.user.count({ where: { active: true, role: { in: ["DOCENTE", "ADMIN"] } } }),
      prisma.curso.count({ where: { activo: true } }),
      prisma.grado.count({ where: { activo: true } }),
      prisma.curso.findMany({
        where: { activo: true },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          grado: { select: { nombre: true } },
          _count: { select: { matriculas: true } },
        },
      }),
      prisma.grado.groupBy({
        by: ["nivel"],
        where: { activo: true },
        _count: { id: true },
      }),
    ]);

  return { totalAlumnos, totalDocentes, totalCursos, totalGrados, cursosRecientes, alumnosPorNivel };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const stats = await getStats();

  const statsCards = [
    { label: "Total Alumnos", value: stats.totalAlumnos, icon: Users, color: "bg-blue-500", bg: "bg-blue-50", href: "/alumnos" },
    { label: "Docentes", value: stats.totalDocentes, icon: GraduationCap, color: "bg-purple-500", bg: "bg-purple-50", href: "/usuarios" },
    { label: "Cursos Activos", value: stats.totalCursos, icon: BookOpen, color: "bg-emerald-500", bg: "bg-emerald-50", href: "/cursos" },
    { label: "Grados", value: stats.totalGrados, icon: School, color: "bg-amber-500", bg: "bg-amber-50", href: "/grados" },
  ];

  const nivelColors: Record<string, string> = {
    INICIAL: "bg-pink-100 text-pink-700",
    PRIMARIA: "bg-blue-100 text-blue-700",
    SECUNDARIA: "bg-violet-100 text-violet-700",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Bienvenida */}
      <div className="card p-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white border-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-200 text-sm">Bienvenido de vuelta,</p>
            <h2 className="text-2xl font-bold mt-0.5">{session?.user?.name}</h2>
            <p className="text-primary-200 text-sm mt-1">
              Año escolar {new Date().getFullYear()} • {
                session?.user?.role === "ADMIN" ? "Administrador" :
                  session?.user?.role === "DOCENTE" ? "Docente" : "Visualizador"
              }
            </p>
          </div>
          <div className="hidden sm:flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10">
            <Award size={32} className="text-white" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href} className="card p-5 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon size={20} className={color.replace("bg-", "text-")} />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-primary-600">
              <TrendingUp size={12} />
              <span>Ver todos</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cursos recientes */}
        <div className="card lg:col-span-2">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Cursos Recientes</h3>
            <Link href="/cursos" className="text-sm text-primary-600 hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.cursosRecientes.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <BookOpen size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay cursos registrados</p>
              </div>
            ) : (
              stats.cursosRecientes.map((curso) => (
                <div key={curso.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: curso.color }}
                  >
                    {curso.codigo.slice(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{curso.nombre}</p>
                    <p className="text-xs text-gray-400">{curso.grado.nombre}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {curso._count.matriculas} alumnos
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Distribución por nivel */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Grados por Nivel</h3>
          </div>
          <div className="p-6 space-y-4">
            {stats.alumnosPorNivel.length === 0 ? (
              <p className="text-sm text-gray-400 text-center">Sin datos</p>
            ) : (
              stats.alumnosPorNivel.map((item) => (
                <div key={item.nivel} className="flex items-center justify-between">
                  <span className={`badge ${nivelColors[item.nivel] || "badge-gray"}`}>
                    {item.nivel}
                  </span>
                  <span className="font-semibold text-gray-800">{item._count.id} grados</span>
                </div>
              ))
            )}

            <div className="pt-4 border-t border-gray-100 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Accesos Rápidos</p>
              {[
                { label: "Registrar Alumno", href: "/alumnos" },
                { label: "Ingresar Notas", href: "/calificaciones" },
                { label: "Ver Reportes", href: "/reportes" },
              ].map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
