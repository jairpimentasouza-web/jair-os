"""Mini-linguagem de padrões das habilidades → expressões regulares.

Sintaxe (sobre texto normalizado, sem acentos):

    {v:abrir}          qualquer forma de uma família de verbos (abre, abra, abrir, "abri"...)
    {v:abrir|ir}       união de famílias
    {e:artigos}        qualquer item de um grupo de expressões do léxico
    {art} {prep} {qual}  atalhos para artigos, preposições e interrogativos
    {app}              captura um slot (preguiçosa); o tipo vem da definição do slot
    {nivel:num}        captura um número       {nome:palavra}  captura uma palavra
    {texto:resto}      captura gulosa até o fim
    [ a | b c ]        trecho opcional com alternativas
    ( a | b )          alternativas obrigatórias
    palavra            literal

Exemplo: ``{v:abrir} [{prep}] [{art}] [app|aplicativo] {app}`` aceita
"abre o chrome", "você pode abrir o aplicativo do word", "inicia finder"...
"""
from __future__ import annotations

import random
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Union

MACROS = {
    "art": ["o", "a", "os", "as", "um", "uma", "meu", "minha", "meus", "minhas", "seu", "sua",
            "esse", "essa", "este", "esta", "aquele", "aquela", "o meu", "a minha", "os meus", "as minhas"],
    "prep": ["no", "na", "nos", "nas", "em", "do", "da", "dos", "das", "de", "pelo", "pela", "para o",
             "para a", "para os", "para as", "para", "ao", "aos", "a", "o", "sobre", "com", "dentro do", "dentro da", "la no", "la na"],
    "qual": ["qual", "quais", "qual e", "quais sao", "qual que e", "o que", "que", "o que e que", "como", "como esta",
             "quanto", "quanta", "quantos", "quantas", "quanto que", "quanto tem", "tem", "ha"],
}

_TOKEN = re.compile(r"\{[^}]+\}|\[|\]|\(|\)|\||[^\s\[\]()|{}]+")


@dataclass
class No:
    pass


@dataclass
class Lit(No):
    palavra: str


@dataclass
class Verbo(No):
    familias: List[str]


@dataclass
class Grupo(No):
    nome: str  # grupo de expressões ou macro


@dataclass
class Slot(No):
    nome: str
    modo: str = "lazy"  # lazy | palavra | num | resto


@dataclass
class Seq(No):
    nos: List[No] = field(default_factory=list)


@dataclass
class Alt(No):
    opcoes: List[Seq] = field(default_factory=list)
    opcional: bool = False


class ErroPadrao(ValueError):
    pass


def _analisar(tokens: List[str], i: int, fechamento: Optional[str]) -> Tuple[Union[Seq, Alt], int]:
    opcoes: List[Seq] = [Seq()]
    while i < len(tokens):
        t = tokens[i]
        if t in ("]", ")"):
            if t != fechamento:
                raise ErroPadrao("fechamento inesperado '%s'" % t)
            break
        if t == "|":
            opcoes.append(Seq())
            i += 1
            continue
        if t in ("[", "("):
            sub, i = _analisar(tokens, i + 1, "]" if t == "[" else ")")
            alt = sub if isinstance(sub, Alt) else Alt([sub])
            alt.opcional = t == "["
            opcoes[-1].nos.append(alt)
            i += 1
            continue
        if t.startswith("{"):
            corpo = t[1:-1].strip()
            if corpo.startswith("v:"):
                opcoes[-1].nos.append(Verbo(corpo[2:].split("|")))
            elif corpo.startswith("e:"):
                opcoes[-1].nos.append(Grupo(corpo[2:]))
            elif corpo in MACROS:
                opcoes[-1].nos.append(Grupo(corpo))
            else:
                nome, _, modo = corpo.partition(":")
                opcoes[-1].nos.append(Slot(nome.strip(), (modo or "lazy").strip()))
        else:
            opcoes[-1].nos.append(Lit(t))
        i += 1
    if fechamento and (i >= len(tokens) or tokens[i] != fechamento):
        raise ErroPadrao("faltou '%s'" % fechamento)
    if len(opcoes) == 1:
        return opcoes[0], i
    return Alt(opcoes), i


def analisar(padrao: str) -> Seq:
    tokens = _TOKEN.findall(padrao)
    no, i = _analisar(tokens, 0, None)
    if i < len(tokens):
        raise ErroPadrao("sobrou conteúdo no padrão: %s" % padrao)
    return no if isinstance(no, Seq) else Seq([no])


def _alternativas(frases) -> str:
    itens = sorted({f for f in frases if f}, key=len, reverse=True)
    return "(?:%s)" % "|".join(re.escape(x).replace(r"\ ", r"\s+") for x in itens)


