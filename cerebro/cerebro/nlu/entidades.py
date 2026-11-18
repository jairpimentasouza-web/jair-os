"""Reconhecimento de entidades por dicionário (gazetteer) com fuzzy + fonética.

Para cada tipo (app, site, aluno, escola...) mantém aliases dobrados e chaves
fonéticas. Resolve um trecho falado para a entidade mais provável, tolerando
erros de transcrição ("gugou cromi" → Google Chrome, "class rum" → Classroom).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Tuple

from rapidfuzz import fuzz, process

from ..texto.basico import dobrar
from ..texto.fonetica import chave_compacta

_ARTIGOS_INICIO = re.compile(
    r"^(?:(?:o|a|os|as|um|uma|meu|minha|meus|minhas|seu|sua|no|na|nos|nas|do|da|dos|das|"
    r"ao|pelo|pela|pro|para o|para a|para|em|de|app|aplicativo|programa|site|pagina|pasta)\s+)+"
)


_ARTIGOS_ALIAS = re.compile(r"^(?:(?:o|a|os|as|um|uma)\s+)+")


def limpar_trecho(texto: str) -> str:
    return _ARTIGOS_INICIO.sub("", dobrar(texto).strip()).strip(" .,;:!?")


def limpar_alias(texto: str) -> str:
    return _ARTIGOS_ALIAS.sub("", dobrar(texto).strip()).strip(" .,;:!?")


@dataclass
class Entidade:
    id: str
    tipo: str
    nome: str
    aliases: List[str] = field(default_factory=list)
    dados: Dict[str, object] = field(default_factory=dict)

    def valor(self, campo: Optional[str] = None):
        if not campo or campo == "id":
            return self.id
        if campo == "nome":
            return self.nome
        return self.dados.get(campo)


@dataclass
class Achado:
    entidade: Entidade
    score: float
    alias: str
    inicio: int = -1  # índice de token
    fim: int = -1

    def __repr__(self) -> str:  # pragma: no cover - depuração
        return "Achado(%s:%s %.2f '%s')" % (self.entidade.tipo, self.entidade.id, self.score, self.alias)


class Gazetteer:
    """Dicionário de entidades de um tipo, com busca tolerante."""

    def __init__(self, tipo: str, entidades: Iterable[Entidade], limiar: float = 0.84):
        self.tipo = tipo
        self.limiar = limiar
        self.entidades: Dict[str, Entidade] = {}
        self._alias: Dict[str, str] = {}
        self._compacto: Dict[str, str] = {}
        self._fonetico: Dict[str, str] = {}
        self._lista_alias: List[str] = []
        self._lista_fon: List[str] = []
        for e in entidades:
            self.adicionar(e)

    def adicionar(self, e: Entidade) -> None:
        self.entidades[e.id] = e
        todos = set(e.aliases) | {e.nome, e.id.replace("_", " ")}
        for a in todos:
            d = limpar_alias(a)
            if not d:
                continue
            self._alias.setdefault(d, e.id)
            self._compacto.setdefault(d.replace(" ", ""), e.id)
            k = chave_compacta(d)
            if len(k) >= 3:
                self._fonetico.setdefault(k, e.id)
        self._lista_alias = list(self._alias)
        self._lista_fon = list(self._fonetico)

    def __len__(self) -> int:
        return len(self.entidades)

    def __contains__(self, item: str) -> bool:
        return item in self.entidades

    def get(self, id_: str) -> Optional[Entidade]:
        return self.entidades.get(id_)

    def aliases(self) -> List[str]:
        return list(self._alias)

    def resolver(self, texto: str, limiar: Optional[float] = None) -> Optional[Achado]:
        """Resolve um trecho inteiro (ex.: o que foi capturado em "abre {app}")."""
        limiar = self.limiar if limiar is None else limiar
        t = limpar_trecho(texto)
        if not t:
            return None
        if t in self._alias:
            return Achado(self.entidades[self._alias[t]], 1.0, t)
        c = t.replace(" ", "")
        if c in self._compacto:
            return Achado(self.entidades[self._compacto[c]], 0.98, t)
        k = chave_compacta(t)
        if len(k) >= 3 and k in self._fonetico:
            return Achado(self.entidades[self._fonetico[k]], 0.95, t)
        if len(c) < 4 or not self._lista_alias:
            return None
        melhor: Optional[Tuple[str, float]] = None
        r = process.extractOne(t, self._lista_alias, scorer=fuzz.ratio, score_cutoff=limiar * 100 - 8)
        if r:
            melhor = (self._alias[r[0]], r[1] / 100.0)
        r2 = process.extractOne(t, self._lista_alias, scorer=fuzz.token_sort_ratio, score_cutoff=limiar * 100 - 8)
        if r2 and (not melhor or r2[1] / 100.0 > melhor[1]):
            melhor = (self._alias[r2[0]], r2[1] / 100.0)
        if len(k) >= 4:
            r3 = process.extractOne(k, self._lista_fon, scorer=fuzz.ratio, score_cutoff=limiar * 100 - 8)
            if r3:
                s = 0.97 * r3[1] / 100.0
                if not melhor or s > melhor[1]:
                    melhor = (self._fonetico[r3[0]], s)
        if melhor and melhor[1] >= limiar:
            return Achado(self.entidades[melhor[0]], round(melhor[1], 4), t)
        return None

    def buscar_em(self, texto: str, max_n: int = 4, limiar: Optional[float] = None) -> List[Achado]:
        """Encontra menções dentro de uma frase maior (janelas de 1 a ``max_n`` palavras)."""
        limiar = max(self.limiar, 0.88) if limiar is None else limiar
        toks = dobrar(texto).split()
        candidatos: List[Achado] = []
        for n in range(min(max_n, len(toks)), 0, -1):
            for i in range(0, len(toks) - n + 1):
                trecho = " ".join(toks[i:i + n])
                if n == 1 and len(trecho) < 3 and trecho not in self._alias:
                    continue
                a = self.resolver(trecho, limiar=limiar)
                if a:
                    # trechos curtos exigem quase igualdade (evita "ver" → "vercel")
                    if len(trecho.replace(" ", "")) <= 4 and a.score < 0.95:
                        continue
                    a.inicio, a.fim = i, i + n
                    candidatos.append(a)
        candidatos.sort(key=lambda a: (-a.score, -(a.fim - a.inicio)))
        escolhidos: List[Achado] = []
        ocupado = set()
        for a in candidatos:
            faixa = set(range(a.inicio, a.fim))
            if faixa & ocupado:
                continue
            escolhidos.append(a)
            ocupado |= faixa
        escolhidos.sort(key=lambda a: a.inicio)
        return escolhidos
