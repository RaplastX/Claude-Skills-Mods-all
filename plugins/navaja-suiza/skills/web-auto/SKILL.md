---
name: web-auto
description: Controlar webs con un navegador real: investigar y extraer datos, hacer tareas con la cuenta de la persona (cookies), probar sus apps web (capturas, errores, vista móvil) y publicar en redes con Buffer o Metricool.
---

# Webs y automatización


**Script (rápido y con tus cookies):**

```bash
node ${CLAUDE_SKILL_DIR}/scripts/navegar.mjs URL [--movil] [--captura f.png] [--pagina-entera] [--texto 4000] [--pasos pasos.json] [--guardar-sesion]
```

Devuelve título, texto de la página (recortado a `--texto` caracteres), errores de consola y red, y capturas. Con `--pasos` hace clics, escribe, pulsa teclas, espera, extrae texto o evalúa JS (formato en la cabecera del script). Usa las cookies de `NAVAJA_COOKIES` si se instalaron con `/instalar`.

**Cuándo usar qué:**
- Leer una página o extraer datos: el script con `--texto` (no hace falta captura).
- Explorar una web desconocida paso a paso: las herramientas de Playwright (`mcp__plugin_playwright_*`) si están cargadas; luego pasa lo aprendido a un `pasos.json` para repetirlo barato.
- Probar una app: `--movil --captura` y revisa la sección de errores; para el escritorio, sin `--movil`.
- Publicar en redes: los conectores de Buffer o Metricool, no el navegador.
- Tareas que se repiten (cada día, cada hora): una tarea programada que ejecute el script.

Reglas: pide confirmación antes de enviar formularios, comprar, publicar o borrar algo en nombre de la persona. No escribas contraseñas: la sesión viene de las cookies. Respeta los términos de cada web y no fuerces captchas ni bloqueos.
