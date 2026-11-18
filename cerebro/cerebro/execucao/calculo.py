"""Contas faladas com aritmética decimal exata (nada de eval)."""
from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation, getcontext
from typing import List, Optional, Sequence, Tuple

getcontext().prec = 28

_TROCAS = [
    (r"\braiz quadrada de\b|\braiz de\b|\braiz quadrada\b", " R "),
    (r"\b(?:por ?cento|%)\s+de\b", " P "),
    (r"\b(?:por ?cento|%)", " /100 "),
    (r"\bao quadrado\b", " ^ 2 "),
    (r"\bao cubo\b", " ^ 3 "),
    (r"\belevado (?:a|ao|na)(?: potencia)?\b|\belevado\b|\bna potencia\b", " ^ "),
    (r"\bmultiplicado por\b|\bvezes\b|\bx\b|\*", " * "),
    (r"\bdividido por\b|\bdividido\b|\bsobre\b|/(?!100)", " / "),
    (r"\bmais\b|\+", " + "),
    (r"\bmenos\b", " - "),
    (r"\babre parenteses\b", " ( "),
    (r"\bfecha parenteses\b", " ) "),
]
_PREC = {"+": 1, "-": 1, "*": 2, "/": 2, "P": 2, "^": 3, "R": 4, "~": 4}
_DIREITA = {"^", "R", "~"}


def _tokens(expr: str) -> List[str]:
    s = " " + expr.lower() + " "
    for padrao, troca in _TROCAS:
        s = re.sub(padrao, troca, s)
    s = s.replace("/100", " / 100 ")
    toks = re.findall(r"\d+(?:\.\d+)?|[-+*/^()PR]", s)
    out: List[str] = []
    for t in toks:
        if t == "-" and (not out or out[-1] in _PREC or out[-1] == "("):
            out.append("~")  # menos unário
        else:
            out.append(t)
    return out


def avaliar(expr: str) -> Optional[Decimal]:
    toks = _tokens(expr)
    if not toks or not any(re.match(r"\d", t) for t in toks):
        return None
    saida: List[str] = []
    pilha: List[str] = []
    for t in toks:
        if re.match(r"\d", t):
            saida.append(t)
        elif t in _PREC:
            while pilha and pilha[-1] in _PREC and (
                    _PREC[pilha[-1]] > _PREC[t] or (_PREC[pilha[-1]] == _PREC[t] and t not in _DIREITA)):
                saida.append(pilha.pop())
            pilha.append(t)
        elif t == "(":
            pilha.append(t)
        elif t == ")":
            while pilha and pilha[-1] != "(":
                saida.append(pilha.pop())
            if not pilha:
                return None
            pilha.pop()
    while pilha:
        op = pilha.pop()
        if op == "(":
            return None
        saida.append(op)
    valores: List[Decimal] = []
    try:
        for t in saida:
            if re.match(r"\d", t):
                valores.append(Decimal(t))
            elif t in ("R", "~"):
                a = valores.pop()
                valores.append(a.sqrt() if t == "R" else -a)
            else:
                b, a = valores.pop(), valores.pop()
                if t == "+":
                    valores.append(a + b)
                elif t == "-":
                    valores.append(a - b)
                elif t == "*":
                    valores.append(a * b)
                elif t == "/":
                    valores.append(a / b)
                elif t == "P":
                    valores.append(a / Decimal(100) * b)
                elif t == "^":
                    if abs(b) > 1000:
                        return None
                    valores.append(a ** b if b == b.to_integral_value() else Decimal(float(a) ** float(b)))
    except (IndexError, InvalidOperation, ZeroDivisionError, OverflowError):
        return None
    return valores[0] if len(valores) == 1 else None


def formatar(d: Decimal, casas: int = 4) -> str:
    q = d.quantize(Decimal(1)) if d == d.to_integral_value() else round(d, casas)
    s = format(q.normalize() if q != q.to_integral_value() else q, "f")
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    return s.replace(".", ",")


def media(valores: Sequence[float], pesos: Optional[Sequence[float]] = None) -> Decimal:
    vs = [Decimal(str(v)) for v in valores]
    if pesos:
        ps = [Decimal(str(p)) for p in pesos]
        return sum(v * p for v, p in zip(vs, ps)) / sum(ps)
    return sum(vs) / Decimal(len(vs))


def nota_necessaria(texto: str, numeros: Sequence[float]) -> Optional[Tuple[Decimal, Decimal, List[Decimal], int]]:
    """Interpreta "para ficar com média 6 se tirei 4 e 5" → (necessária, alvo, notas, restantes)."""
    m = re.search(r"(?:media|com|para|ficar com|fechar com|passar com|chegar a|chegar em|atingir|ter)\s+(\d+(?:\.\d+)?)", texto)
    if not m:
        return None
    alvo = Decimal(m.group(1))
    resto = texto[:m.start(1)] + " " + texto[m.end(1):]
    restantes = 1
    r = re.search(r"(?:faltam|falta|restam|mais)\s+(\d+)\s+(?:provas?|notas?|avaliacoes?|testes?)", resto)
    if r:
        restantes = max(1, int(r.group(1)))
        resto = resto[:r.start(1)] + resto[r.end(1):]
    notas = [Decimal(x) for x in re.findall(r"(?<![\d.])(\d+(?:\.\d+)?)(?![\d.])", resto)]
    if not notas:
        return None
    total = len(notas) + restantes
    necessaria = (alvo * total - sum(notas)) / Decimal(restantes)
    return necessaria, alvo, notas, restantes
