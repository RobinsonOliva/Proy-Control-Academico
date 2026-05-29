import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getGradeColor(nota: number | null | undefined): string {
  if (nota === null || nota === undefined) return "text-gray-400";
  if (nota >= 18) return "text-emerald-600";
  if (nota >= 14) return "text-blue-600";
  if (nota >= 11) return "text-amber-600";
  return "text-red-600";
}

export function getGradeBg(nota: number | null | undefined): string {
  if (nota === null || nota === undefined) return "bg-gray-50";
  if (nota >= 18) return "bg-emerald-50";
  if (nota >= 14) return "bg-blue-50";
  if (nota >= 11) return "bg-amber-50";
  return "bg-red-50";
}

export function getGradeLabel(nota: number | null | undefined): string {
  if (nota === null || nota === undefined) return "—";
  if (nota >= 18) return "AD";
  if (nota >= 14) return "A";
  if (nota >= 11) return "B";
  return "C";
}

export function calcularPromedioBimestre(
  notas: (number | null)[],
  pesos: number[]
): number | null {
  const validas = notas
    .map((n, i) => ({ nota: n, peso: pesos[i] }))
    .filter((x) => x.nota !== null && x.nota !== undefined);

  if (validas.length === 0) return null;

  const sumaPesos = validas.reduce((a, x) => a + x.peso, 0);
  if (sumaPesos === 0) return null;

  const suma = validas.reduce((a, x) => a + x.nota! * x.peso, 0);
  return Math.min(20, Math.ceil(suma / sumaPesos));
}

export function calcularPromedioGeneral(
  promediosBimestres: (number | null)[]
): number | null {
  const validos = promediosBimestres.filter((p) => p !== null) as number[];
  if (validos.length === 0) return null;
  const suma = validos.reduce((a, b) => a + b, 0);
  return Math.min(20, Math.ceil(suma / validos.length));
}

export function formatNota(nota: number | null | undefined): string {
  if (nota === null || nota === undefined) return "—";
  return String(Math.min(20, Math.ceil(nota)));
}

export function generateCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const ANIO_ACTUAL = new Date().getFullYear();
