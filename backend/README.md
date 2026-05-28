# Backend - API REST

El backend de esta aplicación está implementado como **API Routes de Next.js** dentro del directorio `frontend/`.

## Arquitectura

```
frontend/app/api/
├── auth/[...nextauth]/   → Autenticación (NextAuth.js)
├── register/             → Registro con código de invitación
├── grados/               → CRUD grados
├── aulas/                → CRUD aulas
├── cursos/               → CRUD cursos
├── alumnos/              → CRUD alumnos
├── matriculas/           → Matrículas
├── bimestres/            → Períodos de evaluación
├── criterios/            → Criterios de evaluación
├── calificaciones/       → Notas (lectura + escritura)
├── usuarios/             → Gestión de usuarios e invitaciones
└── busqueda/             → Búsqueda global
```

## Endpoints principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/signin` | Iniciar sesión |
| POST | `/api/register` | Registro con código |
| GET | `/api/grados` | Listar grados |
| GET/POST | `/api/alumnos` | Alumnos |
| POST | `/api/matriculas` | Matricular alumno |
| GET/POST/PUT | `/api/calificaciones/:cursoId` | Notas del curso |
| GET | `/api/busqueda?q=` | Búsqueda global |

## Autenticación

Todos los endpoints (excepto auth) requieren sesión activa.
Los endpoints destructivos requieren rol `ADMIN` o `DOCENTE`.

## Base de datos

PostgreSQL via Prisma ORM → Neon (compatible con Vercel Free Tier).
