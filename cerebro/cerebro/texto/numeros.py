"""Números falados em PT-BR → dígitos.

Cobre cardinais até milhões, decimais ("oito vírgula cinco"), "e meio"
("sete e meio" → 7.5), horários ("às três e meia" → 3:30, "às duas e quinze"
→ 2:15) e ordinais ("segundo bimestre" → 2). É conservador com "um/uma",
que na fala quase sempre é artigo ("abre uma aba").
"""
from __future__ import annotations

import re
from typing import List, Optional, Tuple

UNIDADES = {
    "zero": 0, "um": 1, "uma": 1, "dois": 2, "duas": 2, "tres": 3, "quatro": 4,
    "cinco": 5, "seis": 6, "sete": 7, "oito": 8, "nove": 9, "dez": 10, "onze": 11,
    "doze": 12, "treze": 13, "quatorze": 14, "catorze": 14, "quinze": 15,
    "dezesseis": 16, "dezasseis": 16, "dezessete": 17, "dezoito": 18, "dezenove": 19,
}
DEZENAS = {
    "vinte": 20, "trinta": 30, "quarenta": 40, "cinquenta": 50, "cincoenta": 50,
    "sessenta": 60, "setenta": 70, "oitenta": 80, "noventa": 90,
}
CENTENAS = {
    "cem": 100, "cento": 100, "duzentos": 200, "duzentas": 200, "trezentos": 300,
    "trezentas": 300, "quatrocentos": 400, "quatrocentas": 400, "quinhentos": 500,
    "quinhentas": 500, "seiscentos": 600, "seiscentas": 600, "setecentos": 700,
    "setecentas": 700, "oitocentos": 800, "oitocentas": 800, "novecentos": 900,
    "novecentas": 900,
}
MULTIPLICADORES = {"mil": 1000, "milhao": 1_000_000, "milhoes": 1_000_000}

ORDINAIS = {
    "primeiro": 1, "primeira": 1, "segundo": 2, "segunda": 2, "terceiro": 3,
    "terceira": 3, "quarto": 4, "quarta": 4, "quinto": 5, "quinta": 5, "sexto": 6,
    "sexta": 6, "setimo": 7, "setima": 7, "oitavo": 8, "oitava": 8, "nono": 9,
    "nona": 9, "decimo": 10, "decima": 10, "ultimo": -1, "ultima": -1,
}

PALAVRAS_NUMERO = {**UNIDADES, **DEZENAS, **CENTENAS, **MULTIPLICADORES}

# Depois de "um/uma", estas palavras indicam quantidade e não artigo.
UNIDADES_MEDIDA = {
    "minuto", "minutos", "hora", "horas", "dia", "dias", "semana", "semanas",
    "mes", "meses", "ano", "anos", "ponto", "pontos", "real", "reais",
    "segundos", "vez", "vezes", "virgula", "porcento", "por",
}
CONTEXTO_NUMERICO = {"nota", "numero", "volume", "media", "tirou", "tirei", "valor", "as", "x", "pesos"}
CONTEXTO_HORA_ANTES = {"as", "a", "ate", "para", "pras", "pelas", "das"}
CONTEXTO_HORA_DEPOIS = {"da", "de", "horas", "hora", "h"}

_DIGITO = re.compile(r"^\d+(?:[.,]\d+)?$")


def _fmt(valor: float) -> str:
    if abs(valor - round(valor)) < 1e-9:
        return str(int(round(valor)))
    return ("%.4f" % valor).rstrip("0").rstrip(".")


def _ler_inteiro(toks: List[str], i: int) -> Tuple[Optional[int], int]:
    """Lê um cardinal por extenso a partir de ``toks[i]``.

    Usa limites de ordem de grandeza: depois de "vinte" só cabe uma unidade
    (< 10), depois de "cento" só cabe algo < 100. Assim "vinte e cinco" → 25,
    mas "cinco e seis" para em 5 (é uma lista, não uma composição).
    """
    total = 0
    grupo = 0
    limite = 10 ** 9
    j = i
    leu = False
    while j < len(toks):
        t = toks[j]
        if t == "e":
            prox = toks[j + 1] if j + 1 < len(toks) else ""
            if leu and prox in PALAVRAS_NUMERO and prox not in MULTIPLICADORES and PALAVRAS_NUMERO[prox] < limite:
                j += 1
                continue
            break
        if t in MULTIPLICADORES:
            if not leu and t != "mil":
                break
            mult = MULTIPLICADORES[t]
            grupo = (grupo or 1) * mult
            total += grupo
            grupo = 0
            limite = mult
            leu = True
            j += 1
            continue
        if t in PALAVRAS_NUMERO:
            v = PALAVRAS_NUMERO[t]
            if leu and v >= limite:
                break
            grupo += v
            leu = True
            limite = 100 if v >= 100 else 10 if v >= 20 else 0
            j += 1
            continue
        break
    if not leu:
        return None, i
    return total + grupo, j


