#!/usr/bin/env python3
"""Verifica se os links relativos dos arquivos Markdown e HTML apontam para arquivos existentes."""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PATTERNS = {
    ".md": re.compile(r"\[[^\]]*\]\(([^)\s]+)\)"),
    ".html": re.compile(r"""\shref=["']([^"']+)["']"""),
}
SKIP = ("http://", "https://", "mailto:", "tel:", "#", "javascript:", "data:")

broken = []
for ext, pattern in PATTERNS.items():
    for doc in sorted(ROOT.rglob(f"*{ext}")):
        if ".git" in doc.parts:
            continue
        for lineno, line in enumerate(doc.read_text(encoding="utf-8").splitlines(), 1):
            for target in pattern.findall(line):
                if target.startswith(SKIP):
                    continue
                path = (doc.parent / target.split("#", 1)[0].split("?", 1)[0]).resolve()
                if not path.exists():
                    broken.append(f"{doc.relative_to(ROOT)}:{lineno}: {target}")

if broken:
    print("Links relativos quebrados:")
    print("\n".join(broken))
    sys.exit(1)
print("Todos os links relativos estão válidos.")
