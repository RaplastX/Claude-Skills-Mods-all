"""Convierte PDF, Word, PowerPoint, Excel, HTML o una URL a Markdown compacto.

Uso: doc2md.py ARCHIVO_O_URL [--salida doc.md] [--paginas 1-5] [--max 6000]
Imprime solo los primeros --max caracteres (el resto queda en --salida), para
que un documento largo no entre entero en la conversación. PDFs escaneados:
usa antes la skill ocr sobre sus páginas.
"""

import argparse
import sys
from pathlib import Path


def pdf_a_texto(ruta: str, paginas: str | None) -> str:
    import pymupdf

    doc = pymupdf.open(ruta)
    ini, fin = 1, doc.page_count
    if paginas:
        a, _, b = paginas.partition("-")
        ini, fin = int(a), min(int(b or a), doc.page_count)
    partes = []
    for n in range(ini - 1, fin):
        pagina = doc[n]
        texto = pagina.get_text("text").strip()
        tablas = [t.to_markdown() for t in pagina.find_tables().tables] if hasattr(pagina, "find_tables") else []
        partes.append(f"## Página {n + 1}\n{texto}" + ("\n\n" + "\n\n".join(tablas) if tablas else ""))
    return "\n\n".join(partes)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("fuente")
    p.add_argument("--salida", default=str(Path.home() / "navaja-salida" / "doc.md"))
    p.add_argument("--paginas")
    p.add_argument("--max", type=int, default=6000)
    a = p.parse_args()

    if a.fuente.lower().endswith(".pdf") and not a.fuente.startswith("http"):
        texto = pdf_a_texto(a.fuente, a.paginas)
    else:
        from markitdown import MarkItDown

        texto = MarkItDown().convert(a.fuente).text_content
    texto = "\n".join(l.rstrip() for l in texto.splitlines())
    while "\n\n\n" in texto:
        texto = texto.replace("\n\n\n", "\n\n")

    salida = Path(a.salida)
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(texto)
    print(f"{len(texto)} caracteres → {salida}")
    if not texto.strip():
        print("(sin texto: parece un documento escaneado; usa la skill ocr)")
    print(texto[: a.max] + (f"\n[… recortado: lee el resto del archivo por partes]" if len(texto) > a.max else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
