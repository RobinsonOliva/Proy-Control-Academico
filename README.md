# Sistema de Control Académico

Sistema web completo para la gestión de notas y calificaciones de instituciones educativas.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Backend | Next.js API Routes (REST API) |
| Base de datos | PostgreSQL (Neon - gratis) |
| ORM | Prisma |
| Autenticación | NextAuth.js v4 |
| Estilos | Tailwind CSS |
| Deploy | Vercel (Free Tier) |

## Funcionalidades

- ✅ Login seguro con roles (Admin, Docente, Visualizador)
- ✅ Sistema de invitaciones para nuevos usuarios
- ✅ Gestión de Grados (Inicial, Primaria, Secundaria)
- ✅ Gestión de Aulas por sección
- ✅ Gestión de Cursos con asignación de docente
- ✅ Registro de Alumnos con código único
- ✅ Matrículas en cursos (selección múltiple)
- ✅ Calificaciones: 4 bimestres × criterios configurables con peso
- ✅ Grilla de notas tipo planilla con cálculo automático de promedios
- ✅ Escala vigesimal 0-20 (AD/A/B/C)
- ✅ Reportes de rendimiento por curso
- ✅ Búsqueda global de alumnos, cursos y grados
- ✅ Auto-guardado de notas al salir de cada celda

---

## Despliegue en Vercel (Paso a Paso)

### 1. Base de datos PostgreSQL gratuita (Neon)

1. Ir a [neon.tech](https://neon.tech) → Crear cuenta gratuita
2. Crear un nuevo proyecto
3. En el dashboard, ir a **Connection Details** → seleccionar **Prisma**
4. Copiar las dos cadenas de conexión que necesitarás

### 2. Configurar y desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com) → **Add New Project** → importa este repositorio de GitHub
2. En **Configure Project**:
   - **Root Directory**: `frontend`
   - **Framework**: Next.js (detectado automáticamente)
3. En **Environment Variables**, agrega estas variables:

```env
DATABASE_URL         = postgresql://user:pass@host/db?sslmode=require&pgbouncer=true
DIRECT_URL           = postgresql://user:pass@host/db?sslmode=require
NEXTAUTH_SECRET      = (genera con: openssl rand -base64 32)
NEXTAUTH_URL         = https://tu-app.vercel.app
ADMIN_EMAIL          = admin@tucolegio.edu
ADMIN_PASSWORD       = TuContraseñaSegura2025!
ADMIN_NAME           = Nombre del Administrador
NEXT_PUBLIC_SCHOOL_NAME = Nombre del Colegio
```

4. Clic en **Deploy**

### 3. Inicializar la base de datos (solo primera vez)

Ejecuta estos comandos localmente con las mismas variables de entorno:

```bash
cd frontend
cp .env.example .env.local
# Edita .env.local con tus valores reales de Neon

npm install
npx prisma db push    # Crea todas las tablas en Neon
npm run db:seed       # Crea el usuario admin inicial
```

### 4. Primer acceso

1. Ve a `https://tu-app.vercel.app`
2. Email: el valor de `ADMIN_EMAIL`
3. Contraseña: el valor de `ADMIN_PASSWORD`

---

## Flujo de trabajo recomendado

1. **Admin**: Crear Grados → Crear Aulas → Crear Cursos
2. **Admin**: Registrar Alumnos y asignarlos a Grado + Aula
3. **Admin/Docente**: Matricular alumnos en sus cursos
4. **Docente**: Ir a Calificaciones → seleccionar curso → ingresar notas
5. **Admin**: Ver Reportes para seguimiento global

## Invitar usuarios (docentes)

1. Ir a **Usuarios** (solo admin)
2. Clic en **Crear Invitación** → ingresar email y rol
3. Se genera un código de 8 caracteres
4. Compartir el código al docente
5. El docente va a `/register` e ingresa código + sus datos

---

## Desarrollo local

```bash
cd frontend
cp .env.example .env.local
# Completa las variables de entorno

npm install
npx prisma db push
npm run db:seed
npm run dev
# Abre http://localhost:3000
```

---

## Escala de Calificaciones (Vigesimal - Perú/Latinoamérica)

| Nota | Nivel | Significado |
|------|-------|-------------|
| 18-20 🟢 | AD | Logro Destacado |
| 14-17 🔵 | A  | Logro Esperado |
| 11-13 🟡 | B  | En Proceso |
| 0-10  🔴 | C  | En Inicio |
