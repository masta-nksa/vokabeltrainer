# Rendert ein PDF (oder ein Foto) seitenweise in PNGs, die der
# Erkennungsschritt anschaut.
#
# Aufruf:
#   python rasterize.py <eingabe.pdf|foto.jpg> <ausgabeordner> [--pages 2-4] [--dpi 200]
#
# Ergebnis: <ausgabeordner>/page-01.png, page-02.png, ...
# Ein Foto wird unverändert als page-01.png abgelegt (bzw. nach PNG gewandelt).
#
# Einzige Abhängigkeit für PDFs ist PyMuPDF. Fehlt es, sagt das Skript, wie
# man es nachrüstet.

import sys
import os
import shutil
import argparse


def parse_pages(spec, count):
    if not spec:
        return list(range(count))
    out = []
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            a, b = part.split("-", 1)
            out.extend(range(int(a) - 1, int(b)))
        elif part:
            out.append(int(part) - 1)
    return [p for p in out if 0 <= p < count]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("outdir")
    ap.add_argument("--pages", default="", help="z.B. 2-4 oder 1,3,5 (1-basiert)")
    ap.add_argument("--dpi", type=int, default=200)
    args = ap.parse_args()

    if not os.path.isfile(args.input):
        sys.exit(f"Eingabe nicht gefunden: {args.input}")

    os.makedirs(args.outdir, exist_ok=True)
    for old in os.listdir(args.outdir):
        if old.startswith("page-") and old.endswith(".png"):
            os.remove(os.path.join(args.outdir, old))

    ext = os.path.splitext(args.input)[1].lower()

    if ext in (".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"):
        target = os.path.join(args.outdir, "page-01.png")
        if ext == ".png":
            shutil.copyfile(args.input, target)
        else:
            try:
                from PIL import Image
            except ImportError:
                sys.exit("Fotos brauchen Pillow: python -m pip install pillow")
            Image.open(args.input).convert("RGB").save(target)
        print(f"1 Seite -> {target}")
        return

    if ext != ".pdf":
        sys.exit(f"Unbekanntes Format: {ext}")

    try:
        import pymupdf
    except ImportError:
        try:
            import fitz as pymupdf  # ältere Paketnamen
        except ImportError:
            sys.exit("PDFs brauchen PyMuPDF: python -m pip install pymupdf")

    doc = pymupdf.open(args.input)
    wanted = parse_pages(args.pages, doc.page_count)
    zoom = args.dpi / 72

    n = 0
    for i in wanted:
        page = doc[i]
        pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
        out = os.path.join(args.outdir, f"page-{i + 1:02d}.png")
        pix.save(out)
        n += 1
        print(f"Seite {i + 1} -> {out}  ({pix.width}x{pix.height})")

    print(f"{n} Seiten gerendert nach {args.outdir}")


if __name__ == "__main__":
    main()
