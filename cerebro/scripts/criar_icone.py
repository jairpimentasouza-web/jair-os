#!/usr/bin/env python3
"""Gera o ícone do Jarvis (.ico) para o atalho da área de trabalho."""
import sys

from PIL import Image, ImageDraw, ImageFont


def icone(destino: str) -> None:
    n = 256
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for i in range(n // 2, 0, -1):  # disco com degradê azul → ciano
        t = i / (n / 2)
        cor = (int(20 + 30 * t), int(90 + 110 * (1 - t)), int(200 + 50 * (1 - t)), 255)
        d.ellipse([n / 2 - i, n / 2 - i, n / 2 + i, n / 2 + i], fill=cor)
    d.ellipse([18, 18, n - 18, n - 18], outline=(255, 255, 255, 230), width=8)
    fonte = None
    for nome in ("segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"):
        try:
            fonte = ImageFont.truetype(nome, 150)
            break
        except OSError:
            continue
    fonte = fonte or ImageFont.load_default()
    caixa = d.textbbox((0, 0), "J", font=fonte)
    w, h = caixa[2] - caixa[0], caixa[3] - caixa[1]
    d.text(((n - w) / 2 - caixa[0], (n - h) / 2 - caixa[1] - 6), "J", font=fonte, fill=(255, 255, 255, 255))
    img.save(destino, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])


if __name__ == "__main__":
    icone(sys.argv[1] if len(sys.argv) > 1 else "jarvis.ico")
