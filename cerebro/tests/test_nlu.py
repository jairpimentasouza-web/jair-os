from pathlib import Path

import pytest

from cerebro import avaliacao
from cerebro.nlu.gramatica import Compilador


def test_conjunto_ouro(motor, norm):
    r = avaliacao.avaliar(motor, norm)
    assert r["acuracia_intencao"] >= 0.97, r["falhas"]
    assert r["acuracia_slots"] >= 0.95, r["falhas"]
    assert r["falsos_positivos"] == 0, r["falhas"]


def test_conjunto_cego(motor, norm):
    r = avaliacao.avaliar(motor, norm, Path(avaliacao.OURO).with_name("frases_cegas.yaml"))
    assert r["acuracia_intencao"] >= 0.90, r["falhas"]
    assert r["falsos_positivos"] == 0, r["falhas"]


def test_latencia(motor, norm):
    r = avaliacao.avaliar(motor, norm)
    assert r["latencia_ms_mediana"] < 30


def test_gramatica_compila_todas(lexico, motor):
    c = Compilador(lexico)
    for h in motor.habilidades.values():
        assert h.padroes, h.id
        for p in h.padroes:
            c.compilar(p)


def test_habilidades_tem_acao_valida(motor):
    from cerebro.execucao.construtores import CONSTRUTORES, LOCAIS
    for h in motor.habilidades.values():
        a = h.acao
        assert ("construtor" in a and a["construtor"] in CONSTRUTORES) or ("local" in a and a["local"] in LOCAIS) \
            or a.get("executor") == "desktop", h.id
        assert h.risco in ("R0", "R1", "R2", "R3", "R4"), h.id


@pytest.mark.parametrize("frase,app", [("gugou cromi", "chrome"), ("fainder", "finder"), ("pauer point", "powerpoint"),
                                       ("o navegador", "chrome"), ("planilha", "excel")])
def test_entidades_app(lexico, frase, app):
    a = lexico.gaz("app").resolver(frase)
    assert a is not None and a.entidade.id == app


def test_entidade_nao_inventa(lexico):
    assert lexico.gaz("app").resolver("geladeira") is None
    assert lexico.gaz("site").buscar_em("a reuniao foi bem longa") == []


def test_delexicalizacao(motor):
    d, achados, _ = motor.delexicalizar("abre o chrome amanha as 3")
    assert "<app>" in d and "<tempo>" in d
    assert achados["app"][0].entidade.id == "chrome"


def test_estatisticas_lexico(lexico):
    e = lexico.estatisticas()
    assert e["formas_verbais"] > 5000
    assert e["total_termos"] > 6500
