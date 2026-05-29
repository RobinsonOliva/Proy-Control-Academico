Prepara y verifica el despliegue del sistema Control Académico en Vercel.

## Configuración de Vercel
- **Root Directory**: `frontend/` (crítico — sin esto el build falla)
- **Framework**: Next.js (auto-detectado)
- **Node version**: 18+

## Variables de entorno requeridas en Vercel
```
DATABASE_URL=postgresql://...@ep-xxx.neon.tech/neondb?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://...@ep-xxx.neon.tech/neondb?sslmode=require
NEXTAUTH_SECRET=<string aleatorio largo>
NEXTAUTH_URL=https://<tu-dominio>.vercel.app
NEXT_PUBLIC_SCHOOL_NAME=<nombre del colegio>
```

## Checklist pre-deploy
1. `git status` — nada pendiente de commit
2. Verificar que `.env` NO está en el repo (está en `.gitignore`)
3. TypeScript check:
   ```bash
   cd C:/Proy-Control-Academico/frontend && npx tsc --noEmit
   ```
4. Verificar que el schema de Prisma está en sync con la BD de producción

## Primera puesta en marcha en Vercel (nuevo proyecto)
1. Crear DB en neon.tech → copiar DATABASE_URL y DIRECT_URL
2. Conectar repo GitHub en Vercel → configurar Root Directory = `frontend/`
3. Agregar todas las variables de entorno
4. Primer deploy → luego ejecutar seed:
   ```bash
   cd frontend
   npx prisma db push
   npm run db:seed
   ```
   (el seed crea el usuario admin inicial)

## Problemas comunes en deploy
- **Build falla con error de Prisma**: falta `DATABASE_URL` en Vercel env vars
- **500 en runtime**: `NEXTAUTH_SECRET` o `NEXTAUTH_URL` no configurados
- **Matrículas no aparecen**: verificar que `Configuracion` singleton existe en BD de producción
  ```sql
  INSERT INTO "Configuracion" (id, "anioEscolar", "updatedAt") 
  VALUES ('singleton', 2026, NOW()) ON CONFLICT DO NOTHING;
  ```
- **Login no funciona**: `NEXTAUTH_URL` debe ser exactamente la URL de producción (sin trailing slash)

## Rotar credenciales de Neon (si se expusieron)
1. Ir a neon.tech → proyecto → Settings → Reset password
2. Actualizar `DATABASE_URL` y `DIRECT_URL` en Vercel
3. Actualizar `frontend/.env` local
4. Las conexiones activas se cierran automáticamente
