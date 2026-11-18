"""Executor de ações no computador.

* ``PonteDesktop`` — usa o executor tipado que já existe no Jair OS
  (``~/JairOS/desktop-personal/desktop_command_bridge.py``): mesma lista de
  ações permitidas, mesma confirmação nativa para ações sensíveis e o mesmo
  log de auditoria (``logs/jair-personal-actions.jsonl``). O Cérebro não
  contorna essa camada.
* ``DesktopSimulado`` — registra o que seria feito (testes e modo seco).
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional

from .base import Passo, ResultadoPasso

PONTE_PADRAO = Path.home() / "JairOS" / "desktop-personal" / "desktop_command_bridge.py"
PYTHON_PADRAO = "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3"


class PonteDesktop:
    def __init__(self, ponte: Optional[os.PathLike] = None, python: Optional[str] = None, timeout: float = 180.0) -> None:
        self.ponte = Path(ponte or PONTE_PADRAO).expanduser()
        self.python = python or (PYTHON_PADRAO if Path(PYTHON_PADRAO).exists() else (shutil.which("python3") or "python3"))
        self.timeout = timeout

    @property
    def disponivel(self) -> bool:
        return self.ponte.exists()

    def executar(self, passos: List[Passo]) -> List[ResultadoPasso]:
        corpo = {"steps": [{"action": p.acao, "payload": p.payload, "description": p.descricao} for p in passos]}
        try:
            proc = subprocess.run([self.python, str(self.ponte)], input=json.dumps(corpo, ensure_ascii=False),
                                  capture_output=True, text=True, timeout=self.timeout)
        except subprocess.TimeoutExpired:
            return [ResultadoPasso(p, False, None, "tempo esgotado no executor do computador") for p in passos]
        except OSError as e:
            return [ResultadoPasso(p, False, None, "executor indisponível: %s" % e) for p in passos]
        linhas = [x for x in (proc.stdout or "").strip().splitlines() if x.strip()]
        try:
            saida = json.loads(linhas[-1]) if linhas else {}
        except ValueError:
            saida = {"ok": False, "error": (proc.stderr or proc.stdout or "saída inválida")[-500:]}
        brutos = saida.get("results") or []
        res: List[ResultadoPasso] = []
        for i, p in enumerate(passos):
            if i < len(brutos):
                b = brutos[i]
                ok = b.get("status") == "succeeded"
                erro = "" if ok else str(b.get("error") or b.get("status") or "falhou")
                res.append(ResultadoPasso(p, ok, b.get("result"), erro))
            else:
                erro = str(saida.get("error") or "etapa não executada")
                res.append(ResultadoPasso(p, False, None, erro))
                break
        return res


class DesktopSimulado:
    """Não toca no computador; devolve resultados plausíveis e guarda o histórico."""

    disponivel = True

    def __init__(self) -> None:
        self.chamadas: List[Dict[str, Any]] = []

    def executar(self, passos: List[Passo]) -> List[ResultadoPasso]:
        out = []
        for p in passos:
            self.chamadas.append({"action": p.acao, "payload": p.payload})
            resultado: Dict[str, Any] = {"simulado": True}
            if p.acao == "disk_usage":
                resultado["disks"] = [{"mount": "/", "free": 120 * 1024 ** 3, "total": 500 * 1024 ** 3}]
            elif p.acao == "search_files":
                resultado["items"] = []
            elif p.acao == "clipboard_read":
                resultado["text"] = ""
            out.append(ResultadoPasso(p, True, resultado))
        return out
