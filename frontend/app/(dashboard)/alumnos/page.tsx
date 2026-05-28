"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Users, Search, ChevronDown } from "lucide-react";

type Alumno = {
  id: string; nombres: string; apellidos: string; codigo: string;
  dni?: string | null; sexo: string; activo: boolean;
  grado: { id: string; nombre: string }; aula: { id: string; seccion: string };
  _count: { matriculas: number };
};
type Grado = { id: string; nombre: string; aulas: { id: string; seccion: string }[] };

const emptyForm = {
  nombres: "", apellidos: "", codigo: "", dni: "", sexo: "MASCULINO",
  email: "", telefono: "", direccion: "", gradoId: "", aulaId: "", fechaNacimiento: "",
};

export default function AlumnosPage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [grados, setGrados] = useState<Grado[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Alumno | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [filterGrado, setFilterGrado] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterGrado) params.set("gradoId", filterGrado);
    if (searchQ) params.set("q", searchQ);
    const [a, g] = await Promise.all([
      fetch(`/api/alumnos?${params}`).then((r) => r.json()),
      fetch("/api/grados").then((r) => r.json()),
    ]);
    setAlumnos(a); setGrados(g); setLoading(false);
  }, [searchQ, filterGrado]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  const aulasFiltradas = form.gradoId
    ? grados.find((g) => g.id === form.gradoId)?.aulas ?? []
    : [];

  function openNew() { setEditing(null); setForm({ ...emptyForm, gradoId: grados[0]?.id ?? "" }); setModalOpen(true); }
  function openEdit(a: Alumno) {
    setEditing(a);
    setForm({ ...emptyForm, nombres: a.nombres, apellidos: a.apellidos, codigo: a.codigo,
      dni: a.dni ?? "", sexo: a.sexo, gradoId: a.grado.id, aulaId: a.aula.id });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const url = editing ? `/api/alumnos/${editing.id}` : "/api/alumnos";
    const body = { ...form, dni: form.dni || null, email: form.email || null,
      telefono: form.telefono || null, direccion: form.direccion || null,
      fechaNacimiento: form.fechaNacimiento || null };
    const res = await fetch(url, { method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); toast.error(d.error || "Error."); return; }
    toast.success(editing ? "Alumno actualizado." : "Alumno registrado.");
    setModalOpen(false); load();
  }

  async function del(id: string) {
    if (!confirm("¿Eliminar este alumno?")) return;
    await fetch(`/api/alumnos/${id}`, { method: "DELETE" });
    toast.success("Alumno eliminado."); load();
  }

  // Generar código automático
  function generateCode() {
    const year = new Date().getFullYear().toString().slice(-2);
    const rand = Math.floor(Math.random() * 9000 + 1000);
    setForm((f) => ({ ...f, codigo: `${year}${rand}` }));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alumnos</h1>
          <p className="page-subtitle">{alumnos.length} alumnos encontrados</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Nuevo Alumno</button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar por nombre, código, DNI..."
            value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
        </div>
        <div className="relative">
          <select className="input pl-3 pr-8 appearance-none w-48"
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
            Buscando...
          </div>
        ) : alumnos.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Users size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No se encontraron alumnos</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Alumno</th><th>Código</th><th>DNI</th><th>Grado</th><th>Sección</th><th>Cursos</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {alumnos.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${a.sexo === "FEMENINO" ? "bg-pink-400" : "bg-blue-400"}`}>
                          {a.apellidos.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{a.apellidos}, {a.nombres}</p>
                          <p className="text-xs text-gray-400">{a.sexo === "FEMENINO" ? "Femenino" : "Masculino"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-sm">{a.codigo}</td>
                    <td className="text-gray-500">{a.dni || "—"}</td>
                    <td className="text-sm">{a.grado.nombre}</td>
                    <td><span className="badge badge-blue">Sección {a.aula.seccion}</span></td>
                    <td>{a._count.matriculas}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 animate-slide-in my-4">
            <h2 className="text-lg font-bold text-gray-900 mb-5">{editing ? "Editar Alumno" : "Registrar Alumno"}</h2>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label">Apellidos</label>
                  <input className="input" placeholder="GARCIA LOPEZ" value={form.apellidos}
                    onChange={(e) => setForm({ ...form, apellidos: e.target.value.toUpperCase() })} required />
                </div>
                <div className="form-group">
                  <label className="label">Nombres</label>
                  <input className="input" placeholder="JUAN CARLOS" value={form.nombres}
                    onChange={(e) => setForm({ ...form, nombres: e.target.value.toUpperCase() })} required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="form-group">
                  <label className="label">Código alumno</label>
                  <div className="flex gap-1">
                    <input className="input font-mono" placeholder="25001" value={form.codigo}
                      onChange={(e) => setForm({ ...form, codigo: e.target.value })} required />
                    <button type="button" onClick={generateCode}
                      className="btn-secondary btn-sm px-2" title="Generar">⟳</button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">DNI</label>
                  <input className="input" placeholder="12345678" value={form.dni}
                    onChange={(e) => setForm({ ...form, dni: e.target.value })} maxLength={12} />
                </div>
                <div className="form-group">
                  <label className="label">Sexo</label>
                  <select className="input" value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })}>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMENINO">Femenino</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label">Grado</label>
                  <select className="input" value={form.gradoId}
                    onChange={(e) => setForm({ ...form, gradoId: e.target.value, aulaId: "" })} required>
                    <option value="">Seleccionar...</option>
                    {grados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Sección</label>
                  <select className="input" value={form.aulaId}
                    onChange={(e) => setForm({ ...form, aulaId: e.target.value })} required>
                    <option value="">Seleccionar...</option>
                    {aulasFiltradas.map((a) => <option key={a.id} value={a.id}>Sección {a.seccion}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="form-group">
                  <label className="label">Fecha nacimiento</label>
                  <input type="date" className="input" value={form.fechaNacimiento}
                    onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Email (opcional)</label>
                  <input type="email" className="input" placeholder="..." value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Teléfono (opcional)</label>
                  <input className="input" placeholder="..." value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
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
