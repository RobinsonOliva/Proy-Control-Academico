import type { Role, Nivel, Sexo } from "@prisma/client";

export type { Role, Nivel, Sexo };

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: Role;
  image?: string;
}

export interface GradoConAulas {
  id: string;
  nombre: string;
  nivel: Nivel;
  orden: number;
  activo: boolean;
  aulas: AulaBasic[];
  _count: { alumnos: number; cursos: number };
}

export interface AulaBasic {
  id: string;
  seccion: string;
  capacidad: number;
  gradoId: string;
}

export interface CursoConRelaciones {
  id: string;
  nombre: string;
  codigo: string;
  color: string;
  gradoId: string;
  grado: { nombre: string };
  docente?: { name: string } | null;
  _count: { matriculas: number; bimestres: number };
}

export interface AlumnoConRelaciones {
  id: string;
  nombres: string;
  apellidos: string;
  codigo: string;
  dni?: string | null;
  sexo: Sexo;
  activo: boolean;
  grado: { id: string; nombre: string };
  aula: { id: string; seccion: string };
  _count: { matriculas: number };
}

export interface BimestreConCriterios {
  id: string;
  nombre: string;
  numero: number;
  activo: boolean;
  criterios: CriterioBasic[];
}

export interface CriterioBasic {
  id: string;
  nombre: string;
  peso: number;
  orden: number;
  activo: boolean;
}

export interface CalificacionRow {
  alumnoId: string;
  alumnoNombre: string;
  alumnoApellidos: string;
  matriculaId: string;
  notas: Record<string, number | null>;
  promediosBimestres: Record<number, number | null>;
  promedioGeneral: number | null;
}

export interface DashboardStats {
  totalAlumnos: number;
  totalDocentes: number;
  totalCursos: number;
  totalGrados: number;
  alumnosPorNivel: { nivel: string; count: number }[];
  cursosRecientes: { nombre: string; grado: string; alumnos: number }[];
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}
