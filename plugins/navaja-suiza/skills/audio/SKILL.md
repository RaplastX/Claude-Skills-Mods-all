---
name: audio
description: Escuchar audio (transcribir con marcas de tiempo), generar voz en español, clonar la voz de la persona a partir de una muestra y analizar música (tempo, tonalidad, secciones, pulsos).
---

# Audio

Si falta algo: `bash ${CLAUDE_SKILL_DIR}/../instalar/scripts/instalar.sh audio` (o `clon` para clonar voz).

| Tarea | Comando |
| --- | --- |
| Transcribir | `python3 ${CLAUDE_SKILL_DIR}/scripts/transcribir.py archivo [--idioma es] [--srt subs.srt] [--palabras palabras.json]` |
| Voz en español | `python3 ${CLAUDE_SKILL_DIR}/scripts/voz.py --texto "..." --salida voz.mp3 [--voz es_ES-davefx-medium] [--velocidad 1.1]` |
| Clonar voz | `python3 ${CLAUDE_SKILL_DIR}/scripts/voz.py --archivo guion.txt --clonar muestra.wav --salida voz.wav` |
| Analizar música | `python3 ${CLAUDE_SKILL_DIR}/scripts/musica.py cancion.mp3 [--pulsos pulsos.json]` |

- Transcribir: modelo `small` por defecto (rápido en CPU); `--modelo medium` solo si el audio es difícil. `--palabras` sirve para subtítulos palabra a palabra.
- Voces disponibles: `es_MX-claude-high` (México, por defecto) y `es_ES-davefx-medium` (España).
- Clonar: la muestra debe ser 10-30 s de la persona hablando sola, sin música ni eco. Es lento en CPU (del orden de minutos por párrafo): pruébalo primero con una frase y lánzalo en segundo plano si es largo. Úsalo solo con la voz de quien lo pide o con su permiso.
- No puedes oír el audio: para comprobar una voz generada, transcríbela y compara con el texto.
- Entrega los archivos con SendUserFile.
