---
name: ver-medios
description: Ver y entender vídeos de YouTube, TikTok, Instagram, X y otras webs o archivos de vídeo/audio (fotogramas clave + transcripción). Úsala cuando te pasen un enlace o archivo de vídeo o audio.
---

# Ver vídeos y audios

```bash
python3 scripts/ver.py "URL_O_ARCHIVO" [--fotos 12] [--desde 1:00 --hasta 2:30] [--solo-audio] [--guardar-video]
```

Rutas relativas al directorio base de esta skill. Si falta `yt-dlp`, ejecuta antes `bash ../instalar/scripts/instalar.sh audio`.

Deja en `~/navaja-salida/ver/`:
- `texto.md`: datos (autor, vistas, descripción) y transcripción por bloques con minutos. Usa los subtítulos del vídeo si existen; si no, Whisper.
- `hoja.jpg`: una sola imagen con los fotogramas y su minuto. Léela con Read: es la forma barata de "ver" el vídeo.

Para ahorrar tokens:
- Empieza con 12 fotos. Si hace falta detalle de un momento, repite con `--desde/--hasta` en ese tramo, no subas las fotos de todo el vídeo.
- Si solo importa lo que se dice, `--solo-audio` (no baja vídeo).
- Lee `texto.md` por partes si es largo.

Imágenes sueltas: léelas directamente con Read. Audios: esta misma herramienta con el archivo, o la skill `audio`.

Si falla por login o «private»: hace falta el secreto `NAVAJA_COOKIES` (ver `/instalar`). No intentes saltarte el bloqueo de otra forma.
