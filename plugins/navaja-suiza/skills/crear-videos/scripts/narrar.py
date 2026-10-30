"""Monta un vídeo narrado: voz + imágenes o clips + subtítulos + música.

Uso: narrar.py guion.json [--salida video.mp4]

guion.json:
{
  "formato": "9:16",                      // 9:16, 16:9 o 1:1
  "voz": "es_MX-claude-high",             // o "clon:/ruta/muestra.wav"
  "velocidad": 1.05,                      // opcional
  "musica": "/ruta/musica.mp3",           // opcional, va por debajo de la voz
  "subtitulos": true,                     // opcional (por defecto sí)
  "escenas": [
    {"texto": "Lo que dice la voz en esta escena.", "visual": "/ruta/foto.png"},
    {"texto": "Otra frase.", "visual": "/ruta/clip.mp4", "desde": 3.5}
  ]
}
Cada escena dura lo que dura su narración. Las imágenes llevan un zoom suave.
"""

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent
VOZ = AQUI.parent.parent / "audio" / "scripts" / "voz.py"
TAMANOS = {"9:16": (1080, 1920), "16:9": (1920, 1080), "1:1": (1080, 1080)}
FPS = 30


def ff(*args: str) -> None:
    r = subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *args], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"ffmpeg falló: {r.stderr.strip()[-600:]}")


def duracion(ruta: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(ruta)],
                       capture_output=True, text=True)
    return float(r.stdout.strip())


def ass_tiempo(t: float) -> str:
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02}:{t % 60:05.2f}"


def trozos(texto: str, palabras: int = 6) -> list[str]:
    lista = texto.split()
    return [" ".join(lista[i:i + palabras]) for i in range(0, len(lista), palabras)]


def subtitulos(escenas: list[tuple[str, float]], ancho: int, alto: int, ruta: Path) -> None:
    grande = alto > ancho
    estilo = (f"Style: N,DejaVu Sans,{72 if grande else 58},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,"
              f"1,0,0,0,100,100,0,0,1,5,2,2,80,80,{int(alto * (0.22 if grande else 0.08))},1")
    lineas = ["[Script Info]", "ScriptType: v4.00+", f"PlayResX: {ancho}", f"PlayResY: {alto}", "",
              "[V4+ Styles]",
              "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
              "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, "
              "Shadow, Alignment, MarginL, MarginR, MarginV, Encoding", estilo, "", "[Events]",
              "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
    t = 0.0
    for texto, dur in escenas:
        partes = trozos(texto)
        total = sum(len(p) for p in partes) or 1
        inicio = t
        for parte in partes:
            fin = inicio + dur * len(parte) / total
            lineas.append(f"Dialogue: 0,{ass_tiempo(inicio)},{ass_tiempo(fin)},N,,0,0,0,,{parte}")
            inicio = fin
        t += dur
    ruta.write_text("\n".join(lineas) + "\n")


def escena(visual: Path, dur: float, desde: float, ancho: int, alto: int, salida: Path) -> None:
    ajuste = f"scale={ancho}:{alto}:force_original_aspect_ratio=increase,crop={ancho}:{alto}"
    if visual.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"):
        frames = int(dur * FPS) + 1
        zoom = (f"scale={ancho * 2}:{alto * 2}:force_original_aspect_ratio=increase,crop={ancho * 2}:{alto * 2},"
                f"zoompan=z='min(1+0.08*on/{frames},1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
                f":d={frames}:s={ancho}x{alto}:fps={FPS}")
        ff("-loop", "1", "-i", str(visual), "-vf", zoom, "-t", f"{dur:.3f}", "-an",
           "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", str(salida))
    else:
        ff("-stream_loop", "-1", "-ss", f"{desde}", "-i", str(visual), "-vf", f"{ajuste},fps={FPS}",
           "-t", f"{dur:.3f}", "-an", "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
           str(salida))


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("guion")
    p.add_argument("--salida", default=str(Path.home() / "navaja-salida" / "videos" / "video.mp4"))
    a = p.parse_args()

    guion = json.loads(Path(a.guion).read_text())
    ancho, alto = TAMANOS[guion.get("formato", "9:16")]
    voz = guion.get("voz", "es_MX-claude-high")
    salida = Path(a.salida)
    salida.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        hechas, lista = [], []
        for i, e in enumerate(guion["escenas"], 1):
            audio = tmp / f"voz{i}.wav"
            args = [sys.executable, str(VOZ), "--texto", e["texto"], "--salida", str(audio),
                    "--velocidad", str(guion.get("velocidad", 1.0))]
            args += ["--clonar", voz[5:]] if voz.startswith("clon:") else ["--voz", voz]
            subprocess.run(args, check=True, capture_output=True)
            dur = duracion(audio) + 0.25
            clip = tmp / f"escena{i}.mp4"
            escena(Path(e["visual"]), dur, float(e.get("desde", 0)), ancho, alto, clip)
            ff("-i", str(clip), "-i", str(audio), "-af", "apad", "-t", f"{dur:.3f}", "-c:v", "copy",
               "-c:a", "aac", "-ar", "44100", "-ac", "2", str(tmp / f"final{i}.mp4"))
            lista.append(f"file '{tmp / f'final{i}.mp4'}'")
            hechas.append((e["texto"], dur))
            print(f"escena {i}/{len(guion['escenas'])}: {dur:.1f} s", flush=True)

        (tmp / "lista.txt").write_text("\n".join(lista) + "\n")
        unido = tmp / "unido.mp4"
        ff("-f", "concat", "-safe", "0", "-i", str(tmp / "lista.txt"), "-c", "copy", str(unido))
        total = sum(d for _, d in hechas)

        filtros_v = []
        if guion.get("subtitulos", True):
            subtitulos(hechas, ancho, alto, tmp / "subs.ass")
            filtros_v.append(f"subtitles={tmp / 'subs.ass'}")
        entradas = ["-i", str(unido)]
        if guion.get("musica"):
            entradas += ["-stream_loop", "-1", "-i", guion["musica"]]
            mezcla = (f"[1:a]volume=0.18,afade=t=out:st={max(total - 2, 0):.2f}:d=2[m];"
                      "[0:a][m]amix=inputs=2:duration=first:normalize=0[a]")
            ff(*entradas, "-filter_complex", mezcla, "-map", "0:v", "-map", "[a]",
               *(["-vf", ",".join(filtros_v)] if filtros_v else []),
               "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-t", f"{total:.3f}",
               "-movflags", "+faststart", str(salida))
        else:
            ff(*entradas, *(["-vf", ",".join(filtros_v)] if filtros_v else []),
               "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac",
               "-movflags", "+faststart", str(salida))

    print(f"{salida} ({total:.1f} s, {ancho}x{alto})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
