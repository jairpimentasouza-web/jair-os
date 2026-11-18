from datetime import datetime

import pytest

from cerebro.texto import tempo
from cerebro.texto.basico import dobrar, restaurar_acentos
from cerebro.texto.conjugador import formas
from cerebro.texto.fonetica import chave_compacta
from cerebro.texto.numeros import converter, numeros_em

AGORA = datetime(2026, 11, 18, 10, 0)


@pytest.mark.parametrize("entrada,saida", [
    ("nota oito virgula cinco", "nota 8.5"),
    ("sete e meio", "7.5"),
    ("as tres e meia da tarde", "as 3:30 da tarde"),
    ("vinte e cinco", "25"),
    ("cento e vinte e tres", "123"),
    ("mil e quinhentos reais", "1500 reais"),
    ("dois mil e vinte e seis", "2026"),
    ("cinco e seis", "5 e 6"),
    ("abre uma aba", "abre uma aba"),
    ("daqui a uma hora", "daqui a 1 hora"),
    ("as duas e quinze", "as 2:15"),
    ("turma dois mil cento e um", "turma 2101"),
    ("nota 7 e meio", "nota 7.5"),
])
def test_numeros(entrada, saida):
    assert converter(entrada) == saida


def test_numeros_em_ignora_hora():
    assert numeros_em("media de 7 8 e 9.5 as 10:30") == [7.0, 8.0, 9.5]


@pytest.mark.parametrize("frase,iso", [
    ("amanha", "2026-11-19"),
    ("sexta as 3 da tarde", "2026-11-20T15:00"),
    ("daqui a 20 minutos", "2026-11-18T10:20"),
    ("dia 25", "2026-11-25"),
    ("25/11 as 14:30", "2026-11-25T14:30"),
    ("segunda que vem as 9 da manha", "2026-11-23T09:00"),
    ("hoje a noite", "2026-11-18T19:00"),
    ("depois de amanha de manha", "2026-11-20T09:00"),
    ("25 de novembro as 9", "2026-11-25T09:00"),
])
def test_tempo(frase, iso):
    t = tempo.extrair(converter(frase), AGORA)
    assert t is not None and t.iso() == iso


def test_tempo_semana_e_remocao():
    t = tempo.extrair("agenda da semana que vem", AGORA)
    assert t.granularidade == "semana" and t.inicio.date().isoformat() == "2026-11-23"
    c = converter("me lembra daqui a 20 minutos de tirar o bolo")
    assert tempo.remover(c, tempo.extrair(c, AGORA)) == "me lembra de tirar o bolo"


def test_tempo_ausente():
    assert tempo.extrair("abre a 3a serie", AGORA) is None


@pytest.mark.parametrize("a,b", [("google chrome", "gugou cromi"), ("classroom", "class rum"),
                                 ("youtube", "iutubi"), ("drive", "draive"), ("whatsapp", "uatizap")])
def test_fonetica_aproxima(a, b):
    from rapidfuzz import fuzz
    assert fuzz.ratio(chave_compacta(a), chave_compacta(b)) >= 88


def test_conjugador():
    f = formas("abrir")
    assert {"abre", "abra", "abrir", "abri", "abrindo", "abriu", "abriria", "abrisse"} <= f
    assert {"toque", "toquei", "tocasse"} <= formas("tocar")
    assert {"lance", "lancei"} <= formas("lançar")
    assert "reproduz" in formas("reproduzir")
    assert "corrija" in formas("corrigir")


def test_acentos():
    assert dobrar("Coordenação") == "coordenacao"
    assert restaurar_acentos("reuniao com a coordenacao", "Reunião com a Coordenação") == "reunião com a coordenação"


def test_normalizador(norm):
    casos = {
        "Ei Jarvis, abre o Google Chrome por favor": "abre o google chrome",
        "Jarbas, você pode abrir o class rum pra mim?": "abrir o classroom",
        "é... hum, tipo, abre o iutubi aí": "abre o youtube",
        "Coloca o volume em 30.": "coloca o volume em 30",
        "bom dia jarvis": "bom dia",
        "preciso abrir o chrome": "abrir o chrome",
        "preciso comprar giz": "preciso comprar giz",
        "Jarvis": "",
    }
    for entrada, saida in casos.items():
        assert norm.normalizar(entrada).texto == saida, entrada
    assert norm.normalizar("Jarvis abre o chrome").acordou
    assert norm.normalizar("abre https://x.com/a?b=1").urls == ["https://x.com/a?b=1"]


def test_grupos_de_expressao(norm):
    assert norm.pertence("sim, pode", "confirmacao")
    assert norm.pertence("pode fazer jarvis", "confirmacao")
    assert norm.pertence("não", "negacao")
    assert not norm.pertence("abre o chrome", "confirmacao")
    assert norm.eh_alucinacao("Legendas pela comunidade Amara.org")
    assert not norm.eh_alucinacao("abre o chrome")
