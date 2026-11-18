import numpy as np
import pytest


def test_api(cerebro):
    pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient

    from cerebro.api import criar_app

    cli = TestClient(criar_app(cerebro, com_voz=False))
    assert cli.get("/").status_code == 200
    s = cli.get("/v1/saude").json()
    assert s["executores"]["desktop"] == "DesktopSimulado"
    assert len(cli.get("/v1/habilidades").json()) >= 50
    e = cli.post("/v1/entender", json={"texto": "abre o chrome"}).json()
    assert e["hipoteses"][0]["intencao"] == "app.abrir"
    r = cli.post("/v1/comando", json={"texto": "que horas são"}).json()
    assert r["fala"] == "Agora são 10h."
    assert cli.post("/v1/comando", json={"texto": ""}).status_code == 422
    with cli.websocket_connect("/v1/conversa") as ws:
        ws.send_json({"texto": "abre o youtube"})
        m = ws.receive_json()
        assert m["tipo"] == "resposta" and m["intencao"] == "site.abrir"


def test_api_token(cerebro):
    pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient

    from cerebro.api import criar_app

    cerebro.config.token_api = "abc"
    cli = TestClient(criar_app(cerebro, com_voz=False))
    assert cli.get("/v1/saude").status_code == 401
    assert cli.get("/v1/saude", headers={"authorization": "Bearer abc"}).status_code == 200


def test_detector_de_fala():
    from cerebro.voz.ouvido import QUADRO, DetectorFala
    d = DetectorFala(silencio_fim_ms=400, espera_inicio_s=5)
    rng = np.random.default_rng(0)
    silencio = lambda: (rng.normal(0, 30, QUADRO)).astype(np.int16)  # noqa: E731
    voz = lambda: (np.sin(np.linspace(0, 200, QUADRO)) * 6000).astype(np.int16)  # noqa: E731
    estados = [d.processar(silencio()) for _ in range(10)]
    assert not any(e.terminou for e in estados)
    for _ in range(10):
        assert not d.processar(voz()).terminou
    fim = [d.processar(silencio()).terminou for _ in range(8)]
    assert any(fim)
    assert len(d.resultado()) >= 10 * QUADRO


def test_detector_desiste_sem_fala():
    from cerebro.voz.ouvido import QUADRO, DetectorFala
    d = DetectorFala(espera_inicio_s=0.5)
    e = None
    for _ in range(10):
        e = d.processar(np.zeros(QUADRO, dtype=np.int16))
    assert e.terminou and e.estourou


def test_tts_preparar():
    from cerebro.voz.tts import VozNula, criar_voz, preparar
    assert preparar("Status do JOS: 40% livre — Turma 2101, AV1") == "Status do Jair OS: 40 por cento livre , turma 21 01, A V 1"
    assert isinstance(criar_voz("nenhuma"), VozNula)
