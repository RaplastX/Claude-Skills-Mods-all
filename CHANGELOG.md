# Cambios

## 0.4.0 — más skills revisadas
- `diseno` 0.2.0: añade `frontend-design` (Apache 2.0).
- `desarrollo` 0.1.0 (plugin nuevo): `research`, `code-review`, `tdd` (MIT).
- `navaja-suiza` 0.4.0: añade `hyperframes` (Apache 2.0) y `agent-browser` (instrucciones, Apache 2.0).
- No incluidas: `pdf`, `docx`, `pptx` de Anthropic (licencia propietaria) y las de pago.

## 0.3.1
- Plugin nuevo `diseno` (ui-ux-pro-max y diagram-design, revisados, con descripciones cortas).
- `ver-medios`: lee la duración de archivos que ffprobe no abre y explica el fallo de audio xHE-AAC.

## 0.3.0 — navaja-suiza
- Skills nuevas: `ocr` (RapidOCR), `documentos` (PyMuPDF y MarkItDown) y `ahorro`. `/instalar docs`.

## 0.2.0 — ruteo verificable (fase 1)

**router-ia-auto (mod)**
- Registra en cada petición el modelo pedido y el que respondió según el servidor, también en los subagentes.
- Comandos nuevos: `/ruta-estado`, `/ruta-auditar`, `/ruta-probar [vivo]`.
- Respeta el modelo que ya eligió otro: skills con `model:`, fallbacks y `opusplan`.
- Clasificador `mixto` opcional: pregunta a Haiku solo en los casos dudosos.
- Preguntas sencillas a Haiku (antes, Sonnet bajo).
- Regla de caché corregida: bajar a Haiku ya no espera; solo bajar de Opus a Sonnet con contexto grande espera un segundo turno.
- Reconoce los mensajes de sesiones en la nube que llegan sin clasificar.

**router-ia**
- Skills con cambio de modelo nativo: `/rapido` (Haiku·bajo), `/estandar` (Sonnet·medio), `/profundo` (Opus·alto).
- Subagentes nuevos: `auditor-repo` (Haiku), `probador` e `investigador` (Sonnet); herramientas mínimas por agente.
- Bloque de transparencia «DECISIÓN DE RUTA» con solo datos comprobables; instrucciones exactas para cambiar modelo y esfuerzo en el chat.

**navaja-suiza**
- Rutas de scripts con `${CLAUDE_SKILL_DIR}`.

**Repositorio**
- `docs/MODEL-ROUTING.md` con la auditoría de lo anterior; `scripts/empaquetar.sh` genera los paquetes, incluido el ZIP solo para el chat.

## 0.1.x

- `router-ia`, `router-ia-auto` y `navaja-suiza` iniciales.
