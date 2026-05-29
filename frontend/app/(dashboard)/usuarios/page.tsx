"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  UserCog, Plus, Copy, UserCheck, UserX, Mail,
  Pencil, Trash2, X, Save,
} from "lucide-react";

type User = { id: string; name: string; email: string; role: string; active: boolean; createdAt: string };
type Invitation = {
  id: string; email: string; code: string; role: string; used: boolean;
  expiresAt: string; createdAt: string; createdBy: { name: string };
};

const roleLabels: Record<string, string> = { ADMIN: "Administrador", DOCENTE: "Docente", VISUALIZADOR: "Visualizador" };
const roleColors: Record<string, string> = { ADMIN: "badge-purple", DOCENTE: "badge-blue", VISUALIZADOR: "badge-gray" };

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal: nueva invitación
  const [invModal, setInvModal] = useState(false);
  const [invForm, setInvForm] = useState({ email: "", role: "DOCENTE" });
  const [saving, setSaving] = useState(false);
  const [newCode, setNewCode] = useState("");

  // Modal: editar usuario
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: "", role: "DOCENTE" });
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/usuarios");
    if (!res.ok) return;
    const d = await res.json();
    setUsers(d.users || []);
    setInvitations(d.invitations || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Invitación ──────────────────────────────────────────
  async function createInvitation(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invForm),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); toast.error(d.error || "Error."); return; }
    const d = await res.json();
    setNewCode(d.code);
    toast.success("Invitación creada.");
    load();
  }

  async function deleteInvitation(id: string, email: string) {
    if (!confirm(`¿Eliminar la invitación para "${email}"?`)) return;
    const res = await fetch(`/api/invitaciones/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); toast.error(d.error || "Error."); return; }
    toast.success("Invitación eliminada.");
    load();
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado.");
  }

  // ── Usuarios ────────────────────────────────────────────
  async function toggleUser(id: string, active: boolean) {
    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    if (!res.ok) { toast.error("Error al actualizar."); return; }
    toast.success(!active ? "Usuario activado." : "Usuario desactivado.");
    load();
  }

  function openEdit(u: User) {
    setEditUser(u);
    setEditForm({ name: u.name, role: u.role });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditSaving(true);
    const res = await fetch(`/api/usuarios/${editUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditSaving(false);
    if (!res.ok) { const d = await res.json(); toast.error(d.error || "Error."); return; }
    toast.success("Usuario actualizado.");
    setEditUser(null);
    load();
  }

  async function deleteUser(u: User) {
    if (!confirm(`¿Eliminar permanentemente al usuario "${u.name}"?\nEsta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/usuarios/${u.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); toast.error(d.error || "Error."); return; }
    toast.success(`Usuario "${u.name}" eliminado.`);
    load();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Usuarios</h1>
          <p className="page-subtitle">Administra el acceso al sistema mediante invitaciones</p>
        </div>
        <button
          onClick={() => { setNewCode(""); setInvForm({ email: "", role: "DOCENTE" }); setInvModal(true); }}
          className="btn-primary"
        >
          <Plus size={16} /> Crear Invitación
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Usuarios del Sistema ── */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Usuarios del Sistema</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Cargando...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <UserCog size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-6 py-3 group">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm shrink-0">
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${u.active ? "text-gray-900" : "text-gray-400 line-through"}`}>
                      {u.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <span className={`badge ${roleColors[u.role]} shrink-0`}>{roleLabels[u.role]}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(u)}
                      className="btn-ghost btn-sm p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => toggleUser(u.id, u.active)}
                      className={`btn-ghost btn-sm p-1.5 ${u.active ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}
                      title={u.active ? "Desactivar" : "Activar"}
                    >
                      {u.active ? <UserCheck size={14} /> : <UserX size={14} />}
                    </button>
                    <button
                      onClick={() => deleteUser(u)}
                      className="btn-ghost btn-sm p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50"
                      title="Eliminar usuario"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Invitaciones ── */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Invitaciones Enviadas</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Cargando...</div>
          ) : invitations.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Mail size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay invitaciones aún</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {invitations.map((inv) => {
                const expired = new Date() > new Date(inv.expiresAt);
                return (
                  <div key={inv.id} className="flex items-center gap-3 px-6 py-3 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{inv.email}</p>
                      <p className="text-xs text-gray-400">
                        {roleLabels[inv.role]} · {inv.createdBy.name}
                      </p>
                    </div>
                    <span className={`badge shrink-0 ${inv.used ? "badge-green" : expired ? "badge-red" : "badge-yellow"}`}>
                      {inv.used ? "Usado" : expired ? "Expirado" : "Pendiente"}
                    </span>
                    {!inv.used && !expired && (
                      <button
                        onClick={() => copyCode(inv.code)}
                        className="btn-ghost btn-sm p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={`Código: ${inv.code}`}
                      >
                        <Copy size={14} />
                      </button>
                    )}
                    {!inv.used && (
                      <button
                        onClick={() => deleteInvitation(inv.id, inv.email)}
                        className="btn-ghost btn-sm p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar invitación"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Nueva Invitación ── */}
      {invModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-slide-in">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <UserCog size={20} className="text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Crear Invitación</h2>
                <p className="text-xs text-gray-500">Válida por 7 días</p>
              </div>
            </div>

            {newCode ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-emerald-700 mb-2 font-medium">¡Invitación creada!</p>
                  <p className="text-xs text-emerald-600 mb-3">Comparte este código con el usuario:</p>
                  <div className="flex items-center justify-between bg-white rounded-lg border border-emerald-200 px-4 py-2.5">
                    <span className="font-mono text-2xl font-bold tracking-widest text-gray-900">{newCode}</span>
                    <button onClick={() => copyCode(newCode)} className="btn-ghost btn-sm p-1.5">
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  El usuario debe ir a <strong>/register</strong> e ingresar este código junto a su email.
                </p>
                <button onClick={() => setInvModal(false)} className="btn-primary w-full">Entendido</button>
              </div>
            ) : (
              <form onSubmit={createInvitation} className="space-y-4">
                <div className="form-group">
                  <label className="label">Email del usuario</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="docente@colegio.edu"
                    value={invForm.email}
                    onChange={(e) => setInvForm({ ...invForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Rol</label>
                  <select className="input" value={invForm.role} onChange={(e) => setInvForm({ ...invForm, role: e.target.value })}>
                    <option value="DOCENTE">Docente</option>
                    <option value="VISUALIZADOR">Visualizador (solo lectura)</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setInvModal(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1">
                    {saving ? "Generando..." : "Generar Código"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Editar Usuario ── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-slide-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Editar Usuario</h2>
              <button onClick={() => setEditUser(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={saveEdit} className="p-6 space-y-4">
              <div className="form-group">
                <label className="label">Nombre</label>
                <input
                  type="text"
                  className="input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  minLength={2}
                />
              </div>
              <div className="form-group">
                <label className="label">Rol</label>
                <select
                  className="input"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  <option value="DOCENTE">Docente</option>
                  <option value="VISUALIZADOR">Visualizador (solo lectura)</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <p className="text-xs text-gray-400">Email: {editUser.email}</p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditUser(null)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={editSaving} className="btn-primary flex-1">
                  <Save size={14} />
                  {editSaving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
