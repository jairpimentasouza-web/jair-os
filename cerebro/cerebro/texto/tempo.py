"""Expressões de data e hora em PT-BR (sobre texto dobrado e com números em dígitos).

Exemplos aceitos: "hoje", "amanhã de manhã", "depois de amanhã às 3 da tarde",
"segunda que vem", "sexta às 14h30", "dia 25", "25/11", "25 de novembro às 9",
"daqui a 20 minutos", "daqui a meia hora", "semana que vem", "meio dia",
"hoje à noite", "às 18 horas".
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from typing import List, Optional, Tuple

DIAS_SEMANA = {
    "segunda": 0, "terca": 1, "quarta": 2, "quinta": 3, "sexta": 4, "sabado": 5, "domingo": 6,
}
MESES = {
    "janeiro": 1, "fevereiro": 2, "marco": 3, "abril": 4, "maio": 5, "junho": 6, "julho": 7,
    "agosto": 8, "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12,
}
PERIODOS = {"manha": 9, "tarde": 15, "noite": 19, "madrugada": 6}


@dataclass
class Tempo:
    """Resultado do reconhecimento temporal."""

    inicio: datetime
    granularidade: str  # "dia", "hora", "semana", "minuto"
    fim: Optional[datetime] = None
    trechos: List[Tuple[int, int]] = field(default_factory=list)
    tem_hora: bool = False
    texto: str = ""

    def iso(self) -> str:
        if self.tem_hora:
            return self.inicio.isoformat(timespec="minutes")
        return self.inicio.date().isoformat()

    def descrever(self, agora: Optional[datetime] = None) -> str:
        agora = agora or datetime.now()
        d = self.inicio.date()
        if self.granularidade == "semana":
            return "na semana de %s" % d.strftime("%d/%m")
        if d == agora.date():
            dia = "hoje"
        elif d == agora.date() + timedelta(days=1):
            dia = "amanhã"
        elif d == agora.date() - timedelta(days=1):
            dia = "ontem"
        else:
            nomes = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]
            dia = "%s, %s" % (nomes[d.weekday()], d.strftime("%d/%m"))
        if self.tem_hora:
            return "%s às %s" % (dia, self.inicio.strftime("%H:%M").replace(":00", "h").replace(":", "h"))
        return dia


_HORA = re.compile(
    r"\b(?:(?:as|a|ate as|pelas|para as|pras)\s+)?(\d{1,2})(?:(?::|h)(\d{2})|\s*h\b|\s+horas?\b)?"
    r"(?:\s+(?:da|de|a)\s+(manha|tarde|noite|madrugada))?\b"
)


def _hora_de(texto: str) -> Optional[Tuple[time, Tuple[int, int]]]:
    """Encontra um horário explícito. Exige um marcador (às, h, horas, :mm, da tarde)."""
    for m in _HORA.finditer(texto):
        bruto = m.group(0)
        tem_marcador = bool(re.match(r"(?:as|a|ate as|pelas|para as|pras)\s", bruto)) or m.group(2) or \
            re.search(r"\d\s*h\b|horas?\b", bruto) or m.group(3)
        if not tem_marcador:
            continue
        h = int(m.group(1))
        mi = int(m.group(2) or 0)
        periodo = m.group(3)
        # "a 3" sem outro marcador é ambíguo ("a 3ª série"); exige h/horas/periodo ou "as"
        if bruto.startswith("a ") and not (m.group(2) or periodo or re.search(r"h\b|horas?", bruto)):
            continue
        if h > 24 or mi > 59:
            continue
        if periodo in ("tarde", "noite") and h < 12:
            h += 12
        elif periodo is None and 1 <= h <= 7 and not re.search(r"\bmadrugada\b", texto):
            h += 12  # "às 3" no Brasil quase sempre é 15h
        if h == 24:
            h = 0
        return time(h, mi), (m.start(), m.end())
    m = re.search(r"\bmeio dia(?: e meia)?\b|\bmeio-dia\b", texto)
    if m:
        return time(12, 30 if "meia" in m.group(0) else 0), (m.start(), m.end())
    m = re.search(r"\bmeia noite\b", texto)
    if m:
        return time(0, 0), (m.start(), m.end())
    return None


def _proximo_dia_semana(base: date, alvo: int, semana_que_vem: bool) -> date:
    if semana_que_vem:
        # "segunda que vem" = a segunda da próxima semana
        inicio_prox = base + timedelta(days=7 - base.weekday())
        return inicio_prox + timedelta(days=alvo)
    return base + timedelta(days=(alvo - base.weekday()) % 7)


def extrair(texto: str, agora: Optional[datetime] = None) -> Optional[Tempo]:
    """Extrai a primeira referência temporal do texto (dobrado, números em dígitos)."""
    agora = agora or datetime.now()
    hoje = agora.date()
    trechos: List[Tuple[int, int]] = []
    dia: Optional[date] = None
    granularidade = "dia"

    # Relativos com duração: "daqui a 20 minutos", "em 2 horas", "daqui a meia hora"
    m = re.search(r"\b(?:daqui a|daqui|em|dentro de)\s+(meia|\d+(?:\.\d+)?)\s+(minutos?|horas?|dias?|semanas?)\b", texto)
    if m:
        qtd = 0.5 if m.group(1) == "meia" else float(m.group(1))
        unidade = m.group(2)
        if unidade.startswith("minuto"):
            inicio = agora + timedelta(minutes=qtd)
            g = "minuto"
        elif unidade.startswith("hora"):
            inicio = agora + timedelta(hours=qtd)
            g = "minuto"
        elif unidade.startswith("semana"):
            inicio = agora + timedelta(weeks=qtd)
            g = "dia"
        else:
            inicio = agora + timedelta(days=qtd)
            g = "dia"
        return Tempo(inicio=inicio.replace(second=0, microsecond=0), granularidade=g,
                     trechos=[(m.start(), m.end())], tem_hora=g == "minuto", texto=m.group(0))
    m = re.search(r"\bdaqui a pouco\b", texto)
    if m:
        return Tempo(inicio=(agora + timedelta(minutes=15)).replace(second=0, microsecond=0),
                     granularidade="minuto", trechos=[(m.start(), m.end())], tem_hora=True, texto=m.group(0))

    # Semana
    m = re.search(r"\b(?:(?:na|a|essa|esta|nessa|nesta)\s+)?(semana que vem|proxima semana|essa semana|esta semana|nessa semana|nesta semana|fim de semana|final de semana)\b", texto)
    if m:
        alvo = m.group(1)
        if "fim" in alvo or "final" in alvo:
            sab = hoje + timedelta(days=(5 - hoje.weekday()) % 7)
            return Tempo(inicio=datetime.combine(sab, time(0)), fim=datetime.combine(sab + timedelta(days=1), time(23, 59)),
                         granularidade="semana", trechos=[(m.start(), m.end())], texto=m.group(0))
        base = hoje - timedelta(days=hoje.weekday())
        if "que vem" in alvo or "proxima" in alvo:
            base += timedelta(days=7)
        return Tempo(inicio=datetime.combine(base, time(0)), fim=datetime.combine(base + timedelta(days=6), time(23, 59)),
                     granularidade="semana", trechos=[(m.start(), m.end())], texto=m.group(0))

    # Dias relativos
    for padrao, delta in ((r"\bdepois de amanha\b", 2), (r"\banteontem\b", -2), (r"\bamanha\b", 1),
                          (r"\bontem\b", -1), (r"\bhoje\b", 0)):
        m = re.search(padrao, texto)
        if m:
            dia = hoje + timedelta(days=delta)
            trechos.append((m.start(), m.end()))
            break

    # Data numérica: 25/11, 25/11/2026
    if dia is None:
        m = re.search(r"\b(?:dia\s+)?(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?\b", texto)
        if m:
            d, mes = int(m.group(1)), int(m.group(2))
            ano = int(m.group(3)) if m.group(3) else hoje.year
            if ano < 100:
                ano += 2000
            try:
                dia = date(ano, mes, d)
                if not m.group(3) and dia < hoje - timedelta(days=60):
                    dia = date(ano + 1, mes, d)
                trechos.append((m.start(), m.end()))
            except ValueError:
                dia = None

    # "25 de novembro", "dia 3 de dezembro"
    if dia is None:
        m = re.search(r"\b(?:dia\s+)?(\d{1,2})\s+de\s+(" + "|".join(MESES) + r")(?:\s+de\s+(\d{4}))?\b", texto)
        if m:
            d, mes = int(m.group(1)), MESES[m.group(2)]
            ano = int(m.group(3)) if m.group(3) else hoje.year
            try:
                dia = date(ano, mes, d)
                if not m.group(3) and dia < hoje - timedelta(days=60):
                    dia = date(ano + 1, mes, d)
                trechos.append((m.start(), m.end()))
            except ValueError:
                dia = None

    # Dia da semana: "segunda", "sexta que vem", "na proxima quarta"
    if dia is None:
        nomes = "|".join(DIAS_SEMANA)
        m = re.search(r"\b(?:(?:na|no|nessa|nesta|essa|esta)\s+)?(proxima\s+|proximo\s+)?(" + nomes + r")(?:\s*-?\s*feira)?(\s+que vem|\s+da semana que vem)?\b", texto)
        if m:
            alvo = DIAS_SEMANA[m.group(2)]
            prox = bool(m.group(1) or m.group(3))
            dia = _proximo_dia_semana(hoje, alvo, prox)
            trechos.append((m.start(), m.end()))

    # "dia 25" (sem mês)
    if dia is None:
        m = re.search(r"\bdia\s+(\d{1,2})\b(?!\s*/)", texto)
        if m:
            d = int(m.group(1))
            try:
                dia = date(hoje.year, hoje.month, d)
                if dia < hoje:
                    mes = hoje.month + 1
                    dia = date(hoje.year + (mes > 12), (mes - 1) % 12 + 1, d)
                trechos.append((m.start(), m.end()))
            except ValueError:
                dia = None

    hora = _hora_de(texto)
    tem_hora = False
    hora_valor = time(0)
    if hora:
        hora_valor, trecho = hora
        trechos.append(trecho)
        tem_hora = True
        granularidade = "hora"
    else:
        m = re.search(r"\b(?:de|a|pela|na|hoje a|hoje de)\s+(manha|tarde|noite)\b", texto)
        if m and (dia is not None or re.search(r"\bhoje\b", texto)):
            hora_valor = time(PERIODOS[m.group(1)])
            tem_hora = True
            granularidade = "hora"
            trechos.append((m.start(), m.end()))

    if dia is None and not tem_hora:
        return None
    if dia is None:
        dia = hoje
        candidato = datetime.combine(dia, hora_valor)
        if candidato < agora - timedelta(minutes=5):
            dia = hoje + timedelta(days=1)
    inicio = datetime.combine(dia, hora_valor)
    trechos.sort()
    texto_tempo = " ".join(texto[a:b] for a, b in trechos)
    return Tempo(inicio=inicio, granularidade=granularidade, trechos=trechos, tem_hora=tem_hora, texto=texto_tempo)


def remover(texto: str, tempo: Optional[Tempo]) -> str:
    """Remove do texto os trechos temporais reconhecidos."""
    if not tempo or not tempo.trechos:
        return texto
    fundidos: List[List[int]] = []
    for a, b in sorted(tempo.trechos):
        if fundidos and a <= fundidos[-1][1]:
            fundidos[-1][1] = max(fundidos[-1][1], b)
        else:
            fundidos.append([a, b])
    partes = []
    pos = 0
    for a, b in fundidos:
        partes.append(texto[pos:a])
        pos = b
    partes.append(texto[pos:])
    s = " ".join(" ".join(partes).split())
    s = re.sub(r"(?:\s+|^)(?:para|pra|no|na|de|da|do|em|as|a|pro)$", "", s).strip()
    return s
