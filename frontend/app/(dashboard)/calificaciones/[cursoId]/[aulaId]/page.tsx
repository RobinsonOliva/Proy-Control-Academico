export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAnioEscolar } from "@/lib/config";
import GradeGrid from "@/components/grades/grade-grid";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

async function getData(cursoId: string, aulaId: string, anio: number) {
  const [curso, aula] = await Promise.all([
    prisma.curso.findUnique({
      where: { id: cursoId },
      include: {
        grado: true,
        bimestres: {
          where: { activo: true },
          orderBy: { numero: "asc" },
          include: {
            criterios: { where: { activo: true }, orderBy: { orden: "asc" } },
          },
        },
      },
    }),
    prisma.aula.findUnique({ where: { id: aulaId } }),
  ]);

  if (!curso || !aula) return null;

  const matriculas = await prisma.matricula.findMany({
    where: {
      cursoId,
      anio,
      activo: true,
      alumno: { aulaId },
    },
    include: {
      alumno: { select: { id: true, nombres: true, apellidos: true, codigo: true } },
      calificaciones: {
        include: { criterio: { select: { id: true, bimestreId: true } } },
      },
    },
    orderBy: [{ alumno: { apellidos: "asc" } }, { alumno: { nombres: "asc" } }],
  });

  return { curso, aula, matriculas };
}

export default async function CursoAulaCalificacionesPage({
  params,
}: {
  params: { cursoId: string; aulaId: string };
}) {
  const anio = await getAnioEscolar();
  const data = await getData(params.cursoId, params.aulaId, anio);
  if (!data) notFound();

  const { curso, aula, matriculas } = data;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/calificaciones/${curso.id}`} className="btn-ghost btn-sm p-1.5">
          <ChevronLeft size={18} />
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: curso.color }}
          >
            {curso.codigo.slice(0, 3)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{curso.nombre}</h1>
            <p className="text-sm text-gray-500">
              {curso.grado.nombre} · Sección {aula.seccion} · {anio} · {matriculas.length} alumnos
            </p>
          </div>
        </div>
      </div>

      {/* Escala vigesimal */}
      <div className="flex gap-3 text-xs flex-wrap">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> AD: 18-20 (Logro Destacado)
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> A: 14-17 (Logro Esperado)
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> B: 11-13 (En Proceso)
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-medium">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> C: 0-10 (En Inicio)
        </span>
      </div>

      {/* Grilla de notas */}
      <GradeGrid
        cursoId={curso.id}
        bimestres={curso.bimestres}
        matriculas={matriculas}
      />
    </div>
  );
}
