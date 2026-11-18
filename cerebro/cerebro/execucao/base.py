"""Planos de execução e o roteamento para os executores."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional


@dataclass
class Passo:
    executor: str                 # desktop | jos | funcao
    acao: str                     # ação tipada do executor do iMac / ferramenta jair_os_* / nome da função
    payload: Dict[str, Any] = field(default_factory=dict)
    descricao: str = ""
    funcao: Optional[Callable[["Executores"], Any]] = None

    def json(self) -> Dict[str, Any]:
        return {"executor": self.executor, "acao": self.acao, "payload": _serializavel(self.payload), "descricao": self.descricao}


@dataclass
class ResultadoPasso:
    passo: Passo
    ok: bool
    resultado: Any = None
    erro: str = ""

    def json(self) -> Dict[str, Any]:
        return {"passo": self.passo.json(), "ok": self.ok, "resultado": _serializavel(self.resultado), "erro": self.erro}


@dataclass
class Plano:
    intencao: str
    passos: List[Passo] = field(default_factory=list)
    risco: int = 0
    fala: str = ""                       # dita antes/durante a execução
    confirmacao: str = ""                # pergunta quando a política exige confirmação
    resumir: Optional[Callable[[List[ResultadoPasso]], Optional[str]]] = None
    continuacao: Optional[Callable[[List[ResultadoPasso]], Optional["Plano"]]] = None
    dormir: bool = False
    dados: Dict[str, Any] = field(default_factory=dict)

    def json(self) -> Dict[str, Any]:
        return {"intencao": self.intencao, "risco": "R%d" % self.risco, "fala": self.fala,
                "confirmacao": self.confirmacao, "passos": [p.json() for p in self.passos]}


class PrecisaSlot(Exception):
    """Lançada por um construtor quando falta uma informação para montar o plano."""

    def __init__(self, nome: str, pergunta: str, tipo: str = "texto") -> None:
        super().__init__(pergunta)
        self.nome = nome
        self.pergunta = pergunta
        self.tipo = tipo


def _serializavel(v: Any) -> Any:
    if isinstance(v, dict):
        return {str(k): _serializavel(x) for k, x in v.items() if not callable(x)}
    if isinstance(v, (list, tuple)):
        return [_serializavel(x) for x in v]
    if isinstance(v, (str, int, float, bool)) or v is None:
        if isinstance(v, str) and len(v) > 4000:
            return v[:4000] + "…"
        return v
    return str(v)


class Executores:
    """Agrupa os executores disponíveis e despacha cada passo."""

    def __init__(self, desktop, jos, simulado: bool = False) -> None:
        self.desktop = desktop
        self.jos = jos
        self.simulado = simulado

    def executar(self, plano: Plano) -> List[ResultadoPasso]:
        resultados: List[ResultadoPasso] = []
        lote_desktop: List[Passo] = []

        def descarregar() -> bool:
            if not lote_desktop:
                return True
            res = self.desktop.executar(list(lote_desktop))
            resultados.extend(res)
            lote_desktop.clear()
            return all(r.ok for r in res)

        for p in plano.passos:
            if p.executor == "desktop":
                lote_desktop.append(p)
                continue
            if not descarregar():
                return resultados
            try:
                if p.executor == "jos":
                    r = self.jos.chamar(p.acao, p.payload)
                    resultados.append(ResultadoPasso(p, True, r))
                elif p.executor == "funcao" and p.funcao is not None:
                    r = p.funcao(self)
                    ok = not (isinstance(r, dict) and r.get("ok") is False)
                    resultados.append(ResultadoPasso(p, ok, r, "" if ok else str(r.get("erro") or "falhou")))
                else:
                    resultados.append(ResultadoPasso(p, False, None, "executor desconhecido: %s" % p.executor))
            except Exception as e:  # noqa: BLE001 - erro vira resposta falada
                resultados.append(ResultadoPasso(p, False, None, "%s: %s" % (type(e).__name__, e)))
            if not resultados[-1].ok:
                return resultados
        descarregar()
        return resultados
