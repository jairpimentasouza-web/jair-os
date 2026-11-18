"""Conjugador de verbos para comandos falados em PT-BR.

Dado o infinitivo, gera as formas que aparecem em pedidos reais:
imperativo (abre/abra), infinitivo (abrir) e infinitivo falado sem "r" (abri),
presente (abro, abrimos), plural (abram), gerúndio (abrindo), passado (abri,
abriu), condicional (abriria) e futuro (abrirá). Trata as mudanças
ortográficas de -car/-gar/-çar/-ger/-gir/-guir/-cer.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Iterable, Set

from .basico import dobrar


def _subjuntivo_e_1sg(radical: str, terminacao: str):
    """Radicais ajustados para subjuntivo (abra/fale) e 1ª pessoa (abro/falo)."""
    sub = radical
    eu = radical
    if terminacao == "ar":
        if radical.endswith("c"):
            sub = radical[:-1] + "qu"
        elif radical.endswith("g"):
            sub = radical[:-1] + "gu"
        elif radical.endswith("ç"):
            sub = radical[:-1] + "c"
    else:
        if radical.endswith("g"):
            sub = eu = radical[:-1] + "j"
        elif radical.endswith("gu"):
            sub = eu = radical[:-2] + "g"
        elif radical.endswith("c"):
            sub = eu = radical[:-1] + "ç"
    return sub, eu


@lru_cache(maxsize=4096)
def _formas_regulares(infinitivo: str) -> frozenset:
    inf = infinitivo.strip().lower()
    if inf in ("por", "pôr"):
        return frozenset({"por", "poe", "ponha", "ponho", "pondo", "pus", "pos", "poria", "pora", "ponham", "pomos"})
    if len(inf) < 3 or inf[-2:] not in ("ar", "er", "ir"):
        return frozenset({dobrar(inf)})
    radical, term = inf[:-2], inf[-2:]
    vogal = term[0]
    sub, eu = _subjuntivo_e_1sg(radical, term)
    f = {inf, radical + vogal}  # abrir, abri (infinitivo falado)
    if term in ("ir", "er") and radical.endswith("z"):
        f.add(radical)  # reproduz, traduz, produz, conduz
    if term == "ar":
        passado_1sg = sub + "ei"
        f |= {radical + "a", sub + "e", eu + "o", radical + "amos", radical + "am", sub + "em",
              radical + "ando", passado_1sg, radical + "ou", inf + "ia", inf + "a", inf + "ei",
              sub + "emos", radical + "ado", radical + "ada", radical + "asse", radical + "assem"}
    else:
        f |= {radical + "e", sub + "a", eu + "o", radical + vogal + "mos", radical + "em", sub + "am",
              radical + vogal + "ndo", radical + "i", radical + ("eu" if term == "er" else "iu"),
              inf + "ia", inf + "a", inf + "ei", sub + "amos", radical + "ido", radical + "ida",
              radical + vogal + "sse", radical + vogal + "ssem"}
    return frozenset(dobrar(x) for x in f)


def formas(infinitivo: str, extras: Iterable[str] = ()) -> Set[str]:
    """Formas dobradas (sem acento) de um verbo, somadas às formas irregulares dadas."""
    out = set(_formas_regulares(infinitivo))
    out.update(dobrar(x).strip() for x in extras if str(x).strip())
    return {x for x in out if x}
