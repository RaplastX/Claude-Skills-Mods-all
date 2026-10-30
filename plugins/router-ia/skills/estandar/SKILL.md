---
name: estandar
description: Resuelve una tarea normal (programar, corregir, revisar, investigar) con Sonnet y esfuerzo medio durante este turno (solo Claude Code).
argument-hint: "<tarea>"
model: sonnet
effort: medium
disable-model-invocation: true
---

Tarea: $ARGUMENTS

Claude Code ejecuta este turno con Sonnet y esfuerzo medio (el selector sigue mostrando el modelo de la sesión; el real se ve con `/ruta-estado`). En el chat de claude.ai esta cabecera no cambia nada: dilo en una línea y sigue con el modelo actual.

1. Entiende qué se pide y qué archivos toca; lee solo esos.
2. Hazlo siguiendo los patrones del proyecto, sin añadir lo que nadie pidió.
3. Verifica con lo que exista (tests, compilación, ejecutar el caso). Si no puedes verificar algo, dilo.
4. Informa en pocas líneas: qué cambió, qué comprobaste, qué queda.

Si aparece una decisión de arquitectura o de seguridad seria, para y recomienda `/profundo` con el diagnóstico concreto.
