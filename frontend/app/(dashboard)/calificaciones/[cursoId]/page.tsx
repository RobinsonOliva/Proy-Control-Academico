export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { ANIO_ACTUAL } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";

async function getData(cursoId: string) {
  const curso = await prisma.curso.findUnique({
    where: { id: cursoId, activo: true },
    include: {
      grado: true,
      cursoAulas: {
        include: {
          aula: { select: { id: true, seccion: true } },
          docente: { select: { name: true } },
        },
        orderBy: { aula: { seccion: "asc" } },
      },
    },
  });
  return curso;
}

async function getAulasConAlumnos(cursoId: string) {
  // Distinct aulas that have students enrolled in this course
  const matriculas = await prisma.matricula.findMany({
    where: { cursoId, anio: ANIO_ACTUAL, activo: true },
    select: { alumno: { select: { aulaId: true, aula: { select: { id: true, seccion: true } } } } },
  });
  const map = new Map<string, { id: string; seccion: string; count: number }>();
  for (const m of matriculas) {
    const { aulaId, aula } = m.alumno;
    if (!map.has(aulaId)) map.set(aulaId, { ...aula, count: 0 });
    map.get(aulaId)!.count++;
  }
  return Array.from(map.values()).sort((a, b) => a.seccion.localeCompare(b.seccion));
}

export default async function CursoSectionsPage({ params }: { params: { cursoId: string } }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  const curso = await getData(params.cursoId);
  if (!curso) notFound();

  // If DOCENTE: redirect directly to their section (if only one), else show their sections
  if (role === "DOCENTE") {
    const myAssignment = curso.cursoAulas.find(
      (ca) => ca.docenteId === session!.user.id
    );
    if (myAssignment) {
      redirect(`/calificaciones/${params.cursoId}/${myAssignment.aula.id}`);
    }
    // No assignment → show nothing meaningful
  }

  // ADMIN / VISUALIZADOR: if only one section assigned, auto-redirect
  if (curso.cursoAulas.length === 1) {
    redirect(`/calificaciones/${params.cursoId}/${curso.cursoAulas[0].aula.id}`);
  }

  // Multiple sections or no CursoAula: show section selector
  const aulasConAlumnos = await getAulasConAlumnos(params.cursoId);

  // Merge CursoAula info with enrollment data
  const docenteByAula = Object.fromEntries(
    curso.cursoAulas.map((ca) => [ca.aula.id, ca.docente?.name])
  );

  const sections =
    aulasConAlumnos.length > 0
      ? aulasConAlumnos
      : curso.cursoAulas.map((ca) => ({ id: ca.aula.id, seccion: ca.aula.seccion, count: 0 }));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/calificaciones" className="btn-ghost btn-sm p-1.5">
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
            <p className="text-sm text-gray-500">{curso.grado.nombre} · Selecciona una sección</p>
          </div>
        </div>
      </div>

      <div className="card">
        {sections.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Users size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hay alumnos matriculados en este curso</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sections.map((aula) => (
              <Link
                key={aula.id}
                href={`/calificaciones/${params.cursoId}/${aula.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700 text-sm shrink-0">
                  {aula.seccion}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Sección {aula.seccion}</p>
                  <p className="text-xs text-gray-400">
                    {aula.count} alumno{aula.count !== 1 ? "s" : ""} matriculados
                    {docenteByAula[aula.id] ? ` · ${docenteByAula[aula.id]}` : ""}
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-primary-500 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
