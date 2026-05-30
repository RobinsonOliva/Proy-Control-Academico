"use client";

import React, { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Settings, Plus, Trash2, Lock, Pencil, Check, X } from "lucide-react";
import {
  calcularPromedioBimestre, calcularPromedioGeneral,
  formatNota, getGradeLabel, cn
} from "@/lib/utils";

type Criterio = { id: string; nombre: string; peso: number; orden: number };
type Bimestre = { id: string; nombre: string; numero: number; criterios: Criterio[] };
type Calificacion = { criterio: { id: string; bimestreId: string }; nota: number | null };
type Matricula = {
  id: string;
  alumno: { id: string; nombres: string; apellidos: string; codigo: string };
  calificaciones: Calificacion[];
};

interface Props {
  cursoId: string;
  bimestres: Bimestre[];
  matriculas: Matricula[];
}

function getGradeCellClass(nota: number | null | undefined) {
  if (nota === null || nota === undefined) return "";
  if (nota >= 18) return "grade-ad";
  if (nota >= 14) return "grade-a";
  if (nota >= 11) return "grade-b";
  return "grade-c";
}

function calcPorcentaje(peso: number, criterios: Criterio[]): string {
  const total = criterios.reduce((a, c) => a + c.peso, 0);
  if (total === 0) return "0%";
  return `${Math.round((peso / total) * 100)}%`;
}

