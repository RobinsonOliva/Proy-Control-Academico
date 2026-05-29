"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  Plus, Trash2, ClipboardList, Search, X,
  ChevronDown, User, CheckCircle2, AlertCircle, UserPlus
} from "lucide-react";
import { ANIO_ACTUAL, cn } from "@/lib/utils";

type Alumno = {
  id: string; nombres: string; apellidos: string; codigo: string;
  grado: { id: string; nombre: string };
  aula: { id: string; seccion: string };
  _count: { matriculas: number };
};

type CursoAula = { aulaId: string; docenteId: string | null; docente: { id: string; name: string } | null };

type Curso = {
  id: string; nombre: string; codigo: string; color: string; gradoId: string;
  cursoAulas: CursoAula[];
};

type Matricula = {
  id: string; anio: number;
  alumno: {
    id: string; nombres: string; apellidos: string; codigo: string;
    grado: { id: string; nombre: string };
    aula: { id: string; seccion: string };
  };
  curso: { id: string; nombre: string; codigo: string; color: string; grado: { nombre: string } };
};

type Grado = { id: string; nombre: string };

export default function MatriculasPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [grados, setGrados] = useState<Grado[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterGrado, setFilterGrado] = useState("");

  // Búsqueda de alumno
  const [alumnoQuery, setAlumnoQuery] = useState("");
  const [alumnoResults, setAlumnoResults] = useState<Alumno[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<Alumno | null>(null);
  const [buscandoAlumno, setBuscandoAlumno] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [cursoIds, setCursoIds] = useState<string[]>([]);
  const [cursosYaMatriculados, setCursosYaMatriculados] = useState<string[]>([]);

  // Solo cursos con docente asignado en la sección del alumno
  const cursosFiltrados = alumnoSeleccionado
    ? cursos.filter(
        (c) =>
          c.gradoId === alumnoSeleccionado.grado.id &&
          c.cursoAulas.some(
            (ca) => ca.aulaId === alumnoSeleccionado.aula.id && ca.docenteId !== null
          )
      )
    : [];

  const load = useCallback(async () => {
    const params = new URLSearchParams({ anio: String(ANIO_ACTUAL) });
    if (filterGrado) params.set("gradoId", filterGrado);
    const [m, c, g] = await Promise.all([
      fetch(`/api/matriculas?${params}`).then((r) => r.json()),
      fetch("/api/cursos").then((r) => r.json()),
      fetch("/api/grados").then((r) => r.json()),
    ]);
    setMatriculas(Array.isArray(m) ? m : []);
    setCursos(Array.isArray(c) ? c : []);
    setGrados(Array.isArray(g) ? g : []);
    setLoading(false);
  }, [filterGrado]);

  useEffect(() => { load(); }, [load]);

  // Búsqueda de alumno en tiempo real
  useEffect(() => {
    if (alumnoQuery.trim().length < 2) {
      setAlumnoResults([]); setShowDropdown(false); return;
    }
    const t = setTimeout(async () => {
      setBuscandoAlumno(true);
      const res = await fetch(`/api/alumnos?q=${encodeURIComponent(alumnoQuery)}`);
      const data = await res.json();
      setAlumnoResults(Array.isArray(data) ? data.slice(0, 8) : []);
      setShowDropdown(true);
      setBuscandoAlumno(false);
    }, 300);
    return () => clearTimeout(t);
  }, [alumnoQuery]);

  async function seleccionarAlumno(alumno: Alumno) {
    setAlumnoSeleccionado(alumno);
    setAlumnoQuery(`${alumno.apellidos}, ${alumno.nombres}`);
    setShowDropdown(false);
    setCursoIds([]);
    const res = await fetch(`/api/matriculas?alumnoId=${alumno.id}&anio=${ANIO_ACTUAL}`);
    const data = await res.json();
    setCursosYaMatriculados(
      Array.isArray(data) ? data.map((m: { curso: { id: string } }) => m.curso.id) : []
    );
  }

  function limpiarSeleccion() {
    setAlumnoSeleccionado(null);
    setAlumnoQuery("");
    setAlumnoResults([]);
    setCursoIds([]);
    setCursosYaMatriculados([]);
  }

  function toggleCurso(id: string) {
    setCursoIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!alumnoSeleccionado) { toast.error("Selecciona un alumno."); return; }
    if (!cursoIds.length) { toast.error("Selecciona al menos un curso."); return; }
    setSaving(true);
    const res = await fetch("/api/matriculas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alumnoId: alumnoSeleccionado.id, cursoIds, anio: ANIO_ACTUAL }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); toast.error(d.error || "Error."); return; }
    const d = await res.json();
    toast.success(`${d.created} matrícula(s) registradas.`);
    setModalOpen(false);
    limpiarSeleccion();
    load();
  }

  async function retirar(id: string, label: string) {
    if (!confirm(`¿Retirar la matrícula de "${label}"?`)) return;
    await fetch(`/api/matriculas/${id}`, { method: "DELETE" });
    toast.success("Matrícula retirada.");
    load();
  }

  function abrirModalParaAlumno(mat: Matricula) {
    limpiarSeleccion();
    const alumno: Alumno = {
      id: mat.alumno.id,
      nombres: mat.alumno.nombres,
      apellidos: mat.alumno.apellidos,
      codigo: mat.alumno.codigo,
      grado: mat.alumno.grado,
      aula: mat.alumno.aula,
      _count: { matriculas: 0 },
    };
    seleccionarAlumno(alumno);
    setModalOpen(true);
  }

  const matriculasPorAlumno = matriculas.reduce<Record<string, Matricula[]>>((acc, m) => {
    const key = m.alumno.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Matrículas</h1>
          <p className="page-subtitle">
            Año {ANIO_ACTUAL} · {matriculas.length} matrículas activas
            {!isAdmin && " · Solo administradores pueden matricular"}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { limpiarSeleccion(); setModalOpen(true); }}
            className="btn-primary"
          >
            <Plus size={16} /> Matricular Alumno
          </button>
        )}
      </div>

      {/* Filtro por grado */}
      <div className="flex gap-3">
        <div className="relative">
          <select
            className="input pl-3 pr-8 appearance-none w-56"
            value={filterGrado}
            onChange={(e) => setFilterGrado(e.target.value)}
          >
            <option value="">Todos los grados</option>
            {grados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
          <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
            Cargando...
          </div>
        ) : Object.keys(matriculasPorAlumno).length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <ClipboardList size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hay matrículas registradas</p>
            <p className="text-sm mt-1">Usa el botón "Matricular Alumno" para comenzar</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Grado · Sección</th>
                  <th>Cursos matriculados</th>
                  <th>Total</th>
                  {isAdmin && <th>Acción</th>}
                </tr>
              </thead>
              <tbody>
                {Object.entries(matriculasPorAlumno).map(([alumnoId, mats]) => {
                  const { alumno } = mats[0];
                  return (
                    <tr key={alumnoId}>
                      <td>
                        <p className="font-medium text-gray-900">
                          {alumno.apellidos}, {alumno.nombres}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">{alumno.codigo}</p>
                      </td>
                      <td className="text-sm text-gray-600">
                        {alumno.grado.nombre}
                        <span className="ml-1 text-gray-400">· Sec. {alumno.aula.seccion}</span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {mats.map((m) => (
                            <div key={m.id} className="flex items-center gap-1 group">
                              <span
                                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white font-medium"
                                style={{ backgroundColor: m.curso.color }}
                              >
                                {m.curso.codigo}
                              </span>
                              {isAdmin && (
                                <button
                                  onClick={() => retirar(m.id, `${alumno.apellidos} - ${m.curso.nombre}`)}
                                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                                  title={`Retirar ${m.curso.nombre}`}
                                >
                                  <X size={11} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-blue">{mats.length} cursos</span>
                      </td>
                      {isAdmin && (
                        <td>
                          <button
                            onClick={() => abrirModalParaAlumno(mats[0])}
                            className="btn-ghost btn-sm text-primary-600 flex items-center gap-1"
                            title="Agregar más cursos a este alumno"
                          >
                            <UserPlus size={14} />
                            <span className="text-xs">Agregar curso</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de matrícula */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-slide-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Matricular Alumno</h2>
                <p className="text-xs text-gray-400">Año escolar {ANIO_ACTUAL}</p>
              </div>
              <button
                onClick={() => { setModalOpen(false); limpiarSeleccion(); }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={save} className="p-6 space-y-5">
              {/* Buscador de alumno */}
              <div className="form-group">
                <label className="label">
                  Buscar alumno
                  <span className="text-gray-400 font-normal ml-1">(nombre, apellido o código)</span>
                </label>
                <div ref={searchRef} className="relative">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      className={cn(
                        "input pl-9 pr-9",
                        alumnoSeleccionado && "border-emerald-400 bg-emerald-50"
                      )}
                      placeholder="Ej: García, Juan o código 25001..."
                      value={alumnoQuery}
                      onChange={(e) => {
                        setAlumnoQuery(e.target.value);
                        if (alumnoSeleccionado) limpiarSeleccion();
                      }}
                      autoFocus
                    />
                    {buscandoAlumno && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin w-3.5 h-3.5 border-2 border-primary-400 border-t-transparent rounded-full" />
                      </div>
                    )}
                    {alumnoSeleccionado && (
                      <button type="button" onClick={limpiarSeleccion}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {showDropdown && alumnoResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                      {alumnoResults.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => seleccionarAlumno(a)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary-50 text-left transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-xs shrink-0">
                            {a.apellidos.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {a.apellidos}, {a.nombres}
                            </p>
                            <p className="text-xs text-gray-400">
                              {a.grado.nombre} · Sección {a.aula.seccion} · Cód. {a.codigo}
                            </p>
                          </div>
                          <span className="text-xs text-gray-300">{a._count.matriculas} cursos</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {showDropdown && alumnoResults.length === 0 && !buscandoAlumno && alumnoQuery.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg p-4 text-center text-sm text-gray-400">
                      No se encontraron alumnos con &quot;{alumnoQuery}&quot;
                    </div>
                  )}
                </div>
              </div>

              {/* Ficha del alumno seleccionado */}
              {alumnoSeleccionado && (
                <div className="rounded-xl bg-primary-50 border border-primary-100 px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                    {alumnoSeleccionado.apellidos.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-primary-900 text-sm">
                      {alumnoSeleccionado.apellidos}, {alumnoSeleccionado.nombres}
                    </p>
                    <p className="text-xs text-primary-600">
                      {alumnoSeleccionado.grado.nombre} · Sección {alumnoSeleccionado.aula.seccion}
                    </p>
                  </div>
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                </div>
              )}

              {/* Cursos disponibles para la sección del alumno */}
              {alumnoSeleccionado && (
                <div className="form-group">
                  <label className="label">
                    Cursos de {alumnoSeleccionado.grado.nombre} · Sección {alumnoSeleccionado.aula.seccion}
                    <span className="text-gray-400 font-normal ml-1">
                      ({cursoIds.length} nuevos seleccionados)
                    </span>
                  </label>

                  {cursosFiltrados.length === 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-2 text-sm text-amber-700">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Sin cursos asignados para esta sección</p>
                        <p className="text-xs mt-0.5">
                          Ve a <strong>Cursos</strong> y usa el botón 👥 para asignar docentes
                          por sección en {alumnoSeleccionado.grado.nombre}.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl divide-y max-h-56 overflow-y-auto">
                      {cursosFiltrados.map((c) => {
                        const yaMatriculado = cursosYaMatriculados.includes(c.id);
                        const seleccionado = cursoIds.includes(c.id);
                        const docente = c.cursoAulas.find(
                          (ca) => ca.aulaId === alumnoSeleccionado.aula.id
                        )?.docente;
                        return (
                          <label
                            key={c.id}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                              yaMatriculado ? "bg-gray-50 cursor-not-allowed opacity-60" : "hover:bg-gray-50",
                              seleccionado && "bg-primary-50"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={seleccionado || yaMatriculado}
                              disabled={yaMatriculado}
                              onChange={() => !yaMatriculado && toggleCurso(c.id)}
                              className="rounded border-gray-300 text-primary-600 disabled:opacity-50"
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0"
                              style={{ backgroundColor: c.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-800">{c.nombre}</span>
                              {docente && (
                                <span className="text-xs text-gray-400 ml-2">· {docente.name}</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 shrink-0">{c.codigo}</span>
                            {yaMatriculado && (
                              <span className="badge badge-green shrink-0">Ya matriculado</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {!alumnoSeleccionado && (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-gray-400">
                  <User size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Busca y selecciona un alumno para ver los cursos de su sección</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); limpiarSeleccion(); }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !alumnoSeleccionado || cursoIds.length === 0}
                  className="btn-primary flex-1"
                >
                  {saving ? "Guardando..." : `Matricular en ${cursoIds.length || 0} curso(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