class Compilador:
    """Compila padrões usando as famílias e grupos do léxico."""

    def __init__(self, lexico) -> None:
        self.lexico = lexico
        self._cache: Dict[str, str] = {}

    def _rx_familias(self, familias: List[str]) -> str:
        chave = "v:" + "|".join(familias)
        if chave not in self._cache:
            formas = set()
            for f in familias:
                formas |= self.lexico.familia(f)
            self._cache[chave] = _alternativas(formas)
        return self._cache[chave]

    def _rx_grupo(self, nome: str) -> str:
        chave = "g:" + nome
        if chave not in self._cache:
            itens = MACROS.get(nome) or self.lexico.lista(nome)
            if not itens:
                raise ErroPadrao("grupo desconhecido: %s" % nome)
            self._cache[chave] = _alternativas(itens)
        return self._cache[chave]

    def _emitir(self, no: No, slots: List[str]) -> str:
        if isinstance(no, Lit):
            return re.escape(no.palavra)
        if isinstance(no, Verbo):
            return self._rx_familias(no.familias)
        if isinstance(no, Grupo):
            return self._rx_grupo(no.nome)
        if isinstance(no, Slot):
            grupo = "s%d" % len(slots)
            slots.append(no.nome)
            corpo = {"palavra": r"\S+", "num": r"-?\d+(?:\.\d+)?", "resto": r".+"}.get(no.modo, r".+?")
            return "(?P<%s>%s)" % (grupo, corpo)
        if isinstance(no, Seq):
            return self._emitir_seq(no, slots)
        if isinstance(no, Alt):
            return "(?:%s)" % "|".join(self._emitir_seq(s, slots) for s in no.opcoes)
        raise ErroPadrao("nó desconhecido")  # pragma: no cover

    def _emitir_seq(self, seq: Seq, slots: List[str]) -> str:
        out = ""
        comecou = False
        for no in seq.nos:
            r = self._emitir(no, slots)
            if isinstance(no, Alt) and no.opcional:
                out += r"(?:\s+%s)?" % r if comecou else r"(?:%s\s+)?" % r
            else:
                out += (r"\s+" + r) if comecou else r
                comecou = True
        return out

    def compilar(self, padrao: str) -> Tuple[re.Pattern, List[str]]:
        arvore = analisar(padrao)
        slots: List[str] = []
        corpo = self._emitir_seq(arvore, slots)
        return re.compile(r"^%s$" % corpo), slots

    # ------------------------------------------------------------ geração
    def gerar(self, padrao: str, n: int, rng: random.Random, valores_slot) -> List[str]:
        """Gera ``n`` frases de exemplo a partir do padrão (para o classificador)."""
        arvore = analisar(padrao)
        saida = set()
        tentativas = 0
        while len(saida) < n and tentativas < n * 6:
            tentativas += 1
            frase = " ".join(p for p in self._realizar(arvore, rng, valores_slot) if p)
            saida.add(re.sub(r"\s+", " ", frase).strip())
        return sorted(saida)

    def _realizar(self, no: No, rng: random.Random, valores_slot) -> List[str]:
        if isinstance(no, Lit):
            return [no.palavra]
        if isinstance(no, Verbo):
            formas = sorted(set().union(*(self.lexico.familia(f) for f in no.familias)))
            return [rng.choice(formas)]
        if isinstance(no, Grupo):
            itens = MACROS.get(no.nome) or self.lexico.lista(no.nome)
            return [rng.choice(itens)]
        if isinstance(no, Slot):
            return [valores_slot(no.nome, rng)]
        if isinstance(no, Seq):
            out: List[str] = []
            for filho in no.nos:
                out.extend(self._realizar(filho, rng, valores_slot))
            return out
        if isinstance(no, Alt):
            if no.opcional and rng.random() < 0.5:
                return []
            return self._realizar(rng.choice(no.opcoes), rng, valores_slot)
        return []  # pragma: no cover

    def cobertura(self, padrao: str, tamanho_slot: int = 1) -> int:
        """Quantas frases distintas o padrão aceita (estimativa combinatória)."""
        return self._contar(analisar(padrao), tamanho_slot)

    def _contar(self, no: No, k: int) -> int:
        if isinstance(no, Lit):
            return 1
        if isinstance(no, Verbo):
            return max(1, len(set().union(*(self.lexico.familia(f) for f in no.familias))))
        if isinstance(no, Grupo):
            return max(1, len(MACROS.get(no.nome) or self.lexico.lista(no.nome)))
        if isinstance(no, Slot):
            return k
        if isinstance(no, Seq):
            total = 1
            for filho in no.nos:
                total *= self._contar(filho, k)
            return total
        if isinstance(no, Alt):
            return sum(self._contar(s, k) for s in no.opcoes) + (1 if no.opcional else 0)
        return 1  # pragma: no cover