export default function GradeGrid({ cursoId, bimestres, matriculas }: Props) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const isVisualizador = session?.user?.role === "VISUALIZADOR";

  const initNotas = () => {
    const map: Record<string, Record<string, number | null>> = {};
    for (const m of matriculas) {
      map[m.id] = {};
      for (const cal of m.calificaciones) {
        map[m.id][cal.criterio.id] = cal.nota;
      }
    }
    return map;
  };

  const [notas, setNotas] = useState<Record<string, Record<string, number | null>>>(initNotas);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [configOpen, setConfigOpen] = useState(false);
  const [bimestresState, setBimestresState] = useState<Bimestre[]>(bimestres);
  const [newCriterio, setNewCriterio] = useState({ bimestreId: "", nombre: "", peso: 1 });

  // Estado para edición inline de criterio
  const [editingCriterio, setEditingCriterio] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nombre: "", peso: 1 });

  const handleNotaChange = useCallback(
    (matriculaId: string, criterioId: string, value: string) => {
      const nota = value === "" ? null : Math.min(20, Math.max(0, parseFloat(value)));
      setNotas((prev) => ({
        ...prev,
        [matriculaId]: { ...prev[matriculaId], [criterioId]: nota },
      }));
    }, []
  );

  const handleNotaBlur = useCallback(
    async (matriculaId: string, criterioId: string) => {
      const nota = notas[matriculaId]?.[criterioId] ?? null;
      const key = `${matriculaId}-${criterioId}`;
      setSaving((p) => ({ ...p, [key]: true }));
      try {
        await fetch(`/api/calificaciones/${cursoId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matriculaId, criterioId, nota }),
        });
      } catch {
        toast.error("Error al guardar nota.");
      } finally {
        setSaving((p) => ({ ...p, [key]: false }));
      }
    }, [notas, cursoId]
  );

  const calcPromBimestre = (matriculaId: string, bimestre: Bimestre) => {
    const notasArr = bimestre.criterios.map((c) => notas[matriculaId]?.[c.id] ?? null);
    const pesosArr = bimestre.criterios.map((c) => c.peso);
    return calcularPromedioBimestre(notasArr, pesosArr);
  };

  const calcPromGeneral = (matriculaId: string) => {
    const proms = bimestresState.map((b) => calcPromBimestre(matriculaId, b));
    return calcularPromedioGeneral(proms);
  };

  async function addCriterio(e: React.FormEvent) {
    e.preventDefault();
    if (newCriterio.peso <= 0) { toast.error("El peso debe ser mayor a 0."); return; }
    const res = await fetch("/api/criterios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newCriterio, orden: 99 }),
    });
    if (!res.ok) { const d = await res.json(); toast.error(d.error || "Error al agregar."); return; }
    const crit = await res.json();
    setBimestresState((prev) =>
      prev.map((b) => b.id === newCriterio.bimestreId
        ? { ...b, criterios: [...b.criterios, crit] } : b)
    );
    setNewCriterio({ bimestreId: "", nombre: "", peso: 1 });
    toast.success("Criterio agregado.");
  }

  function startEdit(c: Criterio) {
    setEditingCriterio(c.id);
    setEditForm({ nombre: c.nombre, peso: c.peso });
  }

  async function saveEdit(bimestreId: string, criterioId: string) {
    if (editForm.peso <= 0) { toast.error("El peso debe ser mayor a 0."); return; }
    const res = await fetch(`/api/criterios/${criterioId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editForm.nombre, peso: editForm.peso }),
    });
    if (!res.ok) { toast.error("Error al actualizar."); return; }
    const updated = await res.json();
    setBimestresState((prev) =>
      prev.map((b) => b.id === bimestreId
        ? { ...b, criterios: b.criterios.map((c) => c.id === criterioId ? { ...c, ...updated } : c) }
        : b)
    );
    setEditingCriterio(null);
    toast.success("Criterio actualizado.");
  }

  async function removeCriterio(bimestreId: string, criterioId: string, nombre: string) {
    if (!confirm(`¿Eliminar el criterio "${nombre}"? Se perderán todas las notas asociadas.`)) return;
    const res = await fetch(`/api/criterios/${criterioId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error al eliminar."); return; }
    setBimestresState((prev) =>
      prev.map((b) => b.id === bimestreId
        ? { ...b, criterios: b.criterios.filter((c) => c.id !== criterioId) } : b)
    );
    toast.success("Criterio eliminado.");
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500 hidden sm:block">
          {matriculas.length} alumnos ·{" "}
          {isVisualizador
            ? "Solo lectura"
            : "Notas guardadas automáticamente"}
        </p>
        <p className="text-xs text-gray-400 sm:hidden">
          {matriculas.length} alumnos · {isVisualizador ? "Solo lectura" : "Auto-guardado"}
        </p>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <button
              onClick={() => setConfigOpen(!configOpen)}
              className={cn(
                "btn-secondary btn-sm gap-1.5",
                configOpen && "bg-primary-50 text-primary-700 border-primary-200"
              )}
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Configurar Criterios</span>
              <span className="sm:hidden">Criterios</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <Lock size={12} />
              <span className="hidden sm:inline">Criterios configurados por el administrador</span>
              <span className="sm:hidden">Solo lectura</span>
            </span>
          )}
        </div>
      </div>

      {/* Panel de configuración — solo ADMIN */}
      {isAdmin && configOpen && (
        <div className="card border-primary-100 bg-primary-50/30 animate-slide-in">
          <div className="card-header bg-primary-50/50 border-primary-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-primary-900 text-sm">
                  Configuración de Criterios de Evaluación
                </h3>
                <p className="text-xs text-primary-600 mt-0.5">
                  El porcentaje se calcula automáticamente en base a los pesos relativos
                </p>
              </div>
              <span className="badge badge-purple">Solo Admin</span>
            </div>
          </div>

          <div className="p-5 space-y-6">
            {bimestresState.map((b) => {
              const totalPeso = b.criterios.reduce((a, c) => a + c.peso, 0);
              return (
                <div key={b.id}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-800">{b.nombre}</p>
                    <span className="text-xs text-gray-400">
                      {b.criterios.length} criterio(s) · Suma pesos: {totalPeso}
                    </span>
                  </div>

                  {b.criterios.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">Sin criterios — agrega al menos uno</p>
                  ) : (
                    <div className="space-y-1.5">
                      {b.criterios.map((c) => (
                        <div key={c.id}
                          className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100">
                          {editingCriterio === c.id ? (
                            // Modo edición inline
                            <>
                              <input
                                className="input flex-1 text-sm py-1 h-8"
                                value={editForm.nombre}
                                onChange={(e) => setEditForm((p) => ({ ...p, nombre: e.target.value }))}
                                autoFocus
                              />
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-xs text-gray-400">Peso:</span>
                                <input
                                  type="number" min={0.1} max={100} step={0.1}
                                  className="input w-16 text-sm py-1 h-8 text-center"
                                  value={editForm.peso}
                                  onChange={(e) => setEditForm((p) => ({ ...p, peso: parseFloat(e.target.value) }))}
                                />
                              </div>
                              <button
                                onClick={() => saveEdit(b.id, c.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Guardar"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setEditingCriterio(null)}
                                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                title="Cancelar"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            // Modo lectura
                            <>
                              <span className="flex-1 text-sm text-gray-800">{c.nombre}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                                  {calcPorcentaje(c.peso, b.criterios)}
                                </span>
                                <span className="text-xs text-gray-400">
                                  (peso: {c.peso})
                                </span>
                              </div>
                              <button
                                onClick={() => startEdit(c)}
                                className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                                title="Editar"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => removeCriterio(b.id, c.id, c.nombre)}
                                className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded"
                                title="Eliminar"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Agregar criterio */}
            <form onSubmit={addCriterio} className="border-t border-primary-100 pt-4">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                Agregar Nuevo Criterio
              </p>
              <div className="flex gap-2 flex-wrap">
                <select
                  className="input w-44 text-sm"
                  value={newCriterio.bimestreId}
                  onChange={(e) => setNewCriterio((p) => ({ ...p, bimestreId: e.target.value }))}
                  required
                >
                  <option value="">Seleccionar bimestre...</option>
                  {bimestresState.map((b) => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
                <input
                  className="input flex-1 min-w-40 text-sm"
                  placeholder="Nombre del criterio (ej: Examen Final)"
                  value={newCriterio.nombre}
                  onChange={(e) => setNewCriterio((p) => ({ ...p, nombre: e.target.value }))}
                  required
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 whitespace-nowrap">Peso:</span>
                  <input
                    type="number" min={0.1} max={100} step={0.1}
                    className="input w-20 text-sm"
                    placeholder="1"
                    value={newCriterio.peso}
                    onChange={(e) => setNewCriterio((p) => ({ ...p, peso: parseFloat(e.target.value) }))}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary btn-sm">
                  <Plus size={14} /> Agregar
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Ejemplo: Examen=4, Tarea=3, Participación=2, Comportamiento=1 → 40%, 30%, 20%, 10%
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Grilla principal */}
      {matriculas.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="font-medium">No hay alumnos matriculados en este curso</p>
          <p className="text-sm mt-1">Matricula alumnos en la sección de Matrículas</p>
        </div>
      ) : (
        <>
          {/* Hint de scroll en mobile */}
          <div className="scroll-hint items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <span>←</span>
            <span>Desliza horizontalmente para ver todas las notas</span>
            <span>→</span>
          </div>
        <div className="grade-table-wrapper bg-white rounded-xl border border-gray-200 shadow-sm">
          <table className="grade-table w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="col-fixed px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap border-r border-gray-200 min-w-36 sm:min-w-52">
                  Alumno
                </th>
                {bimestresState.map((b) => (
                  <th key={b.id} colSpan={b.criterios.length + 1}
                    className="px-2 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200 bg-gray-100">
                    {b.nombre}
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 bg-gray-100 min-w-20 whitespace-nowrap">
                  PROM FINAL
                </th>
              </tr>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="col-fixed px-4 py-2 border-r border-gray-200" />
                {bimestresState.map((b) => (
                  <React.Fragment key={b.id}>
                    {b.criterios.map((c) => (
                      <th key={c.id}
                        className="px-2 py-2 text-center text-xs font-medium text-gray-500 whitespace-nowrap min-w-16"
                        title={`${c.nombre} — Peso: ${c.peso} (${calcPorcentaje(c.peso, b.criterios)})`}
                      >
                        {c.nombre.slice(0, 8)}
                        <span className="block text-[10px] text-primary-400 font-semibold">
                          {calcPorcentaje(c.peso, b.criterios)}
                        </span>
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600 bg-gray-100 border-r border-gray-200 min-w-16">
                      Prom
                    </th>
                  </React.Fragment>
                ))}
                <th className="px-3 py-2 bg-gray-100 text-center text-[10px] text-gray-400 font-normal whitespace-nowrap">
                  prom(B1..B4)
                </th>
              </tr>
            </thead>

            <tbody>
              {matriculas.map((m, idx) => {
                const promGeneral = calcPromGeneral(m.id);
                return (
                  <tr key={m.id}
                    className={cn("border-b border-gray-100 hover:bg-gray-50/40 transition-colors",
                      idx % 2 !== 0 && "bg-gray-50/30")}>
                    <td className="col-fixed px-3 py-2 border-r border-gray-200 bg-white">
                      <p className="font-medium text-gray-900 text-xs sm:text-sm whitespace-nowrap">
                        {m.alumno.apellidos}, {m.alumno.nombres}
                      </p>
                      <p className="text-xs text-gray-400 font-mono hidden sm:block">{m.alumno.codigo}</p>
                    </td>

                    {bimestresState.map((b) => {
                      const prom = calcPromBimestre(m.id, b);
                      return (
                        <React.Fragment key={b.id}>
                          {b.criterios.map((c) => {
                            const nota = notas[m.id]?.[c.id] ?? null;
                            const key = `${m.id}-${c.id}`;
                            return (
                              <td key={c.id} className="px-1 py-1 text-center">
                                <input
                                  type="number" min={0} max={20} step={0.5}
                                  value={nota ?? ""}
                                  placeholder="—"
                                  readOnly={isVisualizador}
                                  onChange={(e) => handleNotaChange(m.id, c.id, e.target.value)}
                                  onBlur={() => !isVisualizador && handleNotaBlur(m.id, c.id)}
                                  className={cn(
                                    "grade-input",
                                    nota !== null ? getGradeCellClass(nota) : "grade-empty",
                                    saving[key] && "opacity-50",
                                    isVisualizador && "cursor-not-allowed"
                                  )}
                                />
                              </td>
                            );
                          })}
                          <td className="px-2 py-1 text-center border-r border-gray-100 bg-gray-50/50">
                            <span className={cn(
                              "inline-block px-1.5 py-0.5 rounded text-xs font-semibold min-w-[2.5rem] text-center",
                              prom !== null ? getGradeCellClass(prom) : "text-gray-300"
                            )}>
                              {prom !== null ? formatNota(prom) : "—"}
                            </span>
                          </td>
                        </React.Fragment>
                      );
                    })}

                    <td className="px-3 py-1 text-center bg-gray-50/30">
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-xs font-bold",
                        promGeneral !== null ? getGradeCellClass(promGeneral) : "text-gray-300"
                      )}>
                        {promGeneral !== null ? formatNota(promGeneral) : "—"}
                      </span>
                      {promGeneral !== null && (
                        <span className="block text-[10px] font-semibold mt-0.5 text-gray-500">
                          {getGradeLabel(promGeneral)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
