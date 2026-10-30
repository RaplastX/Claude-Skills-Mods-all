---
name: crear-videos
description: Crear y editar vídeos gratis en el servidor: vídeos narrados con voz y subtítulos, cortar, unir, formato vertical, subtítulos y música (ffmpeg), y vídeos animados con código (HyperFrames o Remotion).
---

# Crear vídeos

Rutas relativas al directorio base de esta skill. Si falta algo: `bash ../instalar/scripts/instalar.sh video`.

**Vídeo narrado** (voz + imágenes/clips + subtítulos + música): escribe un `guion.json` (formato en la cabecera de `scripts/narrar.py`) y:

```bash
python3 scripts/narrar.py guion.json --salida ~/navaja-salida/videos/video.mp4
```

Las imágenes pueden salir de la skill `crear-imagenes`; la voz puede ser `"clon:/ruta/muestra.wav"`.

**Editar con ffmpeg**: recetas probadas en `references/ffmpeg.md` (cortar, unir, vertical 9:16, subtítulos quemados, música con ducking, cortes al ritmo, acelerar, GIF). Léela solo cuando la necesites.

**Animados con código** (intros, textos animados, motion graphics): HyperFrames (HTML + GSAP) con `npx skills add heygen-com/hyperframes` o Remotion (React). Renderiza con el Chromium que ya trae el servidor. Para algo corto, a menudo basta HTML animado + captura con ffmpeg.

Comprueba siempre el resultado antes de entregarlo: duración con `ffprobe` y una hoja de fotogramas con `python3 ../ver-medios/scripts/ver.py video.mp4 --fotos 8` (léela con Read). Entrega con SendUserFile.
