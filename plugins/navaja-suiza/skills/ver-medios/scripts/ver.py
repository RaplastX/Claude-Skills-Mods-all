"""Prepara un vídeo o audio (URL o archivo) para que Claude lo "vea" con pocos tokens.

Uso: ver.py URL_O_ARCHIVO [--fotos 12] [--desde 0:30 --hasta 2:00] [--salida DIR]
                          [--modelo small] [--solo-audio] [--guardar-video]
Deja en DIR:
  hoja.jpg       una sola imagen con --fotos fotogramas y su minuto (léela con Read)
  texto.md       datos del vídeo + transcripción por bloques
  video.mp4      solo con --guardar-video (o si es un archivo local, el original)
Imprime las rutas y un resumen corto.
"""

import argparse
import json
import math
import os
import re
import subprocess
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
TRANSCRIBIR = AQUI.parent.parent / "audio" / "scripts" / "transcribir.py"


def corre(*cmd: str, **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def segundos(t: str | None) -> float | None:
    if t is None:
        return None
    partes = [float(x) for x in t.split(":")]
    return sum(v * 60**i for i, v in enumerate(reversed(partes)))


def bajar(url: str, carpeta: Path, solo_audio: bool) -> tuple[Path | None, dict, str | None]:
    info = corre("yt-dlp", "--dump-single-json", "--no-playlist", url)
    if info.returncode != 0:
        error = info.stderr.strip().splitlines()[-1] if info.stderr.strip() else "error desconocido"
        if re.search(r"login|cookies|sign in|private|rate.?limit", error, re.I):
            error += "\n→ Necesita sesión: guarda tus cookies en el secreto NAVAJA_COOKIES y ejecuta /instalar."
        sys.exit(f"No se pudo leer {url}: {error}")
    datos = json.loads(info.stdout)
    formato = "ba/b" if solo_audio else "bv*[height<=480]+ba/b[height<=480]/b"
    destino = carpeta / ("audio.%(ext)s" if solo_audio else "video.%(ext)s")
    r = corre("yt-dlp", "--no-playlist", "-f", formato, "-o", str(destino),
              *(["-x"] if solo_audio else ["--merge-output-format", "mp4"]), url)
    if r.returncode != 0:
        # La web dio los datos pero no el archivo (p. ej. YouTube bloquea servidores):
        # se sigue con datos, subtítulos y miniatura.
        aviso = r.stderr.strip().splitlines()[-1] if r.stderr.strip() else "error desconocido"
        return None, datos, aviso
    archivo = next(carpeta.glob("audio.*" if solo_audio else "video.*"))
    return archivo, datos, None


def subtitulos(datos: dict, carpeta: Path, url: str) -> str | None:
    # Subtítulos del propio vídeo: más fiables y baratos que transcribir.
    idiomas = [i for i in ("es", "es-419", "es-ES", "en") if i in (datos.get("subtitles") or {})]
    auto = [i for i in ("es", "en") if i in (datos.get("automatic_captions") or {})]
    if not idiomas and not auto:
        return None
    r = corre("yt-dlp", "--skip-download", "--no-playlist", "--sub-format", "vtt",
              "--write-subs" if idiomas else "--write-auto-subs",
              "--sub-langs", (idiomas or auto)[0], "-o", str(carpeta / "subs"), url)
    vtt = next(carpeta.glob("subs*.vtt"), None)
    if r.returncode != 0 or vtt is None:
        return None
    lineas, visto, inicio, bloque = [], set(), None, []
    for trozo in vtt.read_text().split("\n\n"):
        m = re.search(r"(\d+:)?(\d+):(\d+)\.\d+ -->", trozo)
        if not m:
            continue
        t = int(m.group(1)[:-1] if m.group(1) else 0) * 3600 + int(m.group(2)) * 60 + int(m.group(3))
        texto = " ".join(re.sub(r"<[^>]+>", "", l).strip() for l in trozo.splitlines()[1:]).strip()
        if not texto or texto in visto:
            continue
        visto.add(texto)
        inicio = t if inicio is None else inicio
        bloque.append(texto)
        if t - inicio >= 15:
            lineas.append(f"[{inicio // 60}:{inicio % 60:02}] {' '.join(bloque)}")
            inicio, bloque = None, []
    if bloque:
        lineas.append(f"[{inicio // 60}:{inicio % 60:02}] {' '.join(bloque)}")
    vtt.unlink()
    return "\n".join(lineas)


def duracion(archivo: Path) -> float:
    r = corre("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(archivo))
    return float(r.stdout.strip() or 0)


def hoja(video: Path, salida: Path, fotos: int, desde: float, hasta: float) -> None:
    tramo = max(hasta - desde, 0.1)
    columnas = 4 if fotos > 6 else fotos
    filas = math.ceil(fotos / columnas)
    filtro = (
        f"fps={fotos}/{tramo:.3f},scale=360:-2,"
        "drawtext=text='%{pts\\:hms}':x=6:y=6:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6,"
        f"tile={columnas}x{filas}:padding=4:color=black"
    )
    r = corre("ffmpeg", "-loglevel", "error", "-y", "-ss", f"{desde}", "-t", f"{tramo}", "-i", str(video),
              "-vf", filtro, "-frames:v", "1", "-q:v", "4", str(salida))
    if r.returncode != 0:  # sin fuentes para drawtext: hoja sin minutos
        filtro = re.sub(r"drawtext=[^,]+,", "", filtro)
        corre("ffmpeg", "-loglevel", "error", "-y", "-ss", f"{desde}", "-t", f"{tramo}", "-i", str(video),
              "-vf", filtro, "-frames:v", "1", "-q:v", "4", str(salida), check=True)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("fuente")
    p.add_argument("--fotos", type=int, default=12)
    p.add_argument("--desde")
    p.add_argument("--hasta")
    p.add_argument("--salida", default=str(Path.home() / "navaja-salida" / "ver"))
    p.add_argument("--modelo", default="small")
    p.add_argument("--solo-audio", action="store_true")
    p.add_argument("--guardar-video", action="store_true")
    a = p.parse_args()

    carpeta = Path(a.salida)
    carpeta.mkdir(parents=True, exist_ok=True)
    for viejo in carpeta.glob("*"):
        if viejo.is_file() and viejo.name.startswith(("video.", "audio.", "subs", "hoja", "texto", "miniatura")):
            viejo.unlink()

    es_url = re.match(r"https?://", a.fuente) is not None
    aviso = None
    if es_url:
        archivo, datos, aviso = bajar(a.fuente, carpeta, a.solo_audio)
    else:
        archivo, datos = Path(a.fuente), {"title": Path(a.fuente).name}

    dur = duracion(archivo) if archivo else float(datos.get("duration") or 0)
    desde = segundos(a.desde) or 0.0
    hasta = min(segundos(a.hasta) or dur, dur)

    texto = subtitulos(datos, carpeta, a.fuente) if es_url else None
    origen = "subtítulos del vídeo"
    if texto is None and archivo is None:
        origen = "ninguno"
        texto = "(sin subtítulos y sin archivo que transcribir)"
    elif texto is None:
        origen = f"Whisper {a.modelo}"
        r = corre(sys.executable, str(TRANSCRIBIR), str(archivo), "--modelo", a.modelo)
        texto = r.stdout.strip() if r.returncode == 0 else f"(sin transcripción: {r.stderr.strip()[-300:]})"

    cabecera = [f"# {datos.get('title', '')}"]
    for clave, nombre in (("uploader", "autor"), ("upload_date", "fecha"), ("view_count", "vistas"),
                          ("like_count", "me gusta"), ("webpage_url", "url")):
        if datos.get(clave):
            cabecera.append(f"- {nombre}: {datos[clave]}")
    cabecera.append(f"- duración: {int(dur // 60)}:{int(dur % 60):02}")
    descripcion = (datos.get("description") or "").strip()
    if descripcion:
        cabecera.append(f"- descripción: {descripcion[:600]}{'…' if len(descripcion) > 600 else ''}")
    (carpeta / "texto.md").write_text("\n".join(cabecera) + f"\n\n## Transcripción ({origen})\n\n{texto}\n")

    print(f"{datos.get('title', '')} · {int(dur // 60)}:{int(dur % 60):02}")
    print(f"texto: {carpeta / 'texto.md'}")
    if archivo is None:
        print(f"sin vídeo: {aviso}")
        if datos.get("thumbnail"):
            miniatura = carpeta / "miniatura.jpg"
            if corre("curl", "-sSfL", "-o", str(miniatura), datos["thumbnail"]).returncode == 0:
                print(f"miniatura: {miniatura}")
        if re.search(r"403|forbidden|sign in|bot", aviso or "", re.I):
            print("→ La web bloquea descargas desde este servidor. Con tus cookies (secreto NAVAJA_COOKIES) "
                  "puede funcionar; si no, trabaja con el texto y la miniatura.")
        return 0
    if not a.solo_audio and archivo.suffix not in (".mp3", ".m4a", ".wav", ".ogg", ".opus", ".flac"):
        hoja(archivo, carpeta / "hoja.jpg", a.fotos, desde, hasta)
        print(f"hoja: {carpeta / 'hoja.jpg'} ({a.fotos} fotogramas entre {int(desde)}s y {int(hasta)}s)")
    if es_url and not a.guardar_video:
        archivo.unlink(missing_ok=True)
    else:
        print(f"medio: {archivo}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
