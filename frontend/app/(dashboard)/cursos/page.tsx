"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, BookOpen, Settings } from "lucide-react";
import Link from "next/link";

type Curso = {
  id: string; nombre: string; codigo: string; color: string; activo: boolean;
  grado: { nombre: string }; docente: { name: string } | null;
  _count: { matriculas: number; bimestres: number };
};
type Grado = { id: string; nombre: string };
type User = { id: string; name: string };

const COLORS = [
  "#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6",
  "#06B6D4","#F97316","#EC4899","#14B8A6","#6366F1",
];

const emptyForm = { nombre: "", codigo: "", descripcion: "", color: "#4F46E5", gradoId: "", docenteId: "" };

export default function CursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [grados, setGrados] = useState<Grado[]>([]);
  const [docentes, setDocentes] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Curso | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [c, g, u] = await Promise.all([
      fetch("/api/cursos").then((r) => r.json()),
      fetch("/api/grados").then((r) => r.json()),
      fetch("/api/usuarios").then((r) => r.json()).then((d) => d.users || []).catch(() => []),
    ]);
    setCursos(c); setGrados(g); setDocentes(u.filter((u: { role: string }) => ["ADMIN","DOCENTE"].includes(u.role)));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing(null); setForm({ ...emptyForm, gradoId: grados[0]?.id ?? "" }); setModalOpen(true); }
  function openEdit(c: Curso) {
    setEditing(c);
    setForm({ nombre: c.nombre, codigo: c.codigo, descripcion: "", color: c.color, gradoId: "", docenteId: c.docente ? "" : "" });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const url = editing ? `/api/cursos/${editing.id}` : "/api/cursos";
    const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); toast.error(d.error || "Error."); return; }
    toast.success(editing ? "Curso actualizado." : "Curso creado (con 4 bimestres).");
    setModalOpen(false); load();
  }

  async function del(id: string) {
    if (!confirm("¿Eliminar este curso?")) return;
    const res = await fetch(`/api/cursos/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Curso eliminado."); load(); } else toast.error("Error al eliminar.");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cursos</h1>
          <p className="page-subtitle">{cursos.length} cursos registrados · Se crean con 4 bimestres automáticamente</p>
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
            <BookOpen size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hay cursos registrados</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Curso</th><th>Grado</th><th>Docente</th><th>Alumnos</th><th>Bimestres</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {cursos.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: c.color }}>
                          {c.codigo.slice(0, 3)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.nombre}</p>
                          <p className="text-xs text-gray-400">{c.codigo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{c.grado.nombre}</td>
                    <td className="text-sm text-gray-500">{c.docente?.name || <span className="text-gray-300">—</span>}</td>
                    <td>{c._count.matriculas}</td>
                    <td>{c._count.bimestres}</td>
                    <td>
                      <div className="flex gap-1">
                        <Link href={`/calificaciones/${c.id}`} className="btn-ghost btn-sm text-primary-600" title="Ver notas">
                          <Settings size={14} />
                        </Link>
                        <button onClick={() => openEdit(c)} className="btn-ghost btn-sm"><Pencil size={14} /></button>
                        <button onClick={() => del(c.id)} className="btn-ghost btn-sm text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
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
            <h2 className="text-lg font-bold text-gray-900 mb-5">{editing ? "Editar Curso" : "Nuevo Curso"}</h2>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="form-group col-span-2">
                  <label className="label">Nombre del curso</label>
                  <input className="input" placeholder="Ej: Matemática" value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="label">Código</label>
                  <input className="input uppercase" placeholder="MAT" value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} required maxLength={10} />
                </div>
              </div>
              {!editing && (
                <div className="form-group">
                  <label className="label">Grado</label>
                  <select className="input" value={form.gradoId}
                    onChange={(e) => setForm({ ...form, gradoId: e.target.value })} required>
                    <option value="">Seleccionar grado...</option>
                    {grados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="label">Docente asignado</label>
                <select className="input" value={form.docenteId}
                  onChange={(e) => setForm({ ...form, docenteId: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {docentes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Color identificador</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {COLORS.map((c) => (
                    <button key={c} type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-8 h-8 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-gray-500 scale-110" : "hover:scale-105"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "Guardando..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
