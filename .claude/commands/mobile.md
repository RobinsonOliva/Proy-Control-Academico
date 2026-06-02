Arregla problemas de responsividad móvil en el sistema Control Académico.

Página o componente a arreglar: $ARGUMENTS

## Contexto del proyecto
- Proyecto en `C:/Proy-Control-Academico/frontend/`
- Next.js 14 App Router + Tailwind CSS
- Layout principal: `frontend/app/(dashboard)/layout.tsx`
- Estilos globales: `frontend/app/globals.css`

## Checklist de diagnóstico mobile

### 1. Scroll horizontal en tablas (problema más común)
**Síntoma**: la tabla no scrollea, desborda la página completa.
**Causa raíz**: `main` en `layout.tsx` sin `overflow-x-hidden`. El contenido empuja la página en vez de scrollear dentro del wrapper.
**Verificar**: que `main` tenga `overflow-x-hidden overflow-y-auto`.
**Verificar**: que el wrapper de la tabla use `.table-container` (que ya tiene `overflow-x: auto` y `-webkit-overflow-scrolling: touch`).

### 2. Tabla de calificaciones (grade-grid)
**Síntoma**: tabla muy ancha, sin scroll en mobile.
**Checklist**:
- Columna alumno: `min-w-36 sm:min-w-52` (no `min-w-52` fijo)
- `col-fixed` sticky con sombra derecha en `globals.css`
- `grade-table-wrapper` con `overflow-x: auto` y `-webkit-overflow-scrolling: touch`
- Agregar hint de scroll visible solo en mobile: `<div className="scroll-hint ...">← Desliza →</div>`
- Clase `.scroll-hint { display: none }` → `@media (max-width: 767px) { .scroll-hint { display: flex; } }`
- `grade-input` más pequeño en mobile: `@media (max-width: 767px) { .grade-input { width: 2.75rem; font-size: 0.75rem; } }`

### 3. Modales con formularios
**Síntoma**: campos se apilan mal, el modal no entra en pantalla.
**Correcciones**:
- Overlay: agregar `overflow-y-auto` → `fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto`
- Contenido del modal: agregar `my-4` para que el scroll funcione → `bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-slide-in my-4`
- Grids de campos: cambiar `grid-cols-2` → `grid grid-cols-1 sm:grid-cols-2`
- Grids de campos: cambiar `grid-cols-3` → `grid grid-cols-1 sm:grid-cols-3`
- Si hay `col-span-2`, cambiarlo a `sm:col-span-2`

### 4. Textos y botones en toolbar
**Síntoma**: el toolbar se rompe o queda demasiado ancho.
**Correcciones**:
- Textos largos: `<span className="hidden sm:inline">Texto completo</span><span className="sm:hidden">Corto</span>`
- Textos descriptivos largos: ocultar en mobile con `hidden sm:block`
- Párrafos móvil alternativos: `<p className="text-xs sm:hidden">versión corta</p>`

### 5. Headers de página con título largo
**Síntoma**: título desborda o se superpone con otros elementos.
**Correcciones**:
- Contenedor: agregar `min-w-0` al flex container
- Título: `text-base sm:text-xl font-bold truncate`
- Subtítulo: `text-xs sm:text-sm truncate`
- Ícono/avatar: `shrink-0` para que no se encoja

### 6. Escala de notas y badges informativos
**Síntoma**: badges no caben en una fila en mobile.
**Corrección**: `<div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">` con textos largos ocultos: `<span className="hidden sm:inline">...</span>`

## Patrones de CSS ya establecidos en globals.css

```css
/* Ya existente — NO duplicar */
.grade-table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table-container { -webkit-overflow-scrolling: touch; }
.grade-table .col-fixed { position: sticky; left: 0; box-shadow: 2px 0 6px -2px rgba(0,0,0,0.12); }
.scroll-hint { display: none; }
@media (max-width: 767px) {
  .scroll-hint { display: flex; }
  .grade-input { width: 2.75rem; font-size: 0.75rem; }
}
```

## Orden de trabajo

1. Identificar el archivo afectado (página, componente o layout)
2. Correr la verificación rápida del checklist según el tipo de problema
3. Aplicar los cambios mínimos necesarios (no refactorizar más allá del scope)
4. Ejecutar `npx tsc --noEmit` en `frontend/` para verificar tipos
5. Hacer commit con `/commit`
