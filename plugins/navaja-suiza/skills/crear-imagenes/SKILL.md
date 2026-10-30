---
name: crear-imagenes
description: Crear imágenes realistas con IA gratis (Z-Image-Turbo y Qwen-Image, sin Higgsfield ni pagos) y diseños exactos con texto (miniaturas, banners, portadas) desde HTML.
---

# Crear imágenes

Rutas relativas al directorio base de esta skill. Si falta el motor: `bash ../instalar/scripts/instalar.sh imagen`.

**Fotos e ilustraciones con IA:**

```bash
python3 scripts/imagen.py "prompt 1" ["prompt 2"...] --formato 3:4 [--modelo z-image|qwen] [--semilla 7] [--motor space|local]
```

- Por defecto usa la GPU gratis de Hugging Face (segundos por imagen, cuota diaria). Necesita el secreto `HF_TOKEN` de una cuenta gratuita; si falta o se acaba la cuota, el script lo dice y no genera.
- `--motor local` genera en la CPU del servidor sin cuentas ni límites, pero tarda unos 20 min por imagen: úsalo solo si la persona acepta esperar, en segundo plano.
- `--modelo qwen` (solo en GPU) es el mejor modelo abierto; úsalo para la versión final, no para probar.
- Varias imágenes: pásalas en una sola llamada (el modelo se carga una vez).
- Escribe el prompt en inglés y concreto: sujeto, acción, lugar, luz, cámara y objetivo, textura ("natural skin texture, film grain"). Para variar sin cambiar el prompt, cambia `--semilla`.
- Revisa cada resultado con Read antes de entregarlo; si falla (manos, texto, anatomía), cambia la semilla o el prompt, no entregues la primera sin mirar.

**Diseños con texto exacto** (miniaturas de YouTube, banners, portadas): escribe un HTML con el diseño (puede incluir imágenes generadas) y conviértelo:

```bash
node scripts/html2png.mjs diseno.html salida.png --ancho 1280 --alto 720
```

Tienes también Canva conectado (`generate-design`, `generate-image`) si la persona prefiere sus plantillas.

Salida en `~/navaja-salida/imagenes/`; entrega con SendUserFile.
