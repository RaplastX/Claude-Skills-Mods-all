---
name: documentos
description: Convierte PDF, Word, PowerPoint, Excel, HTML o una URL a Markdown compacto (con tablas) sin meter el documento entero en la conversación. Úsala para analizar, resumir o extraer datos de documentos largos.
---

# Documentos a texto

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/doc2md.py "archivo_o_url" [--paginas 3-8] [--max 6000] [--salida doc.md]
```

Si falta: `bash ${CLAUDE_SKILL_DIR}/../instalar/scripts/instalar.sh docs`.

- Imprime solo los primeros `--max` caracteres; el documento completo queda en `~/navaja-salida/doc.md`.
- Documento largo: primero busca con Grep en `doc.md` lo que necesitas y lee solo esos rangos; no lo leas entero.
- PDF: usa `--paginas` cuando sepas qué páginas importan. Las tablas salen en Markdown.
- Si dice «sin texto», es un escaneo: usa la skill `ocr`.
- Excel grande: procesa con Python (pandas) y trae solo el resumen, no las filas.
- Para páginas web dinámicas usa `web-auto`; para YouTube y redes, `ver-medios`.
