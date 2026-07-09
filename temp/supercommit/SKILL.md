---
name: supercommit
description: Analiza cambios Git del repositorio actual, prepara todos los archivos y crea un commit con formato Conventional Commits.
allowed-tools: bash
---

Cuando el usuario pida usar esta skill, sigue este flujo en el repositorio actual:

1. Inspecciona los cambios para entender bien el estado y el contenido modificado. Usa comandos de Git como:
   - `git --no-pager status --short --branch`
   - `git --no-pager diff --stat`
   - `git --no-pager diff`
   - Si hay archivos staged, revisa también `git --no-pager diff --cached`

2. A partir de los cambios detectados, redacta un mensaje de commit declarativo en estilo Conventional Commits:
   - Formato base: `<tipo>(scope opcional): descripción corta`
   - Tipos comunes: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`, `perf`
   - Usa `scope` solo si agrega claridad.
   - Si hace falta contexto relevante, agrega cuerpo multilinea breve y útil.

3. Prepara todos los archivos:
   - Ejecuta `git add .`

4. Crea el commit:
   - Ejecuta `git commit` con el mensaje generado.
   - Si usas cuerpo multilinea, construye el commit message con título + cuerpo de forma correcta.

5. Reporta al usuario el resultado:
   - Hash corto del commit creado.
   - Título final del commit.
   - Resumen breve de lo que se incluyó.

Reglas de seguridad y calidad:
- No inventes cambios: basa el mensaje solo en lo que muestran los comandos de Git.
- Si no hay cambios para commit, indícalo explícitamente y no ejecutes `git commit`.
- Si `git commit` falla, muestra el error y propone la corrección mínima necesaria (por ejemplo, identidad de Git no configurada).
