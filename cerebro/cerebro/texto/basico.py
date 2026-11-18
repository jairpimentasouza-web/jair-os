"""Funções de base para texto em português brasileiro."""
from __future__ import annotations

import re
import unicodedata
from typing import Dict, List

_TOKEN = re.compile(r"[a-z0-9]+(?:[.,:/][0-9]+)*")


def dobrar(texto: object) -> str:
    """Minúsculas, sem acentos e com ``ç`` → ``c``.

    A dobra preserva o comprimento caractere a caractere para letras latinas,
    o que permite reaproveitar posições ao restaurar acentos.
    """
    s = unicodedata.normalize("NFD", str(texto or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower()


def tokens(texto: str) -> List[str]:
    """Tokens alfanuméricos de um texto já dobrado ou não."""
    return _TOKEN.findall(dobrar(texto))


def mapa_acentos(original: str) -> Dict[str, str]:
    """Mapeia palavra dobrada → forma original (com acentos) no texto falado."""
    mapa: Dict[str, str] = {}
    for palavra in re.findall(r"[\wÀ-ÿ]+", str(original or "")):
        chave = dobrar(palavra)
        if chave and chave not in mapa and chave != palavra.lower():
            mapa[chave] = palavra.lower()
    return mapa


def restaurar_acentos(texto_dobrado: str, original: str) -> str:
    """Devolve os acentos a um trecho extraído do texto dobrado.

    Ex.: ``restaurar_acentos("reuniao com a coordenacao", "Reunião com a Coordenação")``
    → ``"reunião com a coordenação"``.
    """
    mapa = mapa_acentos(original)
    if not mapa:
        return texto_dobrado
    return re.sub(r"[a-z0-9]+", lambda m: mapa.get(m.group(0), m.group(0)), texto_dobrado)


def capitalizar(texto: str) -> str:
    return texto[:1].upper() + texto[1:] if texto else texto
