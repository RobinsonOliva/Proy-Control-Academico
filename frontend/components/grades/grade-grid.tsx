"use client";

import React, { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Save, Settings, Plus, Trash2 } from "lucide-react";
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

export default function GradeGrid({ cursoId, bimestres, matriculas }: Props) {
  // Inicializar estado de notas desde los datos del servidor
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

  const handleNotaChange = useCallback(
    (matriculaId: string, criterioId: string, value: string) => {
      const nota = value === "" ? null : Math.min(20, Math.max(0, parseFloat(value)));
      setNotas((prev) => ({
        ...prev,
        [matriculaId]: { ...prev[matriculaId], [criterioId]: nota },
      }));
    },
    []
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
    },
    [notas, cursoId]
  );

  const calcPromBimestre = (matriculaId: string, bimestre: Bimestre) => {
    const criteriosActivos = bimestre.criterios;
    const notasArr = criteriosActivos.map((c) => notas[matriculaId]?.[c.id] ?? null);
    const pesosArr = criteriosActivos.map((c) => c.peso);
    return calcularPromedioBimestre(notasArr, pesosArr);
  };

  const calcPromGeneral = (matriculaId: string) => {
    const proms = bimestresState.map((b) => calcPromBimestre(matriculaId, b));
    return calcularPromedioGeneral(proms);
  };

  async function addCriterio(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/criterios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newCriterio, orden: 99 }),
    });
    if (!res.ok) { toast.error("Error al agregar criterio."); return; }
    const crit = await res.json();
    setBimestresState((prev) =>
      prev.map((b) =>
        b.id === newCriterio.bimestreId
          ? { ...b, criterios: [...b.criterios, crit] }
          : b
      )
    );
    setNewCriterio({ bimestreId: "", nombre: "", peso: 1 });
    toast.success("Criterio agregado.");
  }

  async function removeCriterio(bimestreId: string, criterioId: string) {
    if (!confirm("¿Eliminar este criterio y sus notas asociadas?")) return;
    await fetch(`/api/criterios/${criterioId}`, { method: "DELETE" });
    setBimestresState((prev) =>
      prev.map((b) =>
        b.id === bimestreId
          ? { ...b, criterios: b.criterios.filter((c) => c.id !== criterioId) }
          : b
      )
    );
    toast.success("Criterio eliminado.");
  }

  const totalColumnas = bimestresState.reduce((a, b) => a + b.criterios.length + 1, 0) + 1;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {matriculas.length} alumnos · Las notas se guardan automáticamente al salir de cada celda
        </p>
        <button
          onClick={() => setConfigOpen(!configOpen)}
          className={cn("btn-secondary btn-sm gap-1.5", configOpen && "bg-primary-50 text-primary-700 border-primary-200")}
        >
          <Settings size={14} /> Configurar Criterios
        </button>
      </div>

      {/* Panel de configuración de criterios */}
      {configOpen && (
        <div className="card border-primary-100 bg-primary-50/30 animate-slide-in">
          <div className="card-header bg-primary-50/50 border-primary-100">
            <h3 className="font-semibold text-primary-900 text-sm">Criterios de Evaluación por Bimestre</h3>
            <p className="text-xs text-primary-600 mt-0.5">
              El peso es relativo (ej: 4, 3, 2 = 44%, 33%, 22%)
            </p>
          </div>
          <div className="p-5 space-y-5">
            {bimestresState.map((b) => (
              <div key={b.id}>
                <p className="text-sm font-semibold text-gray-700 mb-2">{b.nombre}</p>
                <div className="space-y-1.5">
                  {b.criterios.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-gray-100">
                      <span className="flex-1 text-sm text-gray-700">{c.nombre}</span>
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">Peso: {c.peso}</span>
                      <button
                        onClick={() => removeCriterio(b.id, c.id)}
                        className="text-red-400 hover:text-red-600 p-0.5"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <form onSubmit={addCriterio} className="border-t border-primary-100 pt-4">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Agregar Criterio</p>
              <div className="flex gap-2 flex-wrap">
                <select
                  className="input w-44 text-sm"
                  value={newCriterio.bimestreId}
                  onChange={(e) => setNewCriterio((p) => ({ ...p, bimestreId: e.target.value }))}
                  required
                >
                  <option value="">Bimestre...</option>
                  {bimestresState.map((b) => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
                <input
                  className="input flex-1 min-w-40 text-sm"
                  placeholder="Nombre del criterio (ej: Examen)"
                  value={newCriterio.nombre}
                  onChange={(e) => setNewCriterio((p) => ({ ...p, nombre: e.target.value }))}
                  required
                />
                <input
                  type="number" min={0.1} max={10} step={0.1}
                  className="input w-24 text-sm"
                  placeholder="Peso"
                  value={newCriterio.peso}
                  onChange={(e) => setNewCriterio((p) => ({ ...p, peso: parseFloat(e.target.value) }))}
                  required
                />
                <button type="submit" className="btn-primary btn-sm">
                  <Plus size={14} /> Agregar
                </button>
              </div>
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
        <div className="grade-table-wrapper bg-white rounded-xl border border-gray-200 shadow-sm">
          <table className="grade-table w-full border-collapse text-sm">
            <thead>
              {/* Fila 1: Bimestres */}
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="col-fixed px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap border-r border-gray-200 min-w-52">
                  Alumno
                </th>
                {bimestresState.map((b) => (
                  <th
                    key={b.id}
                    colSpan={b.criterios.length + 1}
                    className="px-2 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-200 bg-gray-100"
                  >
                    {b.nombre}
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 bg-gray-100 min-w-16">
                  PROM
                </th>
              </tr>

              {/* Fila 2: Criterios */}
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="col-fixed px-4 py-2 text-left text-xs text-gray-400 border-r border-gray-200" />
                {bimestresState.map((b) => (
                  <React.Fragment key={b.id}>
                    {b.criterios.map((c) => (
                      <th
                        key={c.id}
                        className="px-2 py-2 text-center text-xs font-medium text-gray-500 whitespace-nowrap min-w-16"
                        title={`Peso: ${c.peso}`}
                      >
                        {c.nombre.slice(0, 8)}
                        <span className="text-gray-300 ml-0.5 text-[10px]">({c.peso})</span>
                      </th>
                    ))}
                    <th key={`prom-${b.id}`} className="px-2 py-2 text-center text-xs font-semibold text-gray-600 bg-gray-100 border-r border-gray-200 min-w-16">
                      Prom
                    </th>
                  </React.Fragment>
                ))}
                <th className="px-3 py-2 bg-gray-100" />
              </tr>
            </thead>

            <tbody>
              {matriculas.map((m, idx) => {
                const promGeneral = calcPromGeneral(m.id);
                return (
                  <tr
                    key={m.id}
                    className={cn("border-b border-gray-100 hover:bg-gray-50/40 transition-colors", idx % 2 === 0 ? "" : "bg-gray-50/30")}
                  >
                    {/* Nombre alumno - columna fija */}
                    <td className="col-fixed px-4 py-2 border-r border-gray-200 bg-white">
                      <div>
                        <p className="font-medium text-gray-900 text-sm whitespace-nowrap">
                          {m.alumno.apellidos}, {m.alumno.nombres}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">{m.alumno.codigo}</p>
                      </div>
                    </td>

                    {/* Notas por bimestre */}
                    {bimestresState.map((b) => {
                      const prom = calcPromBimestre(m.id, b);
                      return (
                        <React.Fragment key={b.id}>
                          {b.criterios.map((c) => {
                            const nota = notas[m.id]?.[c.id] ?? null;
                            const key = `${m.id}-${c.id}`;
                            const isSaving = saving[key];
                            return (
                              <td key={c.id} className="px-1 py-1 text-center">
                                <div className="relative">
                                  <input
                                    type="number"
                                    min={0}
                                    max={20}
                                    step={0.5}
                                    value={nota ?? ""}
                                    placeholder="—"
                                    onChange={(e) => handleNotaChange(m.id, c.id, e.target.value)}
                                    onBlur={() => handleNotaBlur(m.id, c.id)}
                                    className={cn(
                                      "grade-input",
                                      nota !== null ? getGradeCellClass(nota) : "grade-empty",
                                      isSaving && "opacity-50"
                                    )}
                                  />
                                </div>
                              </td>
                            );
                          })}
                          {/* Promedio del bimestre */}
                          <td key={`prom-b${b.id}-${m.id}`} className="px-2 py-1 text-center border-r border-gray-100 bg-gray-50/50">
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

                    {/* Promedio general */}
                    <td className="px-3 py-1 text-center bg-gray-50/30">
                      <div className="flex flex-col items-center">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded-full text-xs font-bold",
                          promGeneral !== null ? getGradeCellClass(promGeneral) : "text-gray-300"
                        )}>
                          {promGeneral !== null ? formatNota(promGeneral) : "—"}
                        </span>
                        {promGeneral !== null && (
                          <span className="text-[10px] font-semibold mt-0.5 text-gray-500">
                            {getGradeLabel(promGeneral)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
