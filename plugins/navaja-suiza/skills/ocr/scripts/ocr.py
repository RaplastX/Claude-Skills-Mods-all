"""Lee el texto de imágenes y capturas con OCR local (RapidOCR, gratis, sin GPU).

Uso: ocr.py IMAGEN [IMAGEN...] [--cajas] [--json salida.json]
Imprime el texto en el orden de lectura. Con --cajas añade el centro (x,y) de
cada línea: sirve para saber dónde tocar un botón en una captura.
Ahorra tokens: leer una captura con OCR cuesta unas decenas de tokens; verla, cientos o miles.
"""

import argparse
import json
import sys


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("imagenes", nargs="+")
    p.add_argument("--cajas", action="store_true", help="incluye coordenadas del centro")
    p.add_argument("--json", help="guarda el resultado completo")
    a = p.parse_args()

    from rapidocr_onnxruntime import RapidOCR

    motor = RapidOCR()
    todo = {}
    for ruta in a.imagenes:
        resultado, _ = motor(ruta)
        lineas = []
        for caja, texto, confianza in resultado or []:
            xs, ys = [pt[0] for pt in caja], [pt[1] for pt in caja]
            lineas.append({"texto": texto, "conf": round(float(confianza), 2),
                           "x": int(sum(xs) / 4), "y": int(sum(ys) / 4)})
        lineas.sort(key=lambda l: (l["y"] // 12, l["x"]))
        todo[ruta] = lineas
        if len(a.imagenes) > 1:
            print(f"## {ruta}")
        if not lineas:
            print("(sin texto detectado)")
        for l in lineas:
            print(f"{l['texto']}  @({l['x']},{l['y']})" if a.cajas else l["texto"])
    if a.json:
        with open(a.json, "w") as f:
            json.dump(todo, f, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
