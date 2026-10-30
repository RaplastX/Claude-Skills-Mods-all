"""Analiza una canción: tempo, tonalidad, energía, secciones y pulsos.

Uso: musica.py ARCHIVO [--pulsos pulsos.json]
Imprime un resumen corto; --pulsos guarda los tiempos de cada pulso para cortar
vídeo a ritmo.
"""

import argparse
import json
import sys

import numpy as np

NOTAS = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"]
# Perfiles de Krumhansl-Schmuckler.
MAYOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MENOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def tonalidad(croma: np.ndarray) -> tuple[str, float]:
    perfil = croma.mean(axis=1)
    mejor = ("", -2.0)
    for i in range(12):
        for modo, plantilla in (("mayor", MAYOR), ("menor", MENOR)):
            r = float(np.corrcoef(perfil, np.roll(plantilla, i))[0, 1])
            if r > mejor[1]:
                mejor = (f"{NOTAS[i]} {modo}", r)
    return mejor


def mmss(t: float) -> str:
    return f"{int(t // 60)}:{int(t % 60):02}"


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("archivo")
    p.add_argument("--pulsos", help="guarda los pulsos y compases en JSON")
    a = p.parse_args()

    import librosa

    y, sr = librosa.load(a.archivo, sr=22050, mono=True)
    dur = len(y) / sr
    tempo, pulsos = librosa.beat.beat_track(y=y, sr=sr, units="time")
    tempo = float(np.atleast_1d(tempo)[0])
    if len(pulsos) >= 4:
        # Media de los intervalos normales: corrige el redondeo a fotogramas de beat_track.
        intervalos = np.diff(pulsos)
        normales = intervalos[np.abs(intervalos - np.median(intervalos)) < 0.15 * np.median(intervalos)]
        tempo = 60 / float(normales.mean())
    tono, confianza = tonalidad(librosa.feature.chroma_cqt(y=y, sr=sr))

    # Energía por tramos de 2 s y fronteras de sección.
    rms = librosa.feature.rms(y=y)[0]
    tiempos = librosa.times_like(rms, sr=sr)
    paso = 2.0
    tramos = [
        float(rms[(tiempos >= t) & (tiempos < t + paso)].mean() if ((tiempos >= t) & (tiempos < t + paso)).any() else 0)
        for t in np.arange(0, dur, paso)
    ]
    maximo = max(tramos) or 1.0
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    k = int(min(8, max(2, dur // 20)))
    fronteras = [0.0]
    for t in librosa.frames_to_time(librosa.segment.agglomerative(mfcc, k), sr=sr):
        if t - fronteras[-1] >= 2 and dur - t >= 2:
            fronteras.append(float(t))

    print(f"duración {mmss(dur)} · tempo {tempo:.0f} BPM · tonalidad {tono} (confianza {confianza:.2f})")
    print(f"pulsos: {len(pulsos)}; primer pulso en {pulsos[0]:.2f}s" if len(pulsos) else "pulsos: ninguno claro")
    secciones = fronteras + [dur]
    print("secciones (inicio, energía 0-10):")
    for ini, fin in zip(secciones[:-1], secciones[1:]):
        dentro = [e for t, e in zip(np.arange(0, dur, paso), tramos) if ini <= t < fin]
        energia = round(10 * (np.mean(dentro) if dentro else 0) / maximo)
        print(f"  {mmss(ini)}-{mmss(fin)}  {'█' * energia}{'·' * (10 - energia)} {energia}")
    pico = int(np.argmax(tramos)) * paso
    print(f"momento más intenso: {mmss(pico)}")

    if a.pulsos:
        with open(a.pulsos, "w") as f:
            json.dump(
                {"tempo": round(tempo, 2), "pulsos": [round(float(t), 3) for t in pulsos],
                 "compases": [round(float(t), 3) for t in pulsos[::4]],
                 "secciones": [round(float(t), 2) for t in fronteras]},
                f,
            )
    return 0


if __name__ == "__main__":
    sys.exit(main())
