"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Settings, Users2, Check, X } from "lucide-react";
import Link from "next/link";

type CursoAula = {
  id: string;
  aulaId: string;
  docenteId: string | null;
  aula: { id: string; seccion: string };
  docente: { id: string; name: string } | null;
};

type Curso = {
  id: string; nombre: string; codigo: string; color: string; activo: boolean;
  gradoId: string;
  grado: { id: string; nombre: string };
  cursoAulas: CursoAula[];
  _count: { matriculas: number; bimestres: number };
};

type Grado = { id: string; nombre: string };
type Aula = { id: string; seccion: string; gradoId: string };
type UserItem = { id: string; name: string; role: string };

const COLORS = [
  "#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6",
  "#06B6D4","#F97316","#EC4899","#14B8A6","#6366F1",
];

const emptyForm = { nombre: "", codigo: "", descripcion: "", color: "#4F46E5", gradoId: "" };

export default function CursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [grados, setGrados] = useState<Grado[]>([]);
  const [docentes, setDocentes] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal crear/editar curso
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Curso | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Modal asignar docentes por sección
  const [assignModal, setAssignModal] = useState<Curso | null>(null);
  const [aulasPorGrado, setAulasPorGrado] = useState<Aula[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [savingAssign, setSavingAssign] = useState(false);

  const load = useCallback(async () => {
    const [c, g, u] = await Promise.all([
      fetch("/api/cursos").then((r) => r.json()),
      fetch("/api/grados").then((r) => r.json()),
      fetch("/api/usuarios").then((r) => r.json()).then((d) => d.users || []).catch(() => []),
    ]);
    setCursos(c);
    setGrados(g);
    setDocentes(u.filter((u: UserItem) => ["ADMIN","DOCENTE"].includes(u.role)));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm, gradoId: grados[0]?.id ?? "" });
    setModalOpen(true);
  }

  function openEdit(c: Curso) {
    setEditing(c);
    setForm({ nombre: c.nombre, codigo: c.codigo, descripcion: "", color: c.color, gradoId: c.gradoId });
    setModalOpen(true);
  }

  async function openAssign(c: Curso) {
    setAssignModal(c);
    const aulas: Aula[] = await fetch(`/api/aulas?gradoId=${c.gradoId}`).then((r) => r.json());
    setAulasPorGrado(aulas);
    const map: Record<string, string> = {};
    for (const ca of c.cursoAulas) {
      map[ca.aulaId] = ca.docenteId ?? "";
    }
    setAssignments(map);
  }

  async function saveAssignments() {
    if (!assignModal) return;
    setSavingAssign(true);
    try {
      await Promise.all(
        aulasPorGrado.map((aula) =>
          fetch("/api/curso-aula", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cursoId: assignModal.id,
              aulaId: aula.id,
              docenteId: assignments[aula.id] || null,
            }),
          })
        )
      );
      toast.success("Asignaciones guardadas.");
      setAssignModal(null);
      load();
    } catch {
      toast.error("Error al guardar asignaciones.");
    } finally {
      setSavingAssign(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const url = editing ? `/api/cursos/${editing.id}` : "/api/cursos";
    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); toast.error(d.error || "Error."); return; }
    toast.success(editing ? "Curso actualizado." : "Curso creado (con 4 bimestres).");
    setModalOpen(false); load();
  }

  async function del(id: string) {
    if (!confirm("¿Eliminar este curso? Se eliminarán todos sus bimestres y calificaciones.")) return;
    const res = await fetch(`/api/cursos/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Curso eliminado."); load(); } else toast.error("Error al eliminar.");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cursos</h1>
          <p className="page-subtitle">{cursos.length} cursos registrados · Con 4 bimestres automáticos</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Nuevo Curso</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
            Cargando...
          </div>
        ) : cursos.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="font-medium">No hay cursos registrados</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Grado</th>
                  <th>Docentes por sección</th>
                  <th>Alumnos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cursos.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: c.color }}
                        >
                          {c.codigo.slice(0, 3)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.nombre}</p>
                          <p className="text-xs text-gray-400">{c.codigo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{c.grado.nombre}</td>
                    <td className="text-sm">
                      {c.cursoAulas.length === 0 ? (
                        <span className="text-gray-300 text-xs">Sin asignar</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {c.cursoAulas.map((ca) => (
                            <span key={ca.id} className="text-xs text-gray-600">
                              <span className="font-medium">Sec. {ca.aula.seccion}:</span>{" "}
                              {ca.docente?.name ?? <span className="text-gray-300">—</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>{c._count.matriculas}</td>
                    <td>
                      <div className="flex gap-1">
                        <Link
                          href={`/calificaciones/${c.id}`}
                          className="btn-ghost btn-sm text-primary-600"
                          title="Ver notas"
                        >
                          <Settings size={14} />
                        </Link>
                        <button
                          onClick={() => openAssign(c)}
                          className="btn-ghost btn-sm text-emerald-600"
                          title="Asignar docentes por sección"
                        >
                          <Users2 size={14} />
                        </button>
                        <button onClick={() => openEdit(c)} className="btn-ghost btn-sm" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => del(c.id)}
                          className="btn-ghost btn-sm text-red-500 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Curso */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-slide-in">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editing ? "Editar Curso" : "Nuevo Curso"}
            </h2>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="form-group col-span-2">
                  <label className="label">Nombre del curso</label>
                  <input
                    className="input"
                    placeholder="Ej: Matemática"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Código</label>
                  <input
                    className="input uppercase"
                    placeholder="MAT"
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                    required
                    maxLength={10}
                    disabled={!!editing}
                  />
                </div>
              </div>
              {!editing && (
                <div className="form-group">
                  <label className="label">Grado</label>
                  <select
                    className="input"
                    value={form.gradoId}
                    onChange={(e) => setForm({ ...form, gradoId: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar grado...</option>
                    {grados.map((g) => (
                      <option key={g.id} value={g.id}>{g.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="label">Color identificador</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-8 h-8 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-gray-500 scale-110" : "hover:scale-105"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Los docentes por sección se asignan con el botón <Users2 size={12} className="inline" /> en la tabla.
              </p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asignar Docentes por Sección */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-slide-in">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: assignModal.color }}
              >
                {assignModal.codigo.slice(0, 3)}
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">{assignModal.nombre}</h2>
                <p className="text-xs text-gray-400">{assignModal.grado.nombre} · Asignar docente por sección</p>
              </div>
            </div>

            {aulasPorGrado.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-sm">
                No hay aulas registradas para este grado.
              </div>
            ) : (
              <div className="space-y-3 mb-5">
                {aulasPorGrado.map((aula) => (
                  <div key={aula.id} className="flex items-center gap-3">
                    <span className="w-20 text-sm font-medium text-gray-700 shrink-0">
                      Sección {aula.seccion}
                    </span>
                    <select
                      className="input flex-1"
                      value={assignments[aula.id] ?? ""}
                      onChange={(e) => setAssignments({ ...assignments, [aula.id]: e.target.value })}
                    >
                      <option value="">Sin docente asignado</option>
                      {docentes.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAssignModal(null)}
                className="btn-secondary flex-1 flex items-center justify-center gap-1.5"
              >
                <X size={14} /> Cancelar
              </button>
              <button
                onClick={saveAssignments}
                disabled={savingAssign || aulasPorGrado.length === 0}
                className="btn-primary flex-1 flex items-center justify-center gap-1.5"
              >
                <Check size={14} /> {savingAssign ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