def converter(texto: str) -> str:
    """Converte números por extenso em dígitos num texto já dobrado."""
    toks = texto.split()
    out: List[str] = []
    i = 0
    while i < len(toks):
        t = toks[i]
        anterior = out[-1] if out else ""
        prox = toks[i + 1] if i + 1 < len(toks) else ""

        if t in PALAVRAS_NUMERO:
            if t in ("um", "uma"):
                eh_quantidade = (
                    prox in UNIDADES_MEDIDA
                    or anterior in CONTEXTO_NUMERICO
                    or (prox == "e" and i + 2 < len(toks) and toks[i + 2] in ("meio", "meia"))
                    or (prox in PALAVRAS_NUMERO and prox not in ("um", "uma"))
                )
                if not eh_quantidade:
                    out.append(t)
                    i += 1
                    continue
            valor, j = _ler_inteiro(toks, i)
            if valor is None:
                out.append(t)
                i += 1
                continue
            num = _fmt(valor)
            seguinte = toks[j] if j < len(toks) else ""
            depois = toks[j + 1] if j + 1 < len(toks) else ""
            if seguinte in ("virgula", "ponto") and (depois in PALAVRAS_NUMERO or _DIGITO.match(depois)):
                if _DIGITO.match(depois):
                    num = "%s.%s" % (num, re.sub(r"\D", "", depois))
                    j += 2
                else:
                    zeros = ""
                    k = j + 1
                    while k < len(toks) and toks[k] == "zero":
                        zeros += "0"
                        k += 1
                    dec, k2 = _ler_inteiro(toks, k) if k < len(toks) else (None, k)
                    if dec is not None:
                        num = "%s.%s%d" % (num, zeros, dec)
                        j = k2
                    elif zeros:
                        num = "%s.0" % num
                        j = k
            elif seguinte == "e" and depois in ("meio", "meia"):
                apos = toks[j + 2] if j + 2 < len(toks) else ""
                eh_hora = anterior in CONTEXTO_HORA_ANTES or apos in CONTEXTO_HORA_DEPOIS
                if depois == "meia" and eh_hora and valor <= 24:
                    num = "%d:30" % valor
                else:
                    num = _fmt(valor + 0.5)
                j += 2
            elif anterior in CONTEXTO_HORA_ANTES and valor <= 24 and seguinte == "e" and depois in PALAVRAS_NUMERO:
                minutos, k = _ler_inteiro(toks, j + 1)
                if minutos is not None and minutos < 60:
                    num = "%d:%02d" % (valor, minutos)
                    j = k
            out.append(num)
            i = j
            continue

        if _DIGITO.match(t) and prox == "e" and i + 2 < len(toks) and toks[i + 2] in ("meio", "meia"):
            valor = float(t.replace(",", "."))
            apos = toks[i + 3] if i + 3 < len(toks) else ""
            eh_hora = anterior in CONTEXTO_HORA_ANTES or apos in CONTEXTO_HORA_DEPOIS
            if toks[i + 2] == "meia" and eh_hora and valor <= 24 and valor.is_integer():
                out.append("%d:30" % int(valor))
            else:
                out.append(_fmt(valor + 0.5))
            i += 3
            continue
        if re.match(r"^\d+,\d+$", t):
            out.append(t.replace(",", "."))
            i += 1
            continue
        out.append(t)
        i += 1
    return " ".join(out)


def numeros_em(texto: str) -> List[float]:
    """Números (já em dígitos) presentes no texto, ignorando horários."""
    vals: List[float] = []
    for m in re.finditer(r"(?<![\d:./])(\d+(?:\.\d+)?)(?![\d:/]|\.\d)", texto):
        vals.append(float(m.group(1)))
    return vals


def ordinal(token: str) -> Optional[int]:
    t = token.strip().lower()
    if t in ORDINAIS:
        return ORDINAIS[t]
    m = re.match(r"^(\d+)(?:o|a|º|ª)?$", t)
    return int(m.group(1)) if m else None
