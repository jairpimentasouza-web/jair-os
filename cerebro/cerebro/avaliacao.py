"""Avaliação do entendimento sobre o conjunto-ouro (tests/ouro/frases_ouro.yaml)."""
from __future__ import annotations

import statistics
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

from .texto.basico import dobrar

OURO = Path(__file__).resolve().parent.parent / "tests" / "ouro" / "frases_ouro.yaml"
LOCAL_EXEMPLO = Path(__file__).resolve().parent / "lexico" / "local.exemplo.yaml"


def _slot_ok(esperado: Any, valor) -> bool:
    if valor is None:
        return False
    if isinstance(esperado, list):
        return [float(x) for x in esperado] == [float(x) for x in (valor.valor or [])]
    if isinstance(esperado, (int, float)):
        try:
            return abs(float(valor.valor) - float(esperado)) < 1e-6
        except (TypeError, ValueError):
            return False
    if valor.entidade is not None:
        return str(valor.entidade.id) == str(esperado)
    return dobrar(str(esperado)) in dobrar(str(valor.valor))


def avaliar(motor, norm, arquivo: Optional[Path] = None, limiar: float = 0.5,
            agora: Optional[datetime] = None) -> Dict[str, Any]:
    casos = yaml.safe_load(Path(arquivo or OURO).read_text(encoding="utf-8"))
    agora = agora or datetime(2026, 11, 18, 10, 0)
    acertos = 0
    slots_total = 0
    slots_ok = 0
    negativos = 0
    falsos_positivos = 0
    tempos: List[float] = []
    falhas: List[Dict[str, Any]] = []
    por_fonte: Dict[str, int] = {}
    positivos = 0
    for c in casos:
        inicio = time.perf_counter()
        fala = norm.normalizar(c["f"])
        hips = motor.entender(fala, None, agora, usar_llm=False)
        tempos.append((time.perf_counter() - inicio) * 1000)
        topo = hips[0] if hips and hips[0].confianca >= limiar else None
        esperado = c.get("i")
        if esperado is None:
            negativos += 1
            if topo is not None:
                falsos_positivos += 1
                falhas.append({"frase": c["f"], "esperado": None, "obtido": topo.intencao, "conf": topo.confianca})
            continue
        positivos += 1
        if topo is not None and topo.intencao == esperado:
            acertos += 1
            por_fonte[topo.fonte] = por_fonte.get(topo.fonte, 0) + 1
            for nome, val in (c.get("s") or {}).items():
                slots_total += 1
                if _slot_ok(val, topo.slots.get(nome)):
                    slots_ok += 1
                else:
                    v = topo.slots.get(nome)
                    falhas.append({"frase": c["f"], "slot": nome, "esperado": val, "obtido": v.valor if v else None})
        else:
            for nome in (c.get("s") or {}):
                slots_total += 1
            falhas.append({"frase": c["f"], "esperado": esperado, "obtido": topo.intencao if topo else None,
                           "conf": topo.confianca if topo else (hips[0].confianca if hips else 0), "texto": fala.texto})
    return {
        "frases": len(casos),
        "comandos": positivos,
        "acuracia_intencao": round(acertos / max(1, positivos), 4),
        "acuracia_slots": round(slots_ok / max(1, slots_total), 4),
        "negativos": negativos,
        "falsos_positivos": falsos_positivos,
        "latencia_ms_mediana": round(statistics.median(tempos), 2) if tempos else 0,
        "latencia_ms_p95": round(sorted(tempos)[int(len(tempos) * 0.95) - 1], 2) if tempos else 0,
        "acertos_por_fonte": por_fonte,
        "falhas": falhas,
    }


def imprimir(rel: Dict[str, Any]) -> None:
    print("Frases avaliadas ........ %d (%d comandos, %d não-comandos)" % (rel["frases"], rel["comandos"], rel["negativos"]))
    print("Acurácia de intenção .... %.1f%%" % (100 * rel["acuracia_intencao"]))
    print("Acurácia de slots ....... %.1f%%" % (100 * rel["acuracia_slots"]))
    print("Falsos positivos ........ %d de %d" % (rel["falsos_positivos"], rel["negativos"]))
    print("Latência (mediana/p95) .. %.1f ms / %.1f ms" % (rel["latencia_ms_mediana"], rel["latencia_ms_p95"]))
    print("Acertos por camada ...... %s" % rel["acertos_por_fonte"])
    if rel["falhas"]:
        print("\nFalhas:")
        for f in rel["falhas"]:
            print("  - %s" % f)
