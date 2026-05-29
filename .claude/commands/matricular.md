Gestiona matrículas de alumnos en el sistema Control Académico.

Acción: $ARGUMENTS

## Contexto del sistema de matrículas
- Solo ADMIN puede matricular
- Una matrícula vincula: Alumno + Curso + Año escolar
- Restricción: el curso debe tener docente asignado en la sección del alumno (`CursoAula.docenteId != null`)
- Unique: `@@unique([alumnoId, cursoId, anio])` — no duplicados por año

## Flujo correcto para matricular un alumno
1. El alumno debe tener `gradoId` y `aulaId` asignados
2. El curso debe pertenecer al mismo grado del alumno
3. Debe existir un `CursoAula` para ese `cursoId + aulaId` con `docenteId != null`
4. POST `/api/matriculas` con `{ alumnoId, cursoIds: [...], anio }`

## Si la matrícula falla con "no tiene docente asignado"
1. Ir a `/cursos`
2. Buscar el curso → botón 👥 (Asignar docentes por sección)
3. Seleccionar el docente para la sección correspondiente
4. Guardar → ya se puede matricular

## Retirar una matrícula
- DELETE `/api/matriculas/:id` — hace soft delete (`activo: false`)
- En la UI: hover sobre el badge del curso → botón X

## Ver matrículas de un alumno específico
```
GET /api/matriculas?alumnoId=<id>&anio=<año>
```

## Verificar matrículas sin docente (datos legacy)
Si hay matrículas de cursos sin docente (creadas antes de la validación), 
se deben desactivar:
```bash
cd C:/Proy-Control-Academico/frontend
# Usar ts-node con un script que busque matriculas donde CursoAula.docenteId = null
```

## Regla de negocio importante
Un aula sin docente asignado NO acepta nuevas matrículas.
Esto se valida tanto en el frontend (filtra cursos) como en el backend (`validarDocente()`).
