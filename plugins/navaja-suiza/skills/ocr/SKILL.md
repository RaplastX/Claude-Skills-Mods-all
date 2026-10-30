---
name: ocr
description: Lee el texto de capturas de pantalla, fotos de documentos y diagramas con OCR local y gratis, y da las coordenadas de botones y textos. Úsala antes de mirar una imagen con Read cuando solo importe el texto o dónde está algo.
---

# OCR

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/ocr.py imagen.png [otra.png] [--cajas]
```

Si falta: `bash ${CLAUDE_SKILL_DIR}/../instalar/scripts/instalar.sh docs`.

- Es la forma barata de «leer» una captura: devuelve el texto en orden de lectura; con `--cajas`, el centro `(x,y)` de cada línea, útil para saber dónde está un botón.
- Pierde tildes y signos como «¿»: no lo uses para citar textos literales; para eso, mira la imagen con Read.
- No entiende dibujos, colores ni diseño. Para analizar un error visual, una interfaz o un diagrama, mira la imagen con Read (recortada a la zona que importa).
- Documentos escaneados: convierte cada página a imagen (`pdftoppm -r 150 -png doc.pdf pag`) y pasa el OCR.
