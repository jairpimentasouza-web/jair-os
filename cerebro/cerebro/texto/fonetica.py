"""Chave fonética para o português brasileiro (inspirada no Metaphone-PTBR / BuscaBR).

O objetivo é que palavras que *soam* parecido gerem chaves parecidas, mesmo
quando o reconhecimento de voz erra a grafia:

    google chrome  → gugu krumi     gugou cromi → gugu krumi
    classroom      → klasrum        class rum   → klasrum
    jarvis         → jarvis         jarbas      → jarbas  (distância 2)

A chave é comparada com distância de edição (RapidFuzz), não por igualdade.
"""
from __future__ import annotations

import re
from functools import lru_cache

from .basico import dobrar

# Anglicismos frequentes em comandos (pronúncia brasileira).
_INGLES = [
    (r"oo", "u"), (r"ee", "i"), (r"ea", "i"), (r"ck", "k"), (r"tion$", "xan"),
    (r"gle$", "gou"), (r"ble$", "bou"), (r"ple$", "pou"), (r"tle$", "tou"),
    (r"^wh", "u"), (r"^w", "u"), (r"y$", "i"), (r"ph", "f"), (r"th", "t"),
    (r"sh", "x"), (r"oa", "o"), (r"chr", "kr"), (r"ow", "au"), (r"^gm", "jim"),
]


@lru_cache(maxsize=50_000)
def chave_palavra(palavra: str) -> str:
    p = palavra.lower().replace("ç", "s")
    p = dobrar(p)
    p = re.sub(r"[^a-z0-9]", "", p)
    if not p:
        return ""
    if p.isdigit():
        return p
    for padrao, troca in _INGLES:
        p = re.sub(padrao, troca, p)
    regras = [
        (r"ch", "x"), (r"lh", "li"), (r"nh", "ni"), (r"rr", "r"), (r"ss", "s"),
        (r"sc(?=[ei])", "s"), (r"xc(?=[ei])", "s"), (r"qu(?=[ei])", "k"), (r"gu(?=[ei])", "g"),
        (r"q", "k"), (r"c(?=[ei])", "s"), (r"c", "k"), (r"g(?=[ei])", "j"), (r"z", "s"),
        (r"w", "v"), (r"y", "i"), (r"(?<=[aeiou])s(?=[aeiou])", "s"), (r"h", ""),
        (r"l(?=[^aeiou]|$)", "u"),  # Brasil → brasiu
        (r"ao$", "aN"), (r"am$", "aN"), (r"(?<=[aeiou])[mn](?=[^aeiou]|$)", "N"),
        (r"e$", "i"), (r"o$", "u"), (r"es$", "is"), (r"os$", "us"),
        (r"(?<=[aeiou])r$", ""),  # abrir → abri (fala)
    ]
    for padrao, troca in regras:
        p = re.sub(padrao, troca, p)
    p = re.sub(r"(.)\1+", r"\1", p)  # letras repetidas
    return p


def chave(texto: str) -> str:
    """Chave fonética de uma frase (palavra a palavra, separada por espaço)."""
    return " ".join(k for k in (chave_palavra(w) for w in re.findall(r"[a-z0-9çÀ-ÿ]+", str(texto or "").lower())) if k)


def chave_compacta(texto: str) -> str:
    """Chave sem espaços: une "class rum" e "classroom", "you tube" e "youtube"."""
    return chave(texto).replace(" ", "")
