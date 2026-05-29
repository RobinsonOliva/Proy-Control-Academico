Gestiona el año escolar activo del sistema Control Académico.

Acción: $ARGUMENTS

## Ver el año actual
Consulta la BD directamente:
```bash
cd C:/Proy-Control-Academico/frontend
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.configuracion.findUnique({ where: { id: 'singleton' } }).then(c => { console.log('Año escolar:', c?.anioEscolar ?? 'No configurado'); p.\$disconnect(); });"
```

O usa la API (si el servidor está corriendo):
```bash
curl http://localhost:3000/api/config
```

## Cambiar el año escolar
Opción 1 — Desde la UI (recomendado):
- Ir a `/configuracion` en el panel admin
- Ingresar el nuevo año y guardar

Opción 2 — Directo en BD:
```bash
cd C:/Proy-Control-Academico/frontend
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.configuracion.upsert({ where: { id: 'singleton' }, update: { anioEscolar: NUEVO_AÑO }, create: { id: 'singleton', anioEscolar: NUEVO_AÑO } }).then(c => { console.log('Actualizado a:', c.anioEscolar); p.\$disconnect(); });"
```
(Reemplazar NUEVO_AÑO con el número, ej: 2026)

## Impacto del año escolar en el sistema
El año afecta TODOS estos filtros:
- `Matricula.anio` — qué matrículas se muestran y crean
- `_count matriculas` — contador de alumnos en cursos/dashboard
- Calificaciones — solo se cargan de matrículas del año activo
- Reportes — promedios calculados solo con notas del año activo

## Dónde está implementado
- Singleton en BD: `Configuracion { id: "singleton", anioEscolar: Int }`
- Función server: `getAnioEscolar()` en `frontend/lib/config.ts`
- API: `GET/PUT /api/config` — PUT solo ADMIN
- UI: `/configuracion` — solo accesible para ADMIN
