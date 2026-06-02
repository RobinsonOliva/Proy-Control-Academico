"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { BookText, Download, Loader2, GraduationCap, Users } from "lucide-react";
import toast from "react-hot-toast";

type Grado = { id: string; nombre: string; nivel: string; orden: number };
type Aula = { id: string; seccion: string; gradoId: string };

export default function LibretasPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [grados, setGrados] = useState<Grado[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [anio, setAnio] = useState<number>(new Date().getFullYear());

  const [selectedGrado, setSelectedGrado] = useState("");
  const [selectedAula, setSelectedAula] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Cargar grados de primaria y año escolar
  useEffect(() => {
    async function fetchData() {
      const [gradosRes, configRes] = await Promise.all([
        fetch("/api/grados").then((r) => r.json()),
        fetch("/api/config").then((r) => r.json()),
      ]);
      const soloP = (Array.isArray(gradosRes) ? gradosRes : []).filter(
        (g: Grado) => g.nivel === "PRIMARIA"
      );
      setGrados(soloP.sort((a: Grado, b: Grado) => a.orden - b.orden));
      if (configRes?.anioEscolar) setAnio(configRes.anioEscolar);
      setLoadingData(false);
    }
    fetchData();
  }, []);

  // Cargar aulas cuando cambia el grado
  const loadAulas = useCallback(async (gradoId: string) => {
    if (!gradoId) { setAulas([]); setSelectedAula(""); return; }
    const data = await fetch(`/api/aulas?gradoId=${gradoId}`).then((r) => r.json());
    setAulas(Array.isArray(data) ? data : []);
    setSelectedAula("");
  }, []);

  useEffect(() => {
    loadAulas(selectedGrado);
  }, [selectedGrado, loadAulas]);

  async function handleDescargar() {
    if (!selectedGrado || !selectedAula) {
      toast.error("Selecciona grado y sección.");
      return;
    }
    setLoading(true);
    try {
      const url = `/api/libretas/primaria?gradoId=${selectedGrado}&aulaId=${selectedAula}&anio=${anio}`;
      const res = await fetch(url);
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Error al generar el documento.");
        return;
      }
      const blob = await res.blob();
      const filename =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "Libretas.docx";
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(href);
      toast.success("Libretas generadas correctamente.");
    } catch {
      toast.error("Error al descargar el documento.");
    } finally {
      setLoading(false);
    }
  }

  const gradoSeleccionado = grados.find((g) => g.id === selectedGrado);
  const aulaSeleccionada = aulas.find((a) => a.id === selectedAula);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <BookText size={20} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h1 className="page-title">Libretas de Notas</h1>
            <p className="page-subtitle hidden sm:block">
              Genera libretas en Word por grado y sección — Año {anio}
            </p>
            <p className="text-xs text-gray-400 sm:hidden">Año {anio}</p>
          </div>
        </div>
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de selección */}
          <div className="lg:col-span-2 card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-gray-700">
                Seleccionar sección
              </h2>
            </div>
            <div className="card-body space-y-4">
              {/* Grado */}
              <div className="form-group">
                <label className="label">
                  <GraduationCap size={14} className="inline mr-1" />
                  Grado
                </label>
                <select
                  className="input"
                  value={selectedGrado}
                  onChange={(e) => setSelectedGrado(e.target.value)}
                >
                  <option value="">— Selecciona un grado —</option>
                  {grados.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sección */}
              <div className="form-group">
                <label className="label">
                  <Users size={14} className="inline mr-1" />
                  Sección
                </label>
                <select
                  className="input"
                  value={selectedAula}
                  onChange={(e) => setSelectedAula(e.target.value)}
                  disabled={!selectedGrado || aulas.length === 0}
                >
                  <option value="">
                    {!selectedGrado
                      ? "— Primero selecciona un grado —"
                      : aulas.length === 0
                      ? "— Sin secciones registradas —"
                      : "— Selecciona una sección —"}
                  </option>
                  {aulas.map((a) => (
                    <option key={a.id} value={a.id}>
                      Sección {a.seccion}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botón descargar */}
              <div className="pt-2">
                <button
                  onClick={handleDescargar}
                  disabled={!selectedGrado || !selectedAula || loading}
                  className="btn btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Generando libretas...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>Descargar Libretas Word</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Info panel */}
          <div className="space-y-4">
            {/* Selección actual */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-sm font-semibold text-gray-700">
                  Selección actual
                </h2>
              </div>
              <div className="card-body space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Año escolar:</span>
                  <span className="font-medium text-gray-800">{anio}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Grado:</span>
                  <span className="font-medium text-gray-800">
                    {gradoSeleccionado?.nombre ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sección:</span>
                  <span className="font-medium text-gray-800">
                    {aulaSeleccionada ? `Sección ${aulaSeleccionada.seccion}` : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Instrucciones */}
            <div className="card bg-indigo-50 border-indigo-100">
              <div className="card-body space-y-2">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                  ¿Cómo funciona?
                </p>
                <ul className="text-xs text-indigo-600 space-y-1 list-disc list-inside">
                  <li>Selecciona el grado y la sección</li>
                  <li>Se genera una libreta por cada alumno matriculado</li>
                  <li>Todas las libretas se descargan en un solo archivo Word</li>
                  <li>
                    La nota de cada competencia corresponde al promedio del
                    bimestre
                  </li>
                  <li>
                    Escala: <strong>AD</strong> (18–20) · <strong>A</strong>{" "}
                    (14–17) · <strong>B</strong> (11–13) · <strong>C</strong>{" "}
                    (0–10)
                  </li>
                  <li>Las celdas sin notas aparecen en blanco</li>
                </ul>
              </div>
            </div>

            {!isAdmin && (
              <div className="card bg-amber-50 border-amber-100">
                <div className="card-body">
                  <p className="text-xs text-amber-700">
                    Solo puedes generar libretas de las secciones que tienes
                    asignadas.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
