Haz un commit y push de todos los cambios pendientes en el proyecto Control Académico.

Pasos:
1. Ejecuta `git status` para ver qué archivos cambiaron
2. Ejecuta `git diff --staged` y `git diff` para entender los cambios
3. Stagea los archivos relevantes (nunca `.env`, `package-lock.json`, ni archivos con credenciales)
4. Crea un commit con mensaje descriptivo en español basado en los cambios reales:
   - `feat:` para nuevas funcionalidades
   - `fix:` para correcciones de bugs
   - `chore:` para tareas de mantenimiento
   - Incluye siempre el co-autor: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
5. Ejecuta `git push origin main`
6. Confirma con `git status` que quedó limpio

Si el usuario pasó un mensaje como argumento: $ARGUMENTS, úsalo como base para el mensaje del commit.

Recuerda: el proyecto está en `C:/Proy-Control-Academico/`, todo el código fuente está en `frontend/`.
