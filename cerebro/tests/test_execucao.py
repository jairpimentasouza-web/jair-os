import json
import sys
import threading
from decimal import Decimal
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from cerebro.execucao import calculo
from cerebro.execucao.base import Passo
from cerebro.execucao.desktop import PonteDesktop
from cerebro.execucao.jos import ClienteJOS, ErroJOS
from cerebro.execucao.lembretes import AgendaLembretes


def test_calculo():
    assert calculo.formatar(calculo.avaliar("25 vezes 4")) == "100"
    assert calculo.formatar(calculo.avaliar("10 menos 3 vezes 2")) == "4"
    assert calculo.formatar(calculo.avaliar("2 elevado a 10")) == "1024"
    assert calculo.formatar(calculo.avaliar("raiz de 144")) == "12"
    assert calculo.formatar(calculo.avaliar("3.5 mais 2.25")) == "5,75"
    assert calculo.avaliar("abre o chrome") is None
    assert calculo.avaliar("1 dividido por 0") is None
    assert calculo.media([7, 8, 9]) == Decimal(8)
    nec, alvo, notas, rest = calculo.nota_necessaria("para ficar com media 6 se tirei 4 e 5", [])
    assert nec == 9 and alvo == 6 and rest == 1


PONTE_FALSA = r'''
import json, sys
req = json.load(sys.stdin)
res = []
for i, s in enumerate(req["steps"], 1):
    if s["action"] == "falha":
        res.append({"step": i, "action": s["action"], "status": "failed", "error": "PermissionError: não autorizado"})
        break
    res.append({"step": i, "action": s["action"], "status": "succeeded", "result": {"eco": s["payload"]}})
print(json.dumps({"ok": all(r["status"] == "succeeded" for r in res), "results": res}))
'''


def test_ponte_desktop(tmp_path):
    ponte = tmp_path / "ponte.py"
    ponte.write_text(PONTE_FALSA, encoding="utf-8")
    p = PonteDesktop(ponte, sys.executable)
    assert p.disponivel
    r = p.executar([Passo("desktop", "open_app", {"name": "chrome"}), Passo("desktop", "notify", {"message": "oi"})])
    assert [x.ok for x in r] == [True, True] and r[0].resultado == {"eco": {"name": "chrome"}}
    r = p.executar([Passo("desktop", "falha", {}), Passo("desktop", "open_app", {})])
    assert not r[0].ok and "não autorizado" in r[0].erro and not r[1].ok


class _MCPFalso(BaseHTTPRequestHandler):
    chamadas = []

    def log_message(self, *a):
        pass

    def do_POST(self):
        corpo = json.loads(self.rfile.read(int(self.headers["content-length"])))
        _MCPFalso.chamadas.append((corpo.get("method"), self.headers.get("authorization"), self.headers.get("mcp-session-id")))
        if "id" not in corpo:
            self.send_response(202)
            self.end_headers()
            return
        if corpo["method"] == "initialize":
            resp = {"jsonrpc": "2.0", "id": corpo["id"], "result": {"protocolVersion": "2025-06-18", "capabilities": {}}}
            dados = json.dumps(resp).encode()
            self.send_response(200)
            self.send_header("content-type", "application/json")
            self.send_header("mcp-session-id", "sessao-123")
        else:
            nome = corpo["params"]["name"]
            if nome == "quebrada":
                res = {"isError": True, "content": [{"type": "text", "text": "falhou feio"}]}
            else:
                res = {"content": [{"type": "text", "text": json.dumps({"ok": True, "ferramenta": nome, "args": corpo["params"]["arguments"]})}]}
            dados = ("event: message\ndata: %s\n\n" % json.dumps({"jsonrpc": "2.0", "id": corpo["id"], "result": res})).encode()
            self.send_response(200)
            self.send_header("content-type", "text/event-stream")
        self.send_header("content-length", str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)


def test_cliente_jos_mcp():
    srv = ThreadingHTTPServer(("127.0.0.1", 0), _MCPFalso)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        c = ClienteJOS("http://127.0.0.1:%d/mcp" % srv.server_port, "segredo")
        r = c.chamar("jair_os_criar_tarefa", {"titulo": "Teste", "prazo": None})
        assert r == {"ok": True, "ferramenta": "jair_os_criar_tarefa", "args": {"titulo": "Teste"}}
        metodos = [m for m, _, _ in _MCPFalso.chamadas]
        assert metodos[:3] == ["initialize", "notifications/initialized", "tools/call"]
        assert _MCPFalso.chamadas[0][1] == "Bearer segredo"
        assert _MCPFalso.chamadas[2][2] == "sessao-123"
        try:
            c.chamar("quebrada", {})
            assert False, "deveria falhar"
        except ErroJOS as e:
            assert "falhou feio" in str(e)
    finally:
        srv.shutdown()


def test_cliente_jos_nao_configurado():
    c = ClienteJOS("", "")
    assert not c.configurado
    try:
        c.chamar("x", {})
        assert False
    except ErroJOS as e:
        assert "não configurado" in str(e)


def test_lembretes(tmp_path):
    from datetime import datetime, timedelta
    a = AgendaLembretes(tmp_path / "l.json")
    a.agendar("tirar o bolo", datetime.now() - timedelta(minutes=1))
    a.agendar("reunião", datetime.now() + timedelta(days=1))
    venc = a.vencidos()
    assert [v["texto"] for v in venc] == ["tirar o bolo"]
    assert [p["texto"] for p in AgendaLembretes(tmp_path / "l.json").pendentes()] == ["reunião"]
