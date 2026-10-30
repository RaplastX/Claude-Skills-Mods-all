---
name: ahorro
description: Reglas y plantilla para gastar pocos tokens en el plan Pro sin perder calidad: qué leer, qué filtrar, cuándo abrir una sesión nueva y un CLAUDE.md corto para los repositorios. Úsala al empezar un proyecto grande o cuando el uso se esté yendo rápido.
---

# Ahorrar tokens sin perder calidad

Cada mensaje reenvía toda la conversación: lo que entra al contexto se paga en cada turno siguiente. Ahorrar es **no meter lo que no hace falta**.

1. **Procesa antes de leer.** Imágenes → `ocr`; documentos largos → `documentos`; vídeos → `ver-medios`; webs → `web-auto --texto`. Logs y salidas largas: filtra con `grep`/`tail`/`head` o un script, y trae el resumen.
2. **Busca antes de abrir.** Grep/Glob y lecturas por rango; no releas lo que ya está en la conversación.
3. **Delega lo grande, no lo pequeño.** Exploraciones y búsquedas largas a un subagente barato (Haiku); lo que se resuelve en 2-3 pasos, hazlo tú. Cada subagente también gasta uso.
4. **Sesiones cortas y por tarea.** Cuando termines una tarea o el contexto esté lleno de cosas viejas, abre una sesión nueva (o `/compact`). Deja el estado en el repo (commit, notas) en vez de en la conversación.
5. **Respuestas cortas.** Cambios, no archivos enteros; sin resúmenes que repitan lo ya dicho.
6. **Pocos MCP.** Cada servidor MCP añade herramientas al contexto; deja activos solo los que uses.
7. **Esfuerzo y modelo justos:** el router (`router-ia`) los elige; Ultracode apagado salvo para tareas enormes.
8. **Verifica una vez, bien.** Un reintento a ciegas gasta más que un diagnóstico.

## CLAUDE.md para tus repositorios (copia y recorta)

Un CLAUDE.md se carga en **cada** sesión: mantenlo por debajo de ~40 líneas.

```markdown
# <Proyecto>
Qué es: <una frase>. Stack: <lenguajes/frameworks>.
Comandos: instalar `<...>` · probar `<...>` · ejecutar `<...>`.
Estructura: <carpeta> = <qué hay>, <carpeta> = <qué hay>.
Reglas: sigue los patrones existentes; no añadas dependencias sin decirlo; verifica con las pruebas antes de dar algo por hecho.
Estado y decisiones: ver NOTAS.md (no lo leas entero, busca con grep).
```
