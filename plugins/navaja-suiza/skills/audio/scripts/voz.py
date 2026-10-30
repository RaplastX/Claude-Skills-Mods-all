"""Genera voz en español a partir de texto, gratis y en el servidor.

Uso:
  voz.py --texto "Hola" --salida voz.mp3                       voz Piper (rápida)
  voz.py --archivo guion.txt --voz es_ES-davefx-medium --salida voz.wav
  voz.py --texto "Hola" --clonar muestra.wav --salida voz.wav  tu voz (Chatterbox, lento)
Opciones: --velocidad 1.0 (más alto = más rápido), --pausa 0.3 (s entre frases).
"""

import argparse
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

VOCES = Path(os.environ.get("NAVAJA_CACHE", Path.home() / ".cache" / "navaja")) / "voces"


def a_salida(wav: str, salida: str) -> None:
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-i", wav, *(["-b:a", "128k"] if salida.endswith(".mp3") else []), salida],
        check=True,
    )


def piper(texto: str, voz: str, velocidad: float, pausa: float, wav: str) -> None:
    modelo = VOCES / f"{voz}.onnx"
    if not modelo.exists():
        disponibles = ", ".join(p.stem for p in VOCES.glob("*.onnx")) or "ninguna (ejecuta /instalar audio)"
        sys.exit(f"No está la voz {voz}. Disponibles: {disponibles}")
    subprocess.run(
        [sys.executable, "-m", "piper", "-m", str(modelo), "-f", wav,
         "--length-scale", str(round(1 / velocidad, 3)), "--sentence-silence", str(pausa)],
        input=texto.encode(),
        check=True,
        capture_output=True,
    )


def chatterbox(texto: str, muestra: str, wav: str, pausa: float) -> None:
    import torch
    import torchaudio
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    torch.set_num_threads(os.cpu_count() or 4)
    modelo = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    # Frases cortas: el modelo es más estable y se puede seguir el avance.
    frases = [f for f in re.split(r"(?<=[.!?¿¡;:])\s+", texto.strip()) if f]
    silencio = torch.zeros(1, int(modelo.sr * pausa))
    trozos = []
    for i, frase in enumerate(frases, 1):
        print(f"  frase {i}/{len(frases)}", file=sys.stderr, flush=True)
        trozos += [modelo.generate(frase, language_id="es", audio_prompt_path=muestra), silencio]
    torchaudio.save(wav, torch.cat(trozos, dim=1), modelo.sr)


def main() -> int:
    p = argparse.ArgumentParser()
    fuente = p.add_mutually_exclusive_group(required=True)
    fuente.add_argument("--texto")
    fuente.add_argument("--archivo")
    p.add_argument("--salida", required=True, help=".mp3 o .wav")
    p.add_argument("--voz", default="es_MX-claude-high")
    p.add_argument("--clonar", help="muestra de tu voz (10-30 s, limpia, sin música)")
    p.add_argument("--velocidad", type=float, default=1.0)
    p.add_argument("--pausa", type=float, default=0.3)
    a = p.parse_args()

    texto = a.texto if a.texto is not None else Path(a.archivo).read_text()
    with tempfile.TemporaryDirectory() as tmp:
        wav = str(Path(tmp) / "voz.wav")
        if a.clonar:
            chatterbox(texto, a.clonar, wav, a.pausa)
        else:
            piper(texto, a.voz, a.velocidad, a.pausa, wav)
        if a.clonar and a.velocidad != 1.0:
            lento = str(Path(tmp) / "tempo.wav")
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-filter:a",
                            f"atempo={a.velocidad}", lento], check=True)
            wav = lento
        a_salida(wav, a.salida)

    dur = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.salida],
        capture_output=True, text=True,
    ).stdout.strip()
    print(f"{a.salida} ({float(dur):.1f} s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
