"""Genera imágenes realistas sin pagar.

Motores:
  space  Z-Image-Turbo o Qwen-Image en GPU gratis de Hugging Face (rápido, cuota
         diaria; necesita el secreto HF_TOKEN de una cuenta gratuita).
  local  Z-Image-Turbo en la CPU del servidor (sin límites ni cuentas, pero muy
         lento: unos 20 min por imagen a 576x768). Solo si la persona acepta la espera.

Uso:
  imagen.py "prompt" ["otro prompt"...] [--formato 3:4] [--motor space]
            [--modelo z-image|qwen] [--semilla 7] [--salida DIR] [--nombre foto]
Escribe los prompts en inglés y detallados (cámara, luz, textura): rinden más.
"""

import argparse
import os
import shutil
import sys
import time
from pathlib import Path

CACHE = Path(os.environ.get("NAVAJA_CACHE", Path.home() / ".cache" / "navaja"))
MODELOS = CACHE / "modelos"

# En CPU el tiempo crece con los píxeles (4 núcleos: 576x768 tarda ~20 min; 768x1024 pasó de 28):
# lado mayor 768. En la GPU del Space, las resoluciones grandes.
LOCAL = {"1:1": (768, 768), "3:4": (576, 768), "4:3": (768, 576), "9:16": (432, 768),
         "16:9": (768, 432), "2:3": (512, 768), "3:2": (768, 512)}
ZIMAGE = {"1:1": "1024x1024 ( 1:1 )", "3:4": "864x1152 ( 3:4 )", "4:3": "1152x864 ( 4:3 )",
          "9:16": "720x1280 ( 9:16 )", "16:9": "1280x720 ( 16:9 )", "2:3": "832x1248 ( 2:3 )",
          "3:2": "1248x832 ( 3:2 )"}


class SinCuota(Exception):
    pass


def ruta_imagen(resultado) -> str:
    if isinstance(resultado, str):
        return resultado
    if isinstance(resultado, dict):
        imagen = resultado.get("image", resultado)
        return imagen if isinstance(imagen, str) else imagen.get("path")
    return ruta_imagen(resultado[0])


def space(prompts: list[str], formato: str, modelo: str, semilla: int, destino: list[Path]) -> None:
    from gradio_client import Client
    from gradio_client.exceptions import AppError

    token = os.environ.get("HF_TOKEN")
    if not token:
        raise SinCuota("no hay HF_TOKEN")
    if modelo == "qwen":
        cliente = Client("Qwen/Qwen-Image-2512", token=token, verbose=False)
    else:
        cliente = Client("Tongyi-MAI/Z-Image-Turbo", token=token, verbose=False)
    for i, (prompt, salida) in enumerate(zip(prompts, destino)):
        t = time.time()
        try:
            if modelo == "qwen":
                r = cliente.predict(prompt=prompt, seed=semilla + i, randomize_seed=False, aspect_ratio=formato,
                                    guidance_scale=4.0, num_inference_steps=50, prompt_enhance=True,
                                    api_name="/infer")
            else:
                r = cliente.predict(prompt=prompt, resolution=ZIMAGE[formato], seed=semilla + i, steps=8,
                                    shift=3.0, random_seed=False, gallery_images=[], api_name="/generate")
        except AppError as error:
            if "quota" in str(error).lower():
                raise SinCuota(str(error).split(".")[0]) from error
            raise
        shutil.copy(ruta_imagen(r[0]), salida)
        print(f"{salida} ({modelo} en GPU de HF, {time.time() - t:.0f} s)", flush=True)


def progreso(paso: int, pasos: int, segundos: float) -> None:
    print(f"  paso {paso}/{pasos} ({segundos:.0f} s)", flush=True)


def local(prompts: list[str], formato: str, semilla: int, destino: list[Path]) -> None:
    from stable_diffusion_cpp import StableDiffusion

    faltan = [n for n in ("z_image_turbo-Q4_K.gguf", "Qwen3-4B-Instruct-2507-Q4_K_M.gguf", "ae.safetensors")
              if not (MODELOS / n).exists()]
    if faltan:
        sys.exit(f"Falta el modelo local ({', '.join(faltan)}): ejecuta /instalar imagen")
    ancho, alto = LOCAL[formato]
    sd = StableDiffusion(
        diffusion_model_path=str(MODELOS / "z_image_turbo-Q4_K.gguf"),
        llm_path=str(MODELOS / "Qwen3-4B-Instruct-2507-Q4_K_M.gguf"),
        vae_path=str(MODELOS / "ae.safetensors"),
        n_threads=os.cpu_count() or 4,
        diffusion_flash_attn=True,
        verbose=False,
    )
    for i, (prompt, salida) in enumerate(zip(prompts, destino)):
        t = time.time()
        imagen = sd.generate_image(prompt=prompt, width=ancho, height=alto, cfg_scale=1.0, sample_steps=8,
                                   seed=semilla + i, progress_callback=progreso)[0]
        imagen.save(salida)
        print(f"{salida} (Z-Image-Turbo local, {(time.time() - t) / 60:.1f} min)", flush=True)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("prompts", nargs="+")
    p.add_argument("--formato", default="1:1", choices=sorted(LOCAL))
    p.add_argument("--motor", default="space", choices=["space", "local"])
    p.add_argument("--modelo", default="z-image", choices=["z-image", "qwen"],
                   help="solo motor space: qwen es el mejor abierto, más lento y gasta más cuota")
    p.add_argument("--semilla", type=int, default=int(time.time()) % 100000)
    p.add_argument("--salida", default=str(Path.home() / "navaja-salida" / "imagenes"))
    p.add_argument("--nombre", default="imagen")
    a = p.parse_args()

    carpeta = Path(a.salida)
    carpeta.mkdir(parents=True, exist_ok=True)
    marca = time.strftime("%H%M%S")
    destino = [carpeta / f"{a.nombre}-{marca}-{i + 1}.png" for i in range(len(a.prompts))]

    if a.motor == "space":
        try:
            space(a.prompts, a.formato, a.modelo, a.semilla, destino)
        except SinCuota as motivo:
            hechas = [str(d) for d in destino if d.exists()]
            sys.exit(
                f"GPU gratis no disponible: {motivo}.\n"
                + (f"Hechas: {', '.join(hechas)}\n" if hechas else "")
                + "Opciones: guardar un HF_TOKEN gratuito en los secretos del entorno, esperar a que se "
                "renueve la cuota, o --motor local (unos 20 min por imagen en CPU)."
            )
        return 0
    local(a.prompts, a.formato, a.semilla, destino)
    return 0


if __name__ == "__main__":
    sys.exit(main())
