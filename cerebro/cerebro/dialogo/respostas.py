"""Respostas faladas em PT-BR: modelos com variação e formatação para voz."""
from __future__ import annotations

import random
import re
from datetime import datetime
from typing import Any, Dict, Optional

DIAS = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro",
         "novembro", "dezembro"]

_CAMPO = re.compile(r"\{([a-z_]+)(?:\.([a-z_]+))?\}")


def numero_falado(v: Any) -> str:
    if isinstance(v, float):
        if v.is_integer():
            return str(int(v))
        return ("%.2f" % v).rstrip("0").rstrip(".").replace(".", ",")
    return str(v)


def hora_falada(d: datetime) -> str:
    if d.minute == 0:
        return "%dh" % d.hour
    return "%dh%02d" % (d.hour, d.minute)


def data_falada(d: datetime) -> str:
    return "%s, %d de %s de %d" % (DIAS[d.weekday()], d.day, MESES[d.month - 1], d.year)


def saudacao_do_horario(d: datetime) -> str:
    if d.hour < 12:
        return "Bom dia"
    if d.hour < 18:
        return "Boa tarde"
    return "Boa noite"


def renderizar(modelo: str, slots: Dict[str, Any], extra: Optional[Dict[str, Any]] = None) -> str:
    extra = extra or {}

    def troca(m: re.Match) -> str:
        nome, campo = m.group(1), m.group(2)
        if nome in extra and campo is None:
            return numero_falado(extra[nome])
        v = slots.get(nome)
        if v is None:
            alvo = extra.get(nome)
            if isinstance(alvo, dict) and campo:
                return numero_falado(alvo.get(campo, ""))
            return ""
        if campo is None:
            if v.entidade is not None:
                return v.entidade.nome
            if v.tipo == "tempo":
                return str(v.extra.get("desc") or v.texto)
            if isinstance(v.valor, list):
                return ", ".join(numero_falado(x) for x in v.valor)
            return numero_falado(v.valor)
        r = v.campo(campo)
        return numero_falado(r) if r is not None else ""

    s = _CAMPO.sub(troca, modelo)
    s = re.sub(r"\s+([.,!?])", r"\1", re.sub(r"\s{2,}", " ", s)).strip()
    return s


def escolher(modelos, rng: Optional[random.Random] = None) -> str:
    modelos = [m for m in (modelos or []) if m]
    if not modelos:
        return ""
    return (rng or random).choice(modelos)


NAO_ENTENDI = [
    "Desculpe, não entendi. Pode falar de outro jeito?",
    "Não peguei essa. Pode repetir?",
    "Hmm, não entendi o pedido. Pode reformular?",
]
CANCELADO = ["Tudo bem, cancelei.", "Ok, deixa pra lá.", "Cancelado."]
ESCUTANDO = ["Pois não?", "Estou ouvindo.", "Sim?", "Pode falar."]
CONFIRMA_SUFIXO = " Confirma?"
