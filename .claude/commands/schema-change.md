Aplica un cambio al schema de Prisma en el proyecto Control Académico.

Cambio a realizar: $ARGUMENTS

## Contexto del proyecto
- Schema en: `C:/Proy-Control-Academico/frontend/prisma/schema.prisma`
- DB: Neon PostgreSQL (cloud) — usa `prisma db push`, NO `prisma migrate`
- Variables de entorno en `frontend/.env` (DATABASE_URL pooler + DIRECT_URL para migraciones)

## Pasos

### 1. Editar el schema
Lee primero `frontend/prisma/schema.prisma` para entender las relaciones existentes.

Reglas del proyecto:
- Todo modelo tiene `activo Boolean @default(true)` y `createdAt DateTime @default(now())`
- Relaciones opcionales usan `onDelete: SetNull` (por defecto en Prisma)
- Relaciones requeridas críticas usan `onDelete: Cascade` o `onDelete: Restrict`
- El modelo `Configuracion` es singleton (`@id @default("singleton")`)

### 2. Aplicar al DB
```bash
cd C:/Proy-Control-Academico/frontend
npx prisma db push
```

Si hay advertencia de pérdida de datos (`--accept-data-loss`):
- Verificar qué columnas/tablas se eliminan
- Preguntar al usuario antes de continuar si los datos son importantes
- Solo ejecutar `npx prisma db push --accept-data-loss` con confirmación explícita

### 3. Regenerar cliente Prisma
`prisma db push` ya regenera el cliente automáticamente. Si no:
```bash
npx prisma generate
```

### 4. Actualizar código TypeScript
Buscar todos los archivos que usan el modelo modificado y actualizar:
- Tipos en páginas cliente (`type X = { ... }`)
- Schemas Zod en API routes
- Includes/selects en queries Prisma
- El seed si aplica: `frontend/prisma/seed.ts`

### 5. Verificar build (opcional pero recomendado)
```bash
cd C:/Proy-Control-Academico/frontend
npx tsc --noEmit
```

## Relaciones actuales importantes
- `Curso` → `Bimestre` (Cascade) → `Criterio` (Cascade) → `Calificacion` (Cascade)
- `Curso` + `Aula` → `CursoAula` (join table, Cascade en ambos lados) con `docenteId` opcional → `User`
- `Alumno` → `Matricula` → `Calificacion` (Cascade)
- `Matricula` tiene `@@unique([alumnoId, cursoId, anio])`
