import sys
from datetime import datetime
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from cerebro.avaliacao import LOCAL_EXEMPLO  # noqa: E402
from cerebro.config import Config  # noqa: E402
from cerebro.execucao.desktop import DesktopSimulado  # noqa: E402
from cerebro.execucao.jos import JOSSimulado  # noqa: E402
from cerebro.lexico import Lexico  # noqa: E402
from cerebro.nlu.motor import Motor  # noqa: E402
from cerebro.nucleo import Cerebro  # noqa: E402
from cerebro.texto.normalizar import Normalizador  # noqa: E402

AGORA = datetime(2026, 11, 18, 10, 0)  # quarta-feira


@pytest.fixture(scope="session")
def lexico():
    return Lexico.carregar(LOCAL_EXEMPLO)


@pytest.fixture(scope="session")
def norm(lexico):
    return Normalizador(lexico)


@pytest.fixture(scope="session")
def motor(lexico, norm):
    return Motor(lexico, norm)


@pytest.fixture()
def cerebro(tmp_path):
    lx = Lexico.carregar(LOCAL_EXEMPLO, aprendido=tmp_path / "aprendido.yaml")
    cfg = Config.carregar(str(tmp_path / "nao-existe.yaml"), pasta=tmp_path, modo_desktop="simulado",
                          modo_jos="simulado", usar_llm=False)
    c = Cerebro(cfg, lexico=lx, desktop=DesktopSimulado(), jos=JOSSimulado(), llm=None,
                relogio=lambda: AGORA, semente=7, usar_cache=False)
    return c
