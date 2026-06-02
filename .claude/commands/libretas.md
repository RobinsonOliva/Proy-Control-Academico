Genera o corrige libretas de notas Word para el sistema Control Académico.

## Contexto del módulo

- **Página**: `frontend/app/(dashboard)/libretas/page.tsx` — selector de grado/sección, botón descarga
- **API**: `frontend/app/api/libretas/primaria/route.ts` — lógica completa de generación
- **Plantilla Word**: `frontend/public/templates/libreta-primaria.docx` (copiada de `plantillas/LIBRETA PRIMARIA-MODELO.docx`)
- **Mapeo cursos**: `plantillas/curso-mapping.txt`
- **Paquetes**: `docxtemplater` + `pizzip`

## Flujo de generación

1. `GET /api/libretas/primaria?gradoId=&aulaId=&anio=`
2. Solo alumnos con **matrícula activa** en el año → un documento Word por alumno
3. `addPlaceholders(xml)` inyecta `{PSO_B1}…{CTR_ANU}` + cabecera en el XML del template
4. `docxtemplater` reemplaza placeholders con los valores calculados
5. `mergeDocuments()` concatena todos los documentos (page break entre alumnos)
6. Devuelve un único `.docx` para descarga

## Reglas de negocio clave

- Nota de cada competencia = **promedio del bimestre** del curso (`calcularPromedioBimestre`)
- Formato de nota: `AD/18`, `A/15`, `B/12`, `C/8` (letra/número)
- **Nota anual** = igual al 4° bimestre; **vacía si no hay 4° bimestre**
- Celdas de nota usan `<w:rPr>` Arial 7pt bold explícito (evita desbordamiento en celda 850 dxa)

## Mapeo de 10 áreas curriculares

| Código | Curso en sistema      | Área en plantilla              |
|--------|-----------------------|-------------------------------|
| PSO    | Personal Social       | PERSONAL SOCIAL                |
| EDF    | Educación Física      | EDUCACIÓN FÍSICA               |
| COM    | Comunicación          | COMUNICACIÓN                   |
| AYC    | Arte y Cultura        | ARTE Y CULTURA                 |
| ING    | Ingles                | INGLÉS COMO LENGUA EXTRANJERA  |
| MAT    | Matemática            | MATEMÁTICA                     |
| CYT    | Ciencia y Tecnología  | CIENCIA Y TECNOLOGÍA           |
| REL    | Educación Religiosa   | EDUCACIÓN RELIGIOSA            |
| DAN    | Danza                 | DANZA                          |
| CTR    | Competencias Transversales | COMPETENCIAS TRANSVERSALES |

## Estructura interna del XML (para debug)

El documento tiene 65 filas de tabla. Las filas de competencia (R8–R30 y R33–R39) tienen 7 celdas:
- Celda 0: nombre del área (o vacía en filas de continuación)
- Celda 1: texto de la competencia
- Celdas 2–6: notas B1, B2, B3, B4, ANU (vacías en el template → se inyectan placeholders)

Patrón de inyección en celda vacía:
```
</w:pPr> → </w:pPr><w:r><w:rPr>Arial 7pt bold</w:rPr><w:t>{CODE_Bn}</w:t></w:r>
```

## Si el usuario reporta un problema

- **Celdas vacías en el Word generado**: verificar que `addPlaceholders` detecta las filas (buscar con el script de test en `/tmp/libreta_extract`)
- **Texto desborda la celda**: ajustar `w:sz w:val` en `noteRPr` (14 = 7pt, 16 = 8pt)
- **Nuevo grado sin cursos**: verificar que los 10 cursos (PSO, EDF, COM, AYC, ING, MAT, CYT, REL, DAN, CTR) están creados para ese grado
- **Error 404 "No hay alumnos"**: el alumno no tiene matrícula activa en el año configurado

## Al modificar esta feature

Después de cualquier cambio en `route.ts`:
1. `cd frontend && npx tsc --noEmit` — verificar TypeScript
2. `/commit` — hacer commit y push
