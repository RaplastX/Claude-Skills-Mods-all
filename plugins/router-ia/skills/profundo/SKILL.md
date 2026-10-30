---
name: profundo
description: Razonamiento profundo con Opus y esfuerzo alto durante este turno, para arquitectura, seguridad o bugs difíciles (solo Claude Code).
argument-hint: "<problema difícil>"
model: opus
effort: high
disable-model-invocation: true
---

Problema: $ARGUMENTS

Claude Code ejecuta este turno con Opus y esfuerzo alto (el selector sigue mostrando el modelo de la sesión; el real se ve con `/ruta-estado`). En el chat de claude.ai esta cabecera no cambia nada: dilo en una línea y, si el modelo actual no es Opus, recomienda cambiarlo en el selector.

1. Reúne evidencia antes de opinar: reproduce el fallo, lee el código implicado, mide si es rendimiento.
2. Encuentra la causa raíz; no tapes síntomas.
3. Compara como mucho dos alternativas y elige una, con su riesgo en una frase.
4. Revisa seguridad, integridad de datos e integración con lo existente.
5. Entrega un plan por pasos verificables. Lo rutinario (implementar el plan, tests) puede ir a `sonnet-constructor` en vez de hacerlo aquí con Opus.
