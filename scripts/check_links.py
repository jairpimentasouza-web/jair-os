#!/usr/bin/env python3
"""Verifica se os links relativos dos arquivos Markdown apontam para arquivos existentes."""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")
SKIP = ("http://", "https://", "mailto:", "#")

broken = []
for md in sorted(ROOT.rglob("*.md")):
    if ".git" in md.parts:
        continue
    for lineno, line in enumerate(md.read_text(encoding="utf-8").splitlines(), 1):
        for target in LINK.findall(line):
            if target.startswith(SKIP):
                continue
            path = (md.parent / target.split("#", 1)[0]).resolve()
            if not path.exists():
                broken.append(f"{md.relative_to(ROOT)}:{lineno}: {target}")

if broken:
    print("Links relativos quebrados:")
    print("\n".join(broken))
    sys.exit(1)
print("Todos os links relativos estão válidos.")
