Crea una nueva entidad CRUD completa en el sistema Control Académico siguiendo los patrones establecidos.

Entidad a crear: $ARGUMENTS

## Stack y ubicación
- Proyecto en `C:/Proy-Control-Academico/frontend/`
- Next.js 14 App Router + Prisma + Neon PostgreSQL + NextAuth v4
- RBAC: ADMIN / DOCENTE / VISUALIZADOR

## Pasos en orden

### 1. Schema Prisma (`frontend/prisma/schema.prisma`)
- Agrega el modelo con campos `id` (cuid), `activo Boolean @default(true)`, `createdAt DateTime @default(now())`
- Define relaciones con `onDelete: Cascade` donde corresponda
- Ejecuta: `cd frontend && npx prisma db push`

### 2. API Route — lista (`frontend/app/api/<entidad>/route.ts`)
```typescript
// GET: listado con filtros opcionales por query params
// POST: crear — protegido para ADMIN o no-VISUALIZADOR según la entidad
// Importar getAnioEscolar() de "@/lib/config" si se filtra por año
export const dynamic = "force-dynamic"; // solo en páginas servidor, no en API routes
```

### 3. API Route — por ID (`frontend/app/api/<entidad>/[id]/route.ts`)
```typescript
// GET: detalle
// PUT: actualizar — validar rol
// DELETE: eliminar — solo ADMIN
//   - Soft delete (activo: false) para entidades con datos históricos
//   - Hard delete para entidades sin dependencias críticas
//   - SIEMPRE verificar dependencias antes de borrar
```

### 4. Página UI (`frontend/app/(dashboard)/<entidad>/page.tsx`)
- Usar `"use client"` con hooks de React
- Estado: lista, loading, modalOpen, editing, form, saving
- Funciones: `load()` (useCallback + useEffect), `save()`, `del()`
- Tabla con columnas: datos clave + columna Acciones (Editar + Eliminar)
- Modal único para crear Y editar (detectar con `editing !== null`)
- Usar `toast` de `react-hot-toast` para feedback
- Botón "Nuevo X" solo visible para ADMIN: `const isAdmin = session?.user?.role === "ADMIN"`

### 5. Sidebar (`frontend/components/layout/sidebar.tsx`)
- Agregar el ítem al array `navItems` con su icono de lucide-react

### 6. Layout (`frontend/app/(dashboard)/layout.tsx`)
- Agregar `"/ruta": "Título"` al objeto `pageTitles`

### 7. Middleware (`frontend/middleware.ts`)
- Agregar `/ruta/:path*` al array `matcher`
- Si es solo ADMIN, agregar condición de redirect

## Patrones clave del proyecto
- Soft delete: `prisma.X.update({ data: { activo: false } })` — para Grado, Aula, Alumno
- Hard delete: `prisma.X.delete()` — para Curso (tras limpiar matrículas), Criterio
- Año escolar: usar siempre `await getAnioEscolar()` de `@/lib/config`, nunca `new Date().getFullYear()` directo
- Unique constraint: al hacer hard delete de soft-deleted records antes de re-crear con mismo código
- `export const dynamic = "force-dynamic"` en todas las páginas servidor que consulten la BD
