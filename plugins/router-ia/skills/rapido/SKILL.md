---
name: rapido
description: Resuelve una tarea sencilla con Haiku y esfuerzo bajo durante este turno (solo Claude Code).
argument-hint: "<tarea sencilla>"
model: haiku
effort: low
disable-model-invocation: true
---

Tarea: $ARGUMENTS

Claude Code ejecuta este turno con Haiku y esfuerzo bajo (el selector sigue mostrando el modelo de la sesión; el modelo real se ve con `/ruta-estado` si está el mod `router-ia-auto`). En el chat de claude.ai esta cabecera no cambia nada: dilo en una línea y sigue con el modelo actual.

- Responde directo, sin preámbulo ni resumen final.
- Lee solo lo imprescindible; busca antes de abrir archivos.
- Si la tarea resulta tener diseño, seguridad o un error difícil, no improvises: dilo en una línea y recomienda `/estandar` o `/profundo`.
