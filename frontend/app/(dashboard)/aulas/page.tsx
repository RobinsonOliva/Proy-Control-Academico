"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, School2 } from "lucide-react";

type Aula = {
  id: string; seccion: string; capacidad: number; gradoId: string; activo: boolean;
  grado: { nombre: string; nivel: string };
  _count: { alumnos: number };
};
type Grado = { id: string; nombre: string; nivel: string };

export default function AulasPage() {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [grados, setGrados] = useState<Grado[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Aula | null>(null);
  const [form, setForm] = useState({ seccion: "", capacidad: 35, gradoId: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [a, g] = await Promise.all([
      fetch("/api/aulas").then((r) => r.json()),
      fetch("/api/grados").then((r) => r.json()),
    ]);
    setAulas(a); setGrados(g); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing(null); setForm({ seccion: "", capacidad: 35, gradoId: grados[0]?.id ?? "" }); setModalOpen(true); }
  function openEdit(a: Aula) { setEditing(a); setForm({ seccion: a.seccion, capacidad: a.capacidad, gradoId: a.gradoId }); setModalOpen(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const url = editing ? `/api/aulas/${editing.id}` : "/api/aulas";
    const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); toast.error(d.error || "Error."); return; }
    toast.success(editing ? "Aula actualizada." : "Aula creada.");
    setModalOpen(false); load();
  }

  async function del(id: string) {
    if (!confirm("¿Eliminar este aula?")) return;
    const res = await fetch(`/api/aulas/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Aula eliminada."); load(); } else toast.error("Error al eliminar.");
  }

  const nivelLabels: Record<string, string> = { INICIAL: "Inicial", PRIMARIA: "Primaria", SECUNDARIA: "Secundaria" };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Aulas</h1>
          <p className="page-subtitle">Secciones por grado registradas en la institución</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Nueva Aula</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
            Cargando...
          </div>
        ) : aulas.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <School2 size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hay aulas registradas</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Sección</th><th>Grado</th><th>Nivel</th><th>Capacidad</th><th>Alumnos</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {aulas.map((a) => (
                  <tr key={a.id}>
                    <td><span className="font-semibold text-primary-600">Sección {a.seccion}</span></td>
                    <td>{a.grado.nombre}</td>
                    <td><span className="badge badge-blue">{nivelLabels[a.grado.nivel] || a.grado.nivel}</span></td>
                    <td>{a.capacidad} alumnos</td>
                    <td>
                      <span className={`font-medium ${a._count.alumnos > a.capacidad ? "text-red-600" : "text-gray-800"}`}>
                        {a._count.alumnos}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(a)} className="btn-ghost btn-sm"><Pencil size={14} /></button>
                        <button onClick={() => del(a.id)} className="btn-ghost btn-sm text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
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
            <h2 className="text-lg font-bold text-gray-900 mb-5">{editing ? "Editar Aula" : "Nueva Aula"}</h2>
            <form onSubmit={save} className="space-y-4">
              <div className="form-group">
                <label className="label">Grado</label>
                <select className="input" value={form.gradoId}
                  onChange={(e) => setForm({ ...form, gradoId: e.target.value })} required>
                  <option value="">Seleccionar grado...</option>
                  {grados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label">Sección</label>
                  <input className="input" placeholder="A, B, C..." value={form.seccion}
                    onChange={(e) => setForm({ ...form, seccion: e.target.value.toUpperCase() })} required maxLength={5} />
                </div>
                <div className="form-group">
                  <label className="label">Capacidad</label>
                  <input type="number" className="input" min={1} max={60} value={form.capacidad}
                    onChange={(e) => setForm({ ...form, capacidad: parseInt(e.target.value) })} required />
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
