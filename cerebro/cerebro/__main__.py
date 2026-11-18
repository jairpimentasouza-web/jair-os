"""Linha de comando do Cérebro JOS (Jarvis).

    python -m cerebro                      # conversa por texto (REPL)
    python -m cerebro entender "abre o chrome"
    python -m cerebro dizer "abre o chrome" [--executar]
    python -m cerebro ouvir                # voz contínua: "Jarvis, ..."
    python -m cerebro servir               # API HTTP local (127.0.0.1:8767)
    python -m cerebro avaliar              # conjunto-ouro e conjunto cego
    python -m cerebro lexico               # tamanho da biblioteca de palavras
    python -m cerebro habilidades          # o que o Jarvis sabe fazer
    python -m cerebro aprender "modo aula" "abre o classroom"
    python -m cerebro calibrar             # mede sua voz dizendo "Ei Jarvis"
    python -m cerebro nao-entendidos       # frases que ele não entendeu (para ensinar)
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def _cerebro(args, **kw):
    from .config import Config
    from .nucleo import Cerebro

    sobre = {}
    if getattr(args, "simulado", False):
        sobre.update(modo_desktop="simulado", modo_jos="simulado")
    if getattr(args, "sem_llm", False):
        sobre["usar_llm"] = False
    cfg = Config.carregar(getattr(args, "config", None), **sobre)
    return Cerebro(cfg, **kw)


def cmd_repl(args) -> None:
    c = _cerebro(args)
    print("Cérebro JOS — digite como se falasse com o Jarvis (Ctrl+D para sair).")
    print("Executores: %s" % json.dumps(c.estatisticas()["executores"], ensure_ascii=False))
    while True:
        try:
            linha = input("você › ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not linha:
            continue
        r = c.processar(linha, sessao="terminal", executar=not args.seco)
        extra = " [%s · %s %.2f · %s]" % (r.estado, r.intencao or "—", r.confianca, r.fonte or "—") if args.detalhes else ""
        print("jarvis › %s%s" % (r.fala, extra))


def cmd_entender(args) -> None:
    c = _cerebro(args, llm=None)
    print(json.dumps(c.entender(" ".join(args.frase)), ensure_ascii=False, indent=2, default=str))


def cmd_dizer(args) -> None:
    c = _cerebro(args)
    r = c.processar(" ".join(args.frase), executar=args.executar)
    print(json.dumps(r.json(), ensure_ascii=False, indent=2, default=str))


def cmd_ouvir(args) -> None:
    from .voz.assistente import AssistenteVoz
    from .voz.ouvido import DespertadorOWW, Microfone
    from .voz.stt import TranscritorWhisper
    from .voz.tts import criar_voz

    c = _cerebro(args)
    cfg = c.config
    print("Carregando reconhecimento de voz (Whisper %s)…" % cfg.modelo_stt, flush=True)
    stt = TranscritorWhisper(cfg.modelo_stt, computacao=cfg.computacao_stt, termos=c.lexico.hotwords())
    voz = criar_voz(cfg.voz_tts, cfg.voz_say, cfg.velocidade_fala, cfg.modelo_piper)
    despertador = None
    rapido = None
    modo = "oww" if args.oww else ("transcricao" if args.sem_oww else cfg.modo_despertar)
    if modo == "oww":
        try:
            despertador = DespertadorOWW(cfg.modelo_despertar, cfg.limiar_despertar)
        except Exception as e:  # noqa: BLE001
            print("openWakeWord indisponível (%s); usando despertar por transcrição." % e)
    if despertador is None and cfg.modelo_stt_despertar:
        rapido = TranscritorWhisper(cfg.modelo_stt_despertar, computacao=cfg.computacao_stt,
                                    termos=["Jarvis", "Jair"] + [p.title() for p in cfg.palavras_despertar])
    assistente = AssistenteVoz(c, stt, voz, despertador, cfg.janela_conversa_s, transcritor_rapido=rapido)
    c.iniciar_lembretes(lambda item: assistente.falar("Lembrete: %s" % item["texto"]))
    try:
        assistente.rodar(Microfone(args.microfone))
    except KeyboardInterrupt:
        print("\nAté logo.")


def cmd_servir(args) -> None:
    import uvicorn

    from .api import criar_app

    c = _cerebro(args)
    app = criar_app(c, com_voz=not args.sem_voz)
    uvicorn.run(app, host=args.host or c.config.host, port=args.porta or c.config.porta, log_level="warning")


def cmd_avaliar(args) -> None:
    from . import avaliacao
    from .lexico import Lexico
    from .nlu.motor import Motor
    from .texto.normalizar import Normalizador

    lx = Lexico.carregar(avaliacao.LOCAL_EXEMPLO)
    n = Normalizador(lx)
    m = Motor(lx, n)
    pasta = Path(avaliacao.OURO).parent
    for nome in ("frases_ouro.yaml", "frases_cegas.yaml"):
        arq = pasta / nome
        if arq.exists():
            print("\n=== %s" % nome)
            avaliacao.imprimir(avaliacao.avaliar(m, n, arq))


def cmd_lexico(args) -> None:
    c = _cerebro(args, llm=None)
    print(json.dumps(c.estatisticas(), ensure_ascii=False, indent=2))


def cmd_habilidades(args) -> None:
    c = _cerebro(args, llm=None)
    por_dom = {}
    for h in c.motor.habilidades.values():
        por_dom.setdefault(h.dominio, []).append(h)
    for dom, hs in por_dom.items():
        print("\n%s" % dom.upper())
        for h in hs:
            ex = h.exemplos[0] if h.exemplos else ""
            print("  [%s] %-24s %s%s" % (h.risco, h.id, h.descricao, ('  — ex.: "%s"' % ex) if ex else ""))


def cmd_aprender(args) -> None:
    c = _cerebro(args, llm=None)
    c.lexico.aprender_apelido(args.frase, args.significado)
    print('Aprendido: "%s" → "%s" (salvo em %s)' % (args.frase, args.significado, c.lexico.caminho_aprendido))


def cmd_nao_entendidos(args) -> None:
    from .config import Config

    arq = Config.carregar(getattr(args, "config", None)).arquivo_nao_entendidos
    if not arq.exists():
        print("Nenhuma frase registrada ainda.")
        return
    linhas = arq.read_text(encoding="utf-8").strip().splitlines()[-args.n:]
    for l in linhas:
        d = json.loads(l)
        print("%s  %s" % (d.get("em", ""), d.get("original", "")))
    print('\nEnsine com: python -m cerebro aprender "frase" "o que ela significa"')


def cmd_calibrar(args) -> None:
    import time

    import numpy as np
    import yaml

    from .config import Config
    from .voz.ouvido import DespertadorOWW, Microfone

    cfg = Config.carregar(getattr(args, "config", None))
    d = DespertadorOWW(cfg.modelo_despertar or "hey_jarvis", 0.0)
    picos = []
    with Microfone(args.microfone) as mic:
        for i in range(args.vezes):
            input("(%d/%d) Pressione Enter e diga \"Ei Jarvis\"… " % (i + 1, args.vezes))
            mic.esvaziar()
            d.reiniciar()
            fim = time.time() + 2.5
            pico = 0.0
            for q in mic.quadros():
                pico = max(pico, d.ouvir(q))
                if time.time() > fim:
                    break
            print("   pico: %.3f" % pico)
            picos.append(pico)
        input("Agora fale uma frase qualquer SEM dizer Jarvis (Enter para começar)… ")
        mic.esvaziar()
        d.reiniciar()
        fim = time.time() + 4
        ruido = 0.0
        for q in mic.quadros():
            ruido = max(ruido, d.ouvir(q))
            if time.time() > fim:
                break
    limiar = float(np.clip(min(picos) * 0.7, ruido + 0.05, 0.9))
    print("\nPicos com o nome: %s · sem o nome: %.3f → limiar sugerido %.2f" % (", ".join("%.2f" % p for p in picos), ruido, limiar))
    arq = cfg.pasta / "config.yaml"
    dados = yaml.safe_load(arq.read_text(encoding="utf-8")) if arq.exists() else {}
    dados = dados or {}
    dados["limiar_despertar"] = round(limiar, 2)
    arq.parent.mkdir(parents=True, exist_ok=True)
    arq.write_text(yaml.safe_dump(dados, allow_unicode=True, sort_keys=True), encoding="utf-8")
    print("Salvo em %s" % arq)
    if min(picos) < 0.2:
        print("O modelo quase não reconhece seu \"Ei Jarvis\". Mantenha modo_despertar: transcricao (o padrão).")
    else:
        dados["modo_despertar"] = "oww"
        arq.write_text(yaml.safe_dump(dados, allow_unicode=True, sort_keys=True), encoding="utf-8")
        print("openWakeWord ativado (modo_despertar: oww).")


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(prog="cerebro", description="Cérebro JOS — o Jarvis do Jair OS")
    ap.add_argument("--config", help="arquivo de configuração (padrão ~/.jos-cerebro/config.yaml)")
    ap.add_argument("--simulado", action="store_true", help="não toca no computador nem no JOS (modo seco)")
    ap.add_argument("--sem-llm", action="store_true", help="não usa o modelo local do Ollama")
    sub = ap.add_subparsers(dest="cmd")

    p = sub.add_parser("conversar", help="conversa por texto")
    p.add_argument("--seco", action="store_true", help="entende e planeja sem executar")
    p.add_argument("--detalhes", action="store_true")
    p.set_defaults(func=cmd_repl)
    p = sub.add_parser("entender", help="mostra como uma frase é entendida")
    p.add_argument("frase", nargs="+")
    p.set_defaults(func=cmd_entender)
    p = sub.add_parser("dizer", help="processa uma frase (sem executar, a não ser com --executar)")
    p.add_argument("frase", nargs="+")
    p.add_argument("--executar", action="store_true")
    p.set_defaults(func=cmd_dizer)
    p = sub.add_parser("ouvir", help="assistente de voz contínuo")
    p.add_argument("--microfone", default=None, help="índice ou nome do microfone (sounddevice)")
    p.add_argument("--sem-oww", action="store_true", help="força o despertar por transcrição")
    p.add_argument("--oww", action="store_true", help="força o openWakeWord (\"hey jarvis\"); calibre antes")
    p.set_defaults(func=cmd_ouvir)
    p = sub.add_parser("servir", help="API HTTP local")
    p.add_argument("--host")
    p.add_argument("--porta", type=int)
    p.add_argument("--sem-voz", action="store_true", help="não carrega o Whisper para /v1/audio")
    p.set_defaults(func=cmd_servir)
    sub.add_parser("avaliar", help="roda os conjuntos de avaliação").set_defaults(func=cmd_avaliar)
    sub.add_parser("lexico", help="estatísticas da biblioteca de palavras").set_defaults(func=cmd_lexico)
    sub.add_parser("habilidades", help="lista as habilidades").set_defaults(func=cmd_habilidades)
    p = sub.add_parser("aprender", help="ensina um apelido")
    p.add_argument("frase")
    p.add_argument("significado")
    p.set_defaults(func=cmd_aprender)
    p = sub.add_parser("nao-entendidos", help="últimas frases não entendidas")
    p.add_argument("-n", type=int, default=30)
    p.set_defaults(func=cmd_nao_entendidos)
    p = sub.add_parser("calibrar", help="calibra o limiar da palavra de despertar com a sua voz")
    p.add_argument("--vezes", type=int, default=3)
    p.add_argument("--microfone", default=None)
    p.set_defaults(func=cmd_calibrar)

    args = ap.parse_args(argv)
    if not getattr(args, "func", None):
        args.seco = False
        args.detalhes = False
        cmd_repl(args)
        return
    args.func(args)


if __name__ == "__main__":
    main(sys.argv[1:])
