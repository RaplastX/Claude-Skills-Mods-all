# Recetas de ffmpeg

Añade `-loglevel error -y` a todas. Re-codifica con `-c:v libx264 -preset veryfast -crf 20 -c:a aac` salvo que se indique `-c copy`.

## Cortar

```bash
# Rápido, sin recodificar (corta en el fotograma clave más cercano)
ffmpeg -ss 00:01:05 -to 00:01:40 -i in.mp4 -c copy corte.mp4
# Exacto al fotograma
ffmpeg -ss 00:01:05 -to 00:01:40 -i in.mp4 -c:v libx264 -preset veryfast -crf 20 -c:a aac corte.mp4
```

## Unir

```bash
printf "file '%s'\n" a.mp4 b.mp4 c.mp4 > lista.txt
ffmpeg -f concat -safe 0 -i lista.txt -c copy unido.mp4   # mismos códecs y tamaño
# Distintos tamaños o códecs: normaliza cada uno antes con la receta "Vertical" o "Horizontal".
```

## Vertical 9:16 (TikTok, Reels, Shorts)

```bash
# Recorta el centro
ffmpeg -i in.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:a copy vertical.mp4
# Sin recortar: vídeo entero con fondo desenfocado
ffmpeg -i in.mp4 -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:5[f];[0:v]scale=1080:-2[v];[f][v]overlay=(W-w)/2:(H-h)/2" -c:a copy vertical.mp4
```

Horizontal: lo mismo con `1920:1080`.

## Subtítulos

```bash
python3 ../../audio/scripts/transcribir.py in.mp4 --srt subs.srt      # desde crear-videos/references
ffmpeg -i in.mp4 -vf "subtitles=subs.srt:force_style='FontName=DejaVu Sans,FontSize=16,Bold=1,Outline=2,MarginV=60'" -c:a copy subtitulado.mp4
```

Para vertical sube `FontSize` (~22) y `MarginV` (~250) para que no los tape la interfaz de la app.

## Música por debajo de la voz (ducking)

```bash
ffmpeg -i voz.mp4 -stream_loop -1 -i musica.mp3 -filter_complex "[1:a]volume=0.35[m];[m][0:a]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[duck];[0:a][duck]amix=inputs=2:duration=first:normalize=0[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -shortest final.mp4
```

## Cortes al ritmo de la música

```bash
python3 ../../audio/scripts/musica.py musica.mp3 --pulsos pulsos.json
```

Usa `compases` de `pulsos.json` como instantes de corte: cada clip dura la diferencia entre dos compases. Corta cada clip a esa duración (receta "Cortar" exacta), únelos y pon la música encima con `-map 0:v -map 1:a -shortest`.

## Velocidad

```bash
ffmpeg -i in.mp4 -filter_complex "[0:v]setpts=PTS/1.5[v];[0:a]atempo=1.5[a]" -map "[v]" -map "[a]" rapido.mp4
```

## Texto encima

```bash
ffmpeg -i in.mp4 -vf "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='TÍTULO':fontsize=72:fontcolor=white:borderw=4:x=(w-tw)/2:y=h*0.12:enable='between(t,0,3)'" -c:a copy titulo.mp4
```

## Imagen a vídeo con zoom suave (Ken Burns)

```bash
ffmpeg -loop 1 -i foto.png -vf "scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,zoompan=z='min(1+0.08*on/150,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=150:s=1080x1920:fps=30" -t 5 -pix_fmt yuv420p zoom.mp4
```

## Transición entre dos clips

```bash
# Fundido de 0.5 s; offset = duración del primero - 0.5
ffmpeg -i a.mp4 -i b.mp4 -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5[v];[0:a][1:a]acrossfade=d=0.5[a]" -map "[v]" -map "[a]" transicion.mp4
```

## GIF ligero

```bash
ffmpeg -i in.mp4 -vf "fps=12,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" out.gif
```

## Extraer audio o quitarlo

```bash
ffmpeg -i in.mp4 -vn -c:a libmp3lame -q:a 2 audio.mp3
ffmpeg -i in.mp4 -an -c:v copy mudo.mp4
```

## Comprimir para enviar

```bash
ffmpeg -i in.mp4 -c:v libx264 -preset veryfast -crf 28 -vf "scale='min(1080,iw)':-2" -c:a aac -b:a 96k ligero.mp4
```
