"""Partes do suporte a Windows que dá para testar fora do Windows."""
from cerebro.execucao.base import Passo
from cerebro.execucao.windows import AJUSTES, PERMITIDAS, DesktopWindows, traduzir_passos_mac


def test_traduz_atalhos_do_mac():
    fechar = traduzir_passos_mac([Passo("desktop", "ui_focus", {"app": "Microsoft Word"}),
                                  Passo("desktop", "hotkey", {"keys": ["command", "q"]})])
    assert [(p.acao, p.payload) for p in fechar] == [("close_app", {"mac_app": "Microsoft Word"})]
    assert traduzir_passos_mac([Passo("desktop", "hotkey", {"keys": ["control", "command", "q"]})])[0].acao == "lock_screen"
    pausa = traduzir_passos_mac([Passo("desktop", "ui_focus", {"app": "Google Chrome"}), Passo("desktop", "hotkey", {"keys": ["k"]})])
    assert [(p.acao, p.payload) for p in pausa] == [("media_key", {"key": "play_pause"})]
    prox = traduzir_passos_mac([Passo("desktop", "ui_focus", {"app": "Google Chrome"}), Passo("desktop", "hotkey", {"keys": ["shift", "n"]})])
    assert prox[0].payload == {"key": "next"}
    outros = [Passo("desktop", "open_url", {"url": "https://x"})]
    assert traduzir_passos_mac(outros) == outros


def test_acoes_nao_permitidas_sao_recusadas(tmp_path):
    d = DesktopWindows(str(tmp_path))
    r = d.executar([Passo("desktop", "browser_goal", {"goal": "lançar nota"})])
    assert not r[0].ok and "não disponível no Windows" in r[0].erro
    assert "browser_goal" not in PERMITIDAS and "open_app" in PERMITIDAS


def test_caminhos_fora_da_casa_sao_bloqueados(tmp_path):
    d = DesktopWindows(str(tmp_path))
    try:
        d._caminho("/etc")
        assert False, "deveria bloquear"
    except PermissionError:
        pass
    assert str(d._caminho(str(tmp_path / "Downloads"))).endswith("Downloads")


def test_busca_de_arquivos(tmp_path):
    (tmp_path / "Documents").mkdir()
    (tmp_path / "Documents" / "Prova de Fisica 2101.pdf").write_text("x")
    (tmp_path / "AppData").mkdir()
    (tmp_path / "AppData" / "prova_fisica_cache.pdf").write_text("x")
    d = DesktopWindows(str(tmp_path))
    r = d.executar([Passo("desktop", "search_files", {"root": str(tmp_path), "pattern": "*prova*fisica*"})])
    nomes = [i["path"] for i in r[0].resultado["items"]]
    assert len(nomes) == 1 and nomes[0].endswith("Prova de Fisica 2101.pdf")


def test_ajustes_e_disco(tmp_path):
    assert AJUSTES["bluetooth"] == "ms-settings:bluetooth"
    r = DesktopWindows(str(tmp_path)).executar([Passo("desktop", "disk_usage", {})])
    assert r[0].ok and r[0].resultado["disks"][0]["total"] > 0


def test_voz_windows_comando():
    import base64
    from cerebro.voz.tts import VozWindows
    cmd = VozWindows("Microsoft Maria Desktop")._comando("Olá, Jair!")
    assert cmd[:2] == ["powershell", "-NoProfile"]
    script = base64.b64decode(cmd[-1]).decode("utf-16-le")
    assert "Microsoft Maria Desktop" in script and "pt-BR" in script
    texto_b64 = script.split("FromBase64String('")[1].split("'")[0]
    assert base64.b64decode(texto_b64).decode("utf-8") == "Olá, Jair!"


def test_jos_nao_configurado_nao_finge(tmp_path, monkeypatch):
    from datetime import datetime
    from cerebro.avaliacao import LOCAL_EXEMPLO
    from cerebro.config import Config
    from cerebro.execucao.desktop import DesktopSimulado
    from cerebro.lexico import Lexico
    from cerebro.nucleo import Cerebro
    monkeypatch.delenv("JOS_MCP_URL", raising=False)
    monkeypatch.delenv("JOS_MCP_TOKEN", raising=False)
    cfg = Config.carregar(str(tmp_path / "x.yaml"), pasta=tmp_path, usar_llm=False)
    c = Cerebro(cfg, lexico=Lexico.carregar(LOCAL_EXEMPLO), desktop=DesktopSimulado(), llm=None,
                relogio=lambda: datetime(2026, 11, 18, 10, 0), usar_cache=False)
    r = c.processar("cria uma tarefa de corrigir as provas")
    assert r.estado == "erro" and "não configurado" in r.fala
    r = c.processar("me lembra amanhã às 9 de levar o notebook")
    assert r.estado == "ok" and "só neste computador" in r.fala
    assert c.lembretes.pendentes()[0]["texto"] == "levar o notebook"
