Diagnostica y corrige un problema en una API route o página del proyecto Control Académico.

Problema a investigar: $ARGUMENTS

## Contexto del proyecto
- Next.js 14 App Router en `C:/Proy-Control-Academico/frontend/`
- API Routes en `frontend/app/api/`
- Páginas en `frontend/app/(dashboard)/`
- Auth: NextAuth v4 JWT — `getServerSession(authOptions)` en server, `useSession()` en client
- DB: Prisma + Neon PostgreSQL

## Checklist de diagnóstico

### Errores de autenticación (401/403)
- Verificar que la sesión existe: `const session = await getServerSession(authOptions)`
- ADMIN: `session?.user?.role !== "ADMIN"`
- No-VISUALIZADOR: `session?.user?.role === "VISUALIZADOR"`
- En páginas cliente: `const { data: session } = useSession()`

### Errores de Prisma (P2002, P2003, P2025)
- P2002: Violación unique constraint → verificar si existe registro con mismo valor único
  - Patrón común: curso soft-deleted con mismo `gradoId+codigo` → limpiar antes de crear
- P2003: FK constraint → el registro relacionado no existe
- P2025: Record not found → verificar que el ID existe y `activo: true`

### Errores de año escolar
- NUNCA usar `new Date().getFullYear()` directo en queries
- En server components/API routes: `const anio = await getAnioEscolar()` de `@/lib/config`
- En client components: fetch a `/api/config` para obtener el año

### Errores de tipo TypeScript
- Verificar que los tipos de las páginas cliente incluyen todos los campos usados
- Zod schemas en API: solo incluir campos que el modelo acepta en PUT/POST
- `activo`, `gradoId`, `codigo` generalmente NO se incluyen en schema de PUT

### Errores de filtrado
- Queries que deben filtrar por año: `{ where: { anio, activo: true } }`
- Queries de alumnos/cursos activos: siempre incluir `activo: true`
- `_count` filtrado: `_count: { select: { matriculas: { where: { anio, activo: true } } } }`

### Problemas de re-render / datos desactualizados (cliente)
- Verificar que `load()` se llama con `useCallback` y `useEffect`
- Dependencias del `useCallback` incluyen todos los filtros usados en el fetch

## Patrones de respuesta correctos
```typescript
// Éxito
return NextResponse.json(data, { status: 201 }); // crear
return NextResponse.json(data);                   // leer/actualizar
return NextResponse.json({ ok: true });           // eliminar

// Errores
return NextResponse.json({ error: "mensaje" }, { status: 403 }); // auth
return NextResponse.json({ error: "mensaje" }, { status: 404 }); // not found
return NextResponse.json({ error: "mensaje" }, { status: 409 }); // conflicto
return NextResponse.json({ error: "mensaje" }, { status: 422 }); // validación
```
