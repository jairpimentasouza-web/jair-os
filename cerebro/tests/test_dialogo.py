def falar(c, *frases):
    return [c.processar(f) for f in frases]


def test_abrir_e_anafora(cerebro):
    r1, r2 = falar(cerebro, "Jarvis, abre o Chrome", "fecha ele")
    assert r1.intencao == "app.abrir" and r1.estado == "ok"
    assert r2.intencao == "app.fechar" and "Chrome" in r2.fala
    acoes = [x["action"] for x in cerebro.desktop.chamadas]
    assert acoes == ["open_app", "ui_focus", "hotkey"]
    assert cerebro.desktop.chamadas[0]["payload"] == {"name": "chrome"}


def test_continuacao_de_contexto(cerebro):
    r1, r2 = falar(cerebro, "o que eu tenho amanhã", "e na sexta?")
    assert r2.intencao == "agenda.consultar" and r2.fonte == "contexto"
    assert cerebro.desktop.chamadas[-1]["payload"]["url"].endswith("/2026/11/20")


def test_confirmacao_para_acao_externa(cerebro):
    r = cerebro.processar("posta um aviso na turma 2101 dizendo que a prova foi adiada")
    assert r.estado == "confirmacao" and r.aguardando
    assert not any(x["ferramenta"] == "jair_os_classroom_publicar" for x in cerebro.jos.chamadas)
    r2 = cerebro.processar("pode sim")
    assert r2.estado == "ok"
    pub = [x for x in cerebro.jos.chamadas if x["ferramenta"] == "jair_os_classroom_publicar"][0]
    assert pub["argumentos"]["confirmar"] is True and pub["argumentos"]["turma_id"] == "c2101"
    assert pub["argumentos"]["texto"] == "A prova foi adiada"


def test_negar_cancela(cerebro):
    cerebro.processar("lança a nota 7,5 do Rafael na AV1 da 2101")
    r = cerebro.processar("não")
    assert r.estado == "cancelado"
    assert cerebro.desktop.chamadas == []


def test_pergunta_slot_faltando(cerebro):
    r = cerebro.processar("me lembra de pagar o boleto")
    assert r.estado == "pergunta" and "Quando" in r.fala
    r2 = cerebro.processar("sexta às 9")
    assert r2.intencao == "lembrete.criar" and r2.estado == "ok"
    pend = cerebro.lembretes.pendentes()
    assert pend and pend[0]["quando"] == "2026-11-20T09:00" and pend[0]["texto"] == "pagar o boleto"
    tarefa = [x for x in cerebro.jos.chamadas if x["ferramenta"] == "jair_os_criar_tarefa"][-1]
    assert tarefa["argumentos"]["titulo"] == "Lembrete: pagar o boleto"


def test_comando_composto(cerebro):
    r = cerebro.processar("abre o youtube e pesquisa relatividade geral")
    assert r.estado == "ok"
    assert cerebro.desktop.chamadas[-1]["payload"]["url"] == "https://www.youtube.com/results?search_query=relatividade+geral"


def test_composto_com_depois(cerebro):
    r = cerebro.processar("abre o finder e depois aumenta o volume")
    assert r.estado == "ok"
    assert [x["action"] for x in cerebro.desktop.chamadas] == ["open_app", "system_volume"]


def test_tarefa_com_prazo_e_prioridade(cerebro):
    cerebro.processar("cria uma tarefa urgente de corrigir as provas da 2101 pra sexta")
    t = [x for x in cerebro.jos.chamadas if x["ferramenta"] == "jair_os_criar_tarefa"][-1]["argumentos"]
    assert t["titulo"].startswith("Corrigir as provas da 2101")
    assert t["prazo"].startswith("2026-11-20") and t["prioridade"] == 4


def test_material_oferece_execucao_paga(cerebro):
    r = cerebro.processar("cria uma lista de exercícios de leis de newton nível uerj")
    assert r.estado == "confirmacao" and "créditos" in r.fala
    assert [x["ferramenta"] for x in cerebro.jos.chamadas] == ["jair_os_rotear"]
    cerebro.processar("pode")
    assert cerebro.jos.chamadas[-1]["ferramenta"] == "jair_os_executar"


def test_aprender_apelido(cerebro):
    r = cerebro.processar("quando eu falar modo aula quero dizer abre o classroom")
    assert r.intencao == "sistema.aprender" and r.estado == "ok"
    r2 = cerebro.processar("modo aula")
    assert r2.intencao == "site.abrir"
    assert cerebro.desktop.chamadas[-1]["payload"]["url"] == "https://classroom.google.com"
    assert "modo aula" in cerebro.lexico.caminho_aprendido.read_text(encoding="utf-8")


def test_nao_entendi_e_registro(cerebro):
    r = cerebro.processar("ontem eu fui no mercado e estava tudo caro")
    assert r.estado == "nao_entendi"
    assert cerebro.desktop.chamadas == [] and cerebro.jos.chamadas == []
    assert cerebro.config.arquivo_nao_entendidos.exists()


def test_so_palavra_de_despertar(cerebro):
    r = cerebro.processar("Jarvis")
    assert r.estado == "escutando" and r.aguardando


def test_repetir(cerebro):
    falar(cerebro, "que horas são")
    r = cerebro.processar("repete")
    assert r.fala == "Agora são 10h."


def test_briefing(cerebro):
    r = cerebro.processar("bom dia")
    assert r.intencao == "briefing.diario"
    assert r.fala.startswith("Bom dia, Jair! Hoje é quarta-feira, 18 de novembro de 2026.")


def test_calculos(cerebro):
    assert cerebro.processar("calcula a média de 7, 8 e 9").fala == "A média de 7, 8, 9 é 8."
    assert cerebro.processar("quanto é 15 por cento de 80").fala == "Dá 12."
    r = cerebro.processar("quanto preciso tirar para ficar com média 6 se tirei 4 e 5")
    assert "precisa tirar 9" in r.fala


def test_disco(cerebro):
    assert cerebro.processar("qual o espaço livre no disco").fala == "Você tem 120 GB livres de 500 GB no disco."


def test_auditoria(cerebro, tmp_path):
    cerebro.auditoria.arquivo = tmp_path / "aud.jsonl"
    cerebro.processar("abre o chrome")
    assert '"intencao": "app.abrir"' in (tmp_path / "aud.jsonl").read_text(encoding="utf-8")


def test_politica():
    from cerebro.dialogo.politica import Politica
    p = Politica()
    assert p.avaliar(0, 0.9, "gramatica").acao == "executar"
    assert p.avaliar(3, 0.99, "gramatica").acao == "confirmar"
    assert p.avaliar(2, 0.7, "classificador").acao == "confirmar"
    assert p.avaliar(1, 0.9, "llm").acao == "confirmar"
    assert p.avaliar(4, 0.99, "gramatica").acao == "bloquear"
    assert Politica(permitir_r4=True).avaliar(4, 0.99, "gramatica").acao == "confirmar_forte"
    assert p.avaliar(0, 0.3, "classificador").acao == "esclarecer"
