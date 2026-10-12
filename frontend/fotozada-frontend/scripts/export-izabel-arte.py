#!/usr/bin/env python3
"""Reexporta a arte (fundo + sobreposição) dos 3 layouts da Izabel a partir das
originais em alta resolução, com UMA única redução Lanczos até 1,5x o tamanho
da folha de impressão (10x15 @ 300 dpi) e WebP de qualidade alta.

Uso:  python3 scripts/export-izabel-arte.py [pasta-das-originais]
Requer Pillow. As originais esperadas (na pasta, padrão ~/Downloads):
  background.png / sobreposicao.png                       (tirinha, 1:3)
  background-vertical.png / sobreposicao-vertical.png     (10x15 vertical)
  background-horizontal.png / sobreposicao-horizontal.png (10x15 horizontal)
O código desenha a arte esticada no tamanho da folha, então a resolução do
arquivo pode mudar à vontade desde que a proporção seja mantida.
"""
import os
import sys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Downloads")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "izabel")
K = 1.5  # fator sobre a folha (1200x1800 / 1800x1200 / tira 600x1800)

JOBS = [
    ("Tirinha", "fundo", "background.png", (600, 1800)),
    ("Tirinha", "sobreposicao", "sobreposicao.png", (600, 1800)),
    ("Vertical", "fundo", "background-vertical.png", (1200, 1800)),
    ("Vertical", "sobreposicao", "sobreposicao-vertical.png", (1200, 1800)),
    ("Horizontal", "fundo", "background-horizontal.png", (1800, 1200)),
    ("Horizontal", "sobreposicao", "sobreposicao-horizontal.png", (1800, 1200)),
]

for layout, kind, src, (w, h) in JOBS:
    im = Image.open(os.path.join(SRC, src)).resize((round(w * K), round(h * K)), Image.LANCZOS)
    dst = os.path.join(OUT, layout, f"{kind}.webp")
    if kind == "fundo":
        im.convert("RGB").save(dst, "WEBP", quality=92, method=6)
    else:
        im.convert("RGBA").save(dst, "WEBP", quality=92, alpha_quality=100, method=6)
    print(f"{layout}/{kind}.webp {im.size} {os.path.getsize(dst) // 1024} KB")
