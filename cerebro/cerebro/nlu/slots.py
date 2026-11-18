"""Resolução de slots: transforma trechos capturados em valores tipados."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from ..texto import tempo as tempo_mod
from ..texto.basico import dobrar, restaurar_acentos
from ..texto.numeros import numeros_em
from .entidades import limpar_trecho
from .modelo import TIPOS_GAZETTEER, SlotDef, Valor

PRONOMES = {"ele", "ela", "eles", "elas", "isso", "isto", "aquilo", "esse", "essa", "este", "esta", "aquele",
            "aquela", "o mesmo", "a mesma", "lo", "la", "de novo", "o anterior", "a anterior", "o ultimo", "a ultima",
            "dele", "dela", "nele", "nela", "o dele", "a dela"}

_BORDAS_INICIO = re.compile(r"^(?:(?:o|a|os|as|um|uma|de|do|da|dos|das|sobre|por|pelo|pela|que|para|no|na|em|com|e|:)\s+)+")
_BORDAS_FIM = re.compile(r"(?:\s+(?:para mim|por favor|agora|ai|no google|na internet|de|do|da|e|para|no|na|com|que|o|a))+$")
_BORDAS_FIM_TEXTO = re.compile(r"(?:\s+(?:para mim|por favor|agora|ai|e|que))+$")
_BORDAS_INICIO_TEXTO = re.compile(r"^(?:(?:que|de|do|da|para|sobre|:|dizendo|falando|e)\s+)+")


_PREPS_TEMPO = {"para", "pra", "no", "na", "de", "da", "do", "em", "a", "o", "as", "ate", "dessa", "desta", "nessa", "nesta", "essa", "esta", "proxima", "proximo"}


class Contexto:
    """Memória curta usada para anáforas ("fecha ele") e continuações ("e amanhã?")."""

    def __init__(self) -> None:
        self.entidades: Dict[str, Valor] = {}
        self.ultima_intencao: Optional[str] = None
        self.ultimos_slots: Dict[str, Valor] = {}

    def lembrar(self, intencao: str, slots: Dict[str, Valor]) -> None:
        self.ultima_intencao = intencao
        self.ultimos_slots = dict(slots)
        for v in slots.values():
            if v.entidade is not None:
                self.entidades[v.tipo] = v


def limpar_livre(texto: str, tipo: str) -> str:
    s = " ".join(texto.split())
    if tipo == "consulta":
        for _ in range(3):
            s2 = _BORDAS_FIM.sub("", _BORDAS_INICIO.sub("", s)).strip()
            if s2 == s:
                break
            s = s2
    else:
        s = _BORDAS_FIM_TEXTO.sub("", _BORDAS_INICIO_TEXTO.sub("", s)).strip()
    return s.strip(" ,.:;")


def _gaz_valor(lexico, tipo: str, trecho: str, contexto: Optional[Contexto]) -> Optional[Valor]:
    t = limpar_trecho(trecho)
    if contexto is not None and (t in PRONOMES or dobrar(trecho).strip() in PRONOMES):
        anterior = contexto.entidades.get(tipo)
        if anterior is not None:
            return Valor(tipo, anterior.valor, anterior.texto, anterior.entidade, 0.93, {"anafora": True})
        return None
    achado = lexico.gaz(tipo).resolver(trecho)
    if not achado:
        return None
    e = achado.entidade
    return Valor(tipo, e.id, trecho, e, achado.score)


def resolver(defn: SlotDef, capturado: Optional[str], fala, lexico, contexto: Optional[Contexto] = None,
             agora: Optional[datetime] = None) -> Tuple[Optional[Valor], bool]:
    """Resolve um slot. Retorna (valor, valido). ``valido=False`` invalida o padrão."""
    cap = (capturado or "").strip()
    tipo = defn.tipo
    texto = fala.texto

    if tipo in TIPOS_GAZETTEER:
        if not cap:
            return None, True
        v = _gaz_valor(lexico, tipo, cap, contexto)
        if v is not None:
            return v, True
        if defn.livre_se_falhar:
            livre = limpar_livre(cap, "consulta")
            return Valor(tipo, restaurar_acentos(livre, fala.original), livre, None, 0.7), bool(livre)
        return None, False

    if tipo == "tempo":
        if cap and defn.fonte != "frase":
            t = tempo_mod.extrair(cap, agora)
            return (Valor("tempo", t.iso(), cap, None, 1.0, {"tempo": t, "desc": t.descrever(agora), "iso": t.iso()}), True) if t else (None, False)
        if cap:
            tc = tempo_mod.extrair(cap, agora)
            if tc is None:
                return None, False
            sobra = [w for w in tempo_mod.remover(cap, tc).split() if w not in _PREPS_TEMPO]
            if sobra:
                return None, False
        t = tempo_mod.extrair(texto, agora)
        if t is None:
            return None, True
        return Valor("tempo", t.iso(), t.texto, None, 1.0, {"tempo": t, "desc": t.descrever(agora), "iso": t.iso()}), True

    if tipo in ("numero", "nivel"):
        fonte = cap if cap else (texto if defn.fonte == "frase" else "")
        nums = numeros_em(fonte)
        if not nums:
            return (None, not cap)
        n = nums[0]
        if tipo == "nivel":
            n = max(0.0, min(100.0, n))
            return Valor("nivel", int(round(n)), cap, None, 1.0), True
        return Valor("numero", int(n) if float(n).is_integer() else n, cap, None, 1.0), True

    if tipo == "numeros":
        fonte = texto if defn.fonte == "frase" or not cap else cap
        nums = numeros_em(fonte)
        if not nums:
            return None, not cap
        return Valor("numeros", nums, fonte, None, 1.0), True

    if tipo == "url":
        if fala.urls:
            return Valor("url", fala.urls[0], fala.urls[0], None, 1.0), True
        return None, False

    # texto / consulta (livres)
    if not cap and defn.fonte_alternativa == "frase":
        cap = texto
    if not cap:
        return None, True
    livre = limpar_livre(cap, "consulta" if tipo == "consulta" else "texto")
    if not livre:
        return None, False
    return Valor(tipo, restaurar_acentos(livre, fala.original), livre, None, 1.0), True


def remover_tempo_de(valor: Valor, fala, agora: Optional[datetime] = None) -> Valor:
    """Tira "amanhã às 3" de dentro de um texto livre (título de tarefa, lembrete...)."""
    t = tempo_mod.extrair(valor.texto, agora)
    if not t:
        return valor
    limpo = limpar_livre(tempo_mod.remover(valor.texto, t), valor.tipo)
    if not limpo:
        return valor
    return Valor(valor.tipo, restaurar_acentos(limpo, fala.original), limpo, None, valor.score)


def residual(texto: str, remover_frases: List[str], spans: List[Tuple[int, int]]) -> str:
    """Texto que sobra depois de tirar verbos, palavras-chave e entidades (por índice de token)."""
    toks = texto.split()
    tira = set()
    for a, b in spans:
        tira.update(range(a, b))
    frases = sorted({f for f in remover_frases if f}, key=lambda f: -len(f.split()))
    i = 0
    while i < len(toks):
        if i in tira:
            i += 1
            continue
        casou = False
        for f in frases:
            fs = f.split()
            if toks[i:i + len(fs)] == fs:
                tira.update(range(i, i + len(fs)))
                i += len(fs)
                casou = True
                break
        if not casou:
            i += 1
    return " ".join(t for j, t in enumerate(toks) if j not in tira)
