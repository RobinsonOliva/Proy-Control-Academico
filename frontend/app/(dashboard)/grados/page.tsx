"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, School } from "lucide-react";

type Nivel = "INICIAL" | "PRIMARIA" | "SECUNDARIA";
type Grado = {
  id: string; nombre: string; nivel: Nivel; orden: number; activo: boolean;
  aulas: { id: string; seccion: string }[];
  _count: { alumnos: number; cursos: number };
};

const nivelColors: Record<Nivel, string> = {
  INICIAL: "badge-red", PRIMARIA: "badge-blue", SECUNDARIA: "badge-purple"
};

const emptyForm = { nombre: "", nivel: "PRIMARIA" as Nivel, orden: 1 };

export default function GradosPage() {
  const [grados, setGrados] = useState<Grado[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Grado | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/grados");
    setGrados(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing(null); setForm(emptyForm); setModalOpen(true); }
  function openEdit(g: Grado) {
    setEditing(g);
    setForm({ nombre: g.nombre, nivel: g.nivel, orden: g.orden });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const url = editing ? `/api/grados/${editing.id}` : "/api/grados";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (!res.ok) { toast.error("Error al guardar."); return; }
    toast.success(editing ? "Grado actualizado." : "Grado creado.");
    setModalOpen(false); load();
  }

  async function del(id: string) {
    if (!confirm("¿Eliminar este grado?")) return;
    const res = await fetch(`/api/grados/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Grado eliminado."); load(); }
    else toast.error("No se pudo eliminar.");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Grados</h1>
          <p className="page-subtitle">Gestiona los grados y niveles educativos</p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus size={16} /> Nuevo Grado
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p>Cargando...</p>
          </div>
        ) : grados.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <School size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hay grados registrados</p>
            <p className="text-sm mt-1">Crea el primer grado para comenzar</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Grado</th><th>Nivel</th><th>Aulas</th><th>Alumnos</th><th>Cursos</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {grados.map((g) => (
                  <tr key={g.id}>
                    <td className="font-medium">{g.nombre}</td>
                    <td><span className={nivelColors[g.nivel] + " badge"}>{g.nivel}</span></td>
                    <td>{g.aulas.length} secciones</td>
                    <td>{g._count.alumnos}</td>
                    <td>{g._count.cursos}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(g)} className="btn-ghost btn-sm">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => del(g.id)} className="btn-ghost btn-sm text-red-500 hover:bg-red-50">
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-slide-in">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editing ? "Editar Grado" : "Nuevo Grado"}
            </h2>
            <form onSubmit={save} className="space-y-4">
              <div className="form-group">
                <label className="label">Nombre del grado</label>
                <input className="input" placeholder="Ej: 1° Primaria" value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label">Nivel</label>
                  <select className="input" value={form.nivel}
                    onChange={(e) => setForm({ ...form, nivel: e.target.value as Nivel })}>
                    <option value="INICIAL">Inicial</option>
                    <option value="PRIMARIA">Primaria</option>
                    <option value="SECUNDARIA">Secundaria</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Orden</label>
                  <input type="number" className="input" min={1} max={20} value={form.orden}
                    onChange={(e) => setForm({ ...form, orden: parseInt(e.target.value) })} required />
                </div>
              </div>
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
    </div>
  );
}
