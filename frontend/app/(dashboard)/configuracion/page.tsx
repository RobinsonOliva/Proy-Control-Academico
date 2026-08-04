"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Calendar, Save, School, Users } from "lucide-react";

export default function ConfiguracionPage() {
  const [anio, setAnio] = useState<number>(new Date().getFullYear());
  const [institucionEducativa, setInstitucionEducativa] = useState("");
  const [seccionLibreta, setSeccionLibreta] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => {
        setAnio(d.anioEscolar ?? new Date().getFullYear());
        setInstitucionEducativa(d.institucionEducativa ?? "");
        setSeccionLibreta(d.seccionLibreta ?? "");
        setLoading(false);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anioEscolar: anio, institucionEducativa, seccionLibreta }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error || "Error al guardar.");
      return;
    }
    toast.success("Configuración actualizada.");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-subtitle">Parámetros generales del sistema</p>
        </div>
      </div>

      <div className="card max-w-md">
        <div className="card-header flex items-center gap-2">
          <Calendar size={18} className="text-primary-600" />
          <h3 className="font-semibold text-gray-900">Parámetros Generales</h3>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-400">
            <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : (
          <form onSubmit={save} className="p-6 space-y-4">
            <div className="form-group">
              <label className="label">Año escolar vigente</label>
              <input
                type="number"
                className="input"
                min={2000}
                max={2100}
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Matrículas, notas y reportes se filtrarán por este año.
              </p>
            </div>
            <div className="form-group">
              <label className="label">
                <School size={14} className="inline mr-1" />
                Institución educativa
              </label>
              <input
                type="text"
                className="input"
                value={institucionEducativa}
                onChange={(e) => setInstitucionEducativa(e.target.value)}
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Nombre que aparece en el encabezado de las libretas de notas.
              </p>
            </div>
            <div className="form-group">
              <label className="label">
                <Users size={14} className="inline mr-1" />
                Sección (libreta)
              </label>
              <input
                type="text"
                className="input"
                value={seccionLibreta}
                onChange={(e) => setSeccionLibreta(e.target.value)}
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Texto que aparece como sección en el encabezado de las libretas (ej. &quot;Única&quot;).
              </p>
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              <Save size={15} />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
