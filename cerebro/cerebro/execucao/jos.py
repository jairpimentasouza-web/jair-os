"""Cliente do conector MCP do Jair OS (as mesmas ferramentas ``jair_os_*``).

Fala MCP por HTTP (JSON-RPC 2.0, transporte "streamable HTTP"): faz o
``initialize`` uma vez, guarda o ``Mcp-Session-Id`` se o servidor devolver e
chama ``tools/call``. Aceita respostas JSON ou SSE.

Configuração por ambiente: ``JOS_MCP_URL`` e ``JOS_MCP_TOKEN`` (Bearer).
"""
from __future__ import annotations

import itertools
import json
import os
import threading
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional


class ErroJOS(RuntimeError):
    pass


def _texto_resultado(res: Dict[str, Any]) -> Any:
    if res.get("isError"):
        partes = [c.get("text", "") for c in res.get("content") or [] if isinstance(c, dict)]
        raise ErroJOS(" ".join(partes).strip() or "erro na ferramenta do JOS")
    if "structuredContent" in res and res["structuredContent"] is not None:
        return res["structuredContent"]
    textos = [c.get("text", "") for c in res.get("content") or [] if isinstance(c, dict) and c.get("type") == "text"]
    bruto = "\n".join(textos).strip()
    try:
        return json.loads(bruto)
    except ValueError:
        return bruto


class ClienteJOS:
    def __init__(self, url: Optional[str] = None, token: Optional[str] = None, timeout: float = 45.0) -> None:
        self.url = (url or os.environ.get("JOS_MCP_URL") or "").strip()
        self.token = (token or os.environ.get("JOS_MCP_TOKEN") or "").strip()
        self.timeout = timeout
        self._sessao: Optional[str] = None
        self._ids = itertools.count(1)
        self._trava = threading.Lock()
        self._iniciado = False

    @property
    def configurado(self) -> bool:
        return bool(self.url)

    def _post(self, corpo: Dict[str, Any], esperar_resposta: bool = True) -> Optional[Dict[str, Any]]:
        cab = {"content-type": "application/json", "accept": "application/json, text/event-stream",
               "mcp-protocol-version": "2025-06-18"}
        if self.token:
            cab["authorization"] = "Bearer " + self.token
        if self._sessao:
            cab["mcp-session-id"] = self._sessao
        req = urllib.request.Request(self.url, data=json.dumps(corpo).encode(), headers=cab, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                sid = r.headers.get("mcp-session-id")
                if sid:
                    self._sessao = sid
                bruto = r.read().decode("utf-8", "replace")
                tipo = r.headers.get("content-type", "")
        except urllib.error.HTTPError as e:
            raise ErroJOS("JOS respondeu HTTP %s" % e.code) from e
        except (urllib.error.URLError, OSError) as e:
            raise ErroJOS("JOS inacessível: %s" % e) from e
        if not esperar_resposta or not bruto.strip():
            return None
        if "text/event-stream" in tipo or bruto.lstrip().startswith(("event:", "data:")):
            ultimo = None
            for linha in bruto.splitlines():
                if linha.startswith("data:"):
                    try:
                        msg = json.loads(linha[5:].strip())
                    except ValueError:
                        continue
                    if msg.get("id") == corpo.get("id"):
                        ultimo = msg
            if ultimo is None:
                raise ErroJOS("resposta SSE sem resultado")
            return ultimo
        return json.loads(bruto)

    def _iniciar(self) -> None:
        if self._iniciado:
            return
        resp = self._post({"jsonrpc": "2.0", "id": next(self._ids), "method": "initialize", "params": {
            "protocolVersion": "2025-06-18", "capabilities": {},
            "clientInfo": {"name": "jos-cerebro", "version": "1.0.0"}}})
        if resp and resp.get("error"):
            raise ErroJOS(str(resp["error"].get("message")))
        try:
            self._post({"jsonrpc": "2.0", "method": "notifications/initialized"}, esperar_resposta=False)
        except ErroJOS:
            pass
        self._iniciado = True

    def chamar(self, ferramenta: str, argumentos: Dict[str, Any]) -> Any:
        if not self.configurado:
            raise ErroJOS("conector do JOS não configurado (defina JOS_MCP_URL e JOS_MCP_TOKEN)")
        with self._trava:
            self._iniciar()
            corpo = {"jsonrpc": "2.0", "id": next(self._ids), "method": "tools/call",
                     "params": {"name": ferramenta, "arguments": {k: v for k, v in argumentos.items() if v not in (None, "")}}}
            resp = self._post(corpo)
        if not resp:
            raise ErroJOS("resposta vazia do JOS")
        if resp.get("error"):
            raise ErroJOS(str(resp["error"].get("message") or resp["error"]))
        return _texto_resultado(resp.get("result") or {})


class JOSSimulado:
    """Substituto do JOS para testes e modo seco: registra chamadas e devolve respostas plausíveis."""

    configurado = True

    def __init__(self) -> None:
        self.chamadas: List[Dict[str, Any]] = []

    def chamar(self, ferramenta: str, argumentos: Dict[str, Any]) -> Any:
        self.chamadas.append({"ferramenta": ferramenta, "argumentos": argumentos})
        if ferramenta == "jair_os_tarefas":
            return [{"id": "t1", "title": "Corrigir as provas da 2101", "status": "planned", "priority": 4},
                    {"id": "t2", "title": "Ligar para o banco", "status": "inbox", "priority": 2}]
        if ferramenta == "jair_os_rotear":
            return {"execution_id": "exec-simulada", "workflow": "WF-004", "agentes": ["jair-didatica"], "risco": "low"}
        if ferramenta == "jair_os_status_operacional":
            return {"dispositivos": [{"name": "iMac", "enabled": True, "last_seen_at": "agora"}], "alertas": []}
        if ferramenta == "jair_os_classroom_turmas":
            return [{"id": "c2101", "name": "Turma 2101"}, {"id": "c2201", "name": "Turma 2201"}]
        if ferramenta == "jair_os_buscar_memoria":
            return []
        if ferramenta == "jair_os_buscar_conhecimento":
            return {"resultados": []}
        return {"ok": True, "simulado": True}
