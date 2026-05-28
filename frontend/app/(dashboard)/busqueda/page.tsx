"use client";

import { Suspense, useState, useCallback } from "react";
import { Search, Users, BookOpen, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

type SearchResult = {
  alumnos: { id: string; nombres: string; apellidos: string; codigo: string; grado: { nombre: string }; aula: { seccion: string } }[];
  cursos: { id: string; nombre: string; codigo: string; color: string; grado: { nombre: string } }[];
  grados: { id: string; nombre: string; nivel: string }[];
};

function BusquedaContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const buscar = useCallback(async (query: string) => {
    if (query.trim().length < 2) { setResults(null); return; }
    setLoading(true);
    const res = await fetch(`/api/busqueda?q=${encodeURIComponent(query)}`);
    setResults(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialQ) buscar(initialQ);
  }, [initialQ, buscar]);

  useEffect(() => {
    const t = setTimeout(() => buscar(q), 350);
    return () => clearTimeout(t);
  }, [q, buscar]);

  const total = results ? results.alumnos.length + results.cursos.length + results.grados.length : 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div>
        <h1 className="page-title">Búsqueda</h1>
        <p className="page-subtitle">Encuentra alumnos, cursos y más</p>
      </div>

      <div className="relative">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, código, DNI, curso..."
          autoFocus
          className="w-full pl-12 pr-4 py-3.5 text-base bg-white border border-gray-200 rounded-xl shadow-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {results && (
        <div className="space-y-5">
          {total === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Search size={36} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No se encontraron resultados para "{q}"</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">{total} resultado(s) para "{q}"</p>

              {results.alumnos.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-blue-500" />
                      <h3 className="font-semibold text-gray-900">Alumnos</h3>
                      <span className="badge badge-blue">{results.alumnos.length}</span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {results.alumnos.map((a) => (
                      <Link key={a.id} href={`/alumnos`}
                        className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                          {a.apellidos.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{a.apellidos}, {a.nombres}</p>
                          <p className="text-xs text-gray-400">{a.grado.nombre} · Sección {a.aula.seccion}</p>
                        </div>
                        <span className="font-mono text-xs text-gray-400">{a.codigo}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {results.cursos.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-purple-500" />
                      <h3 className="font-semibold text-gray-900">Cursos</h3>
                      <span className="badge badge-purple">{results.cursos.length}</span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {results.cursos.map((c) => (
                      <Link key={c.id} href={`/calificaciones/${c.id}`}
                        className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: c.color }}>
                          {c.codigo.slice(0, 3)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{c.nombre}</p>
                          <p className="text-xs text-gray-400">{c.grado.nombre} · {c.codigo}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {results.grados.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={16} className="text-emerald-500" />
                      <h3 className="font-semibold text-gray-900">Grados</h3>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {results.grados.map((g) => (
                      <Link key={g.id} href="/grados"
                        className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <GraduationCap size={18} className="text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{g.nombre}</p>
                          <p className="text-xs text-gray-400">{g.nivel}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function BusquedaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12 text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mr-3" />
        Cargando...
      </div>
    }>
      <BusquedaContent />
    </Suspense>
  );
}
