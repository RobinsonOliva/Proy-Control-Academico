"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    code: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          code: form.code.toUpperCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al registrarse.");
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Crear Cuenta</h2>
      <p className="text-sm text-gray-500 mb-6">
        Necesitas un código de invitación del administrador
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label className="label">Código de invitación</label>
          <input
            type="text"
            className="input font-mono uppercase tracking-widest"
            placeholder="XXXXXXXX"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
            maxLength={12}
          />
        </div>

        <div className="form-group">
          <label className="label">Nombre completo</label>
          <input
            type="text"
            className="input"
            placeholder="Juan Pérez García"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="label">Correo electrónico</label>
          <input
            type="email"
            className="input"
            placeholder="juan.perez@colegio.edu"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="form-group">
            <label className="label">Contraseña</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                className="input pr-9"
                placeholder="Min. 8 chars"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Confirmar</label>
            <input
              type={showPass ? "text" : "password"}
              className="input"
              placeholder="Repetir"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full btn-lg mt-1"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Registrando...
            </span>
          ) : (
            <>
              <UserPlus size={18} />
              Crear mi cuenta
            </>
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
          Ingresar
        </Link>
      </p>
    </>
  );
}
