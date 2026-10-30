"""Transcribe audio o vídeo a texto con marcas de tiempo (Whisper local, gratis).

Uso: transcribir.py ARCHIVO [--modelo small] [--idioma es] [--srt salida.srt]
                    [--palabras salida.json] [--bloque 15]
Imprime el texto agrupado en bloques de --bloque segundos: compacto para leerlo.
"""

import argparse
import json
import subprocess
import sys

import numpy as np


def cargar(ruta: str) -> np.ndarray:
    # ffmpeg en vez de PyAV: evita choques de versiones y lee cualquier formato.
    crudo = subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", ruta, "-vn", "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(crudo, np.int16).astype(np.float32) / 32768


def hms(segundos: float, srt: bool = False) -> str:
    h, resto = divmod(segundos, 3600)
    m, s = divmod(resto, 60)
    if srt:
        return f"{int(h):02}:{int(m):02}:{int(s):02},{int((s % 1) * 1000):03}"
    return f"{int(h)}:{int(m):02}:{int(s):02}" if h else f"{int(m)}:{int(s):02}"


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("archivo")
    p.add_argument("--modelo", default="small", help="tiny, base, small, medium, large-v3")
    p.add_argument("--idioma", default=None, help="es, en... (vacío: detecta)")
    p.add_argument("--srt", help="escribe subtítulos .srt")
    p.add_argument("--palabras", help="escribe marcas por palabra en JSON (subtítulos animados)")
    p.add_argument("--bloque", type=float, default=15, help="segundos por línea al imprimir")
    a = p.parse_args()

    from faster_whisper import WhisperModel

    modelo = WhisperModel(a.modelo, device="cpu", compute_type="int8")
    segmentos, info = modelo.transcribe(
        cargar(a.archivo), language=a.idioma, vad_filter=True, word_timestamps=bool(a.palabras)
    )
    segmentos = list(segmentos)

    print(f"# idioma {info.language} ({info.language_probability:.0%}), {hms(info.duration)}")
    bloque, inicio = [], None
    for s in segmentos:
        inicio = s.start if inicio is None else inicio
        bloque.append(s.text.strip())
        if s.end - inicio >= a.bloque:
            print(f"[{hms(inicio)}] {' '.join(bloque)}")
            bloque, inicio = [], None
    if bloque:
        print(f"[{hms(inicio)}] {' '.join(bloque)}")

    if a.srt:
        with open(a.srt, "w") as f:
            for i, s in enumerate(segmentos, 1):
                f.write(f"{i}\n{hms(s.start, True)} --> {hms(s.end, True)}\n{s.text.strip()}\n\n")
    if a.palabras:
        palabras = [
            {"t0": round(w.start, 2), "t1": round(w.end, 2), "w": w.word.strip()}
            for s in segmentos
            for w in (s.words or [])
        ]
        with open(a.palabras, "w") as f:
            json.dump(palabras, f, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
