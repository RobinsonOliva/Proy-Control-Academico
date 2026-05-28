"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, ClipboardList, ChevronDown } from "lucide-react";
import { ANIO_ACTUAL } from "@/lib/utils";

type Matricula = {
  id: string; anio: number; activo: boolean;
  alumno: { nombres: string; apellidos: string; codigo: string };
  curso: { nombre: string; codigo: string; color: string; grado: { nombre: string } };
};
type Alumno = { id: string; nombres: string; apellidos: string; codigo: string; grado: { id: string; nombre: string } };
type Curso = { id: string; nombre: string; codigo: string; color: string; gradoId: string };
type Grado = { id: string; nombre: string };

export default function MatriculasPage() {
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [grados, setGrados] = useState<Grado[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterGrado, setFilterGrado] = useState("");

  const [form, setForm] = useState({
    alumnoId: "", cursoIds: [] as string[], anio: ANIO_ACTUAL,
  });

  const alumnoSeleccionado = alumnos.find((a) => a.id === form.alumnoId);
  const cursosFiltrados = alumnoSeleccionado
    ? cursos.filter((c) => c.gradoId === alumnoSeleccionado.grado.id)
    : [];

  const load = useCallback(async () => {
    const params = new URLSearchParams({ anio: String(ANIO_ACTUAL) });
    if (filterGrado) params.set("gradoId", filterGrado);
    const [m, a, c, g] = await Promise.all([
      fetch(`/api/matriculas?${params}`).then((r) => r.json()),
      fetch("/api/alumnos").then((r) => r.json()),
      fetch("/api/cursos").then((r) => r.json()),
      fetch("/api/grados").then((r) => r.json()),
    ]);
    setMatriculas(m); setAlumnos(a); setCursos(c); setGrados(g); setLoading(false);
  }, [filterGrado]);

  useEffect(() => { load(); }, [load]);

  function toggleCurso(id: string) {
    setForm((f) => ({
      ...f,
      cursoIds: f.cursoIds.includes(id)
        ? f.cursoIds.filter((c) => c !== id)
        : [...f.cursoIds, id],
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cursoIds.length) { toast.error("Selecciona al menos un curso."); return; }
    setSaving(true);
    const res = await fetch("/api/matriculas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); toast.error(d.error || "Error."); return; }
    const d = await res.json();
    toast.success(`${d.created} matrícula(s) registradas.`);
    setModalOpen(false); setForm({ alumnoId: "", cursoIds: [], anio: ANIO_ACTUAL }); load();
  }

  async function del(id: string) {
    if (!confirm("¿Retirar esta matrícula?")) return;
    await fetch(`/api/matriculas/${id}`, { method: "DELETE" });
    toast.success("Matrícula retirada."); load();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Matrículas</h1>
          <p className="page-subtitle">Año {ANIO_ACTUAL} · {matriculas.length} matrículas activas</p>
        </div>
        <button onClick={() => { setForm({ alumnoId: "", cursoIds: [], anio: ANIO_ACTUAL }); setModalOpen(true); }}
          className="btn-primary"><Plus size={16} /> Matricular Alumno</button>
      </div>

      <div className="flex gap-3">
        <div className="relative">
          <select className="input pl-3 pr-8 appearance-none w-56"
            value={filterGrado} onChange={(e) => setFilterGrado(e.target.value)}>
            <option value="">Todos los grados</option>
            {grados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
          <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
            Cargando...
          </div>
        ) : matriculas.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <ClipboardList size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hay matrículas registradas</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Alumno</th><th>Grado</th><th>Curso</th><th>Año</th><th>Acción</th></tr>
              </thead>
              <tbody>
                {matriculas.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <p className="font-medium">{m.alumno.apellidos}, {m.alumno.nombres}</p>
                      <p className="text-xs text-gray-400 font-mono">{m.alumno.codigo}</p>
                    </td>
                    <td className="text-sm">{m.curso.grado.nombre}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.curso.color }} />
                        <span className="text-sm">{m.curso.nombre}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-gray">{m.anio}</span></td>
                    <td>
                      <button onClick={() => del(m.id)} className="btn-ghost btn-sm text-red-500 hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-slide-in">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Matricular Alumno en Cursos</h2>
            <form onSubmit={save} className="space-y-4">
              <div className="form-group">
                <label className="label">Alumno</label>
                <select className="input" value={form.alumnoId}
                  onChange={(e) => setForm({ ...form, alumnoId: e.target.value, cursoIds: [] })} required>
                  <option value="">Seleccionar alumno...</option>
                  {alumnos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.apellidos}, {a.nombres} — {a.grado.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {form.alumnoId && (
                <div className="form-group">
                  <label className="label">
                    Cursos disponibles para {alumnoSeleccionado?.grado.nombre}
                    <span className="text-gray-400 font-normal ml-1">({form.cursoIds.length} seleccionados)</span>
                  </label>
                  {cursosFiltrados.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">No hay cursos para este grado.</p>
                  ) : (
                    <div className="border border-gray-200 rounded-lg divide-y max-h-64 overflow-y-auto">
                      {cursosFiltrados.map((c) => (
                        <label key={c.id}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" checked={form.cursoIds.includes(c.id)}
                            onChange={() => toggleCurso(c.id)}
                            className="rounded border-gray-300 text-primary-600" />
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                          <span className="text-sm font-medium text-gray-700">{c.nombre}</span>
                          <span className="text-xs text-gray-400 ml-auto">{c.codigo}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving || !form.cursoIds.length} className="btn-primary flex-1">
                  {saving ? "Guardando..." : "Matricular"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
