"""Política de autorização do Jarvis.

Princípio herdado do JOS: *a inteligência pode ser probabilística; a autorização é
determinística*. Níveis iguais aos do agente executivo do JOS
(R0 nenhum · R1 auditoria · R2 auditoria · R3 humano · R4 humano forte):

* R0 leitura/abrir — executa direto se a confiança for suficiente;
* R1 mudança local reversível — confirma se a confiança for baixa ou vier do LLM;
* R2 escrita interna no JOS — confirma se a confiança for < 0,8 ou vier do LLM;
* R3 efeito externo (alunos veem, nota lançada) — sempre confirma por voz;
* R4 destrutivo — exige a palavra "confirmo" e fica bloqueado por padrão.
"""
from __future__ import annotations

import json
import threading
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional


@dataclass
class Decisao:
    acao: str        # executar | confirmar | confirmar_forte | bloquear | esclarecer
    motivo: str = ""


class Politica:
    def __init__(self, permitir_r4: bool = False, limiar_execucao: float = 0.55) -> None:
        self.permitir_r4 = permitir_r4
        self.limiar_execucao = limiar_execucao

    def avaliar(self, risco: int, confianca: float, fonte: str) -> Decisao:
        if confianca < self.limiar_execucao:
            return Decisao("esclarecer", "confiança baixa (%.2f)" % confianca)
        incerto = fonte == "llm"
        if risco >= 4:
            return Decisao("confirmar_forte" if self.permitir_r4 else "bloquear", "ação destrutiva")
        if risco == 3:
            return Decisao("confirmar", "efeito externo")
        if risco == 2 and (confianca < 0.8 or incerto):
            return Decisao("confirmar", "gravação no JOS com entendimento incerto")
        if risco == 1 and (confianca < 0.7 or incerto):
            return Decisao("confirmar", "mudança local com entendimento incerto")
        return Decisao("executar", "risco R%d dentro da política" % risco)


class Auditoria:
    """Registro JSONL de cada pedido, decisão e resultado (sem conteúdo de áudio)."""

    def __init__(self, arquivo: Optional[Path]) -> None:
        self.arquivo = Path(arquivo).expanduser() if arquivo else None
        self._trava = threading.Lock()

    def registrar(self, **campos: Any) -> None:
        if not self.arquivo:
            return
        rec: Dict[str, Any] = {"em": datetime.now().astimezone().isoformat(timespec="seconds")}
        rec.update(campos)
        try:
            with self._trava:
                self.arquivo.parent.mkdir(parents=True, exist_ok=True)
                with self.arquivo.open("a", encoding="utf-8") as f:
                    f.write(json.dumps(rec, ensure_ascii=False, default=str) + "\n")
        except OSError:
            pass
