#!/usr/bin/env python3
"""Teste de voz ponta a ponta: fala sintética → Whisper → Cérebro.

Gera cada comando com uma voz (``say`` no macOS ou Piper), transcreve com o
faster-whisper enviesado pelo léxico e verifica a intenção entendida.
Também mede a palavra de despertar (openWakeWord "hey_jarvis") quando disponível.

    python scripts/teste_voz_ponta_a_ponta.py --tts say --modelo small
    python scripts/teste_voz_ponta_a_ponta.py --tts piper --piper ~/modelos/pt_BR-faber-medium.onnx

Fala sintética é mais limpa que a sua voz no ambiente real: trate o número como
limite superior e confira com gravações suas (``--wav pasta/``).
"""
from __future__ import annotations

import argparse
import os
import platform
import subprocess
import sys
import tempfile
import time
import wave
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from cerebro.avaliacao import LOCAL_EXEMPLO  # noqa: E402
from cerebro.lexico import Lexico  # noqa: E402
from cerebro.nlu.motor import Motor  # noqa: E402
from cerebro.texto.normalizar import Normalizador  # noqa: E402
from cerebro.voz.stt import TranscritorWhisper  # noqa: E402

COMANDOS = [
    ("Jarvis, abre o Google Chrome.", "app.abrir"),
    ("Jarvis, abre o Finder.", "app.abrir"),
    ("Abre o WhatsApp.", "app.abrir"),
    ("Fecha o Word.", "app.fechar"),
    ("Coloca o volume em trinta.", "volume.definir"),
    ("Aumenta o volume.", "volume.aumentar"),
    ("Tira o som.", "volume.mudo"),
    ("Abre os ajustes do Bluetooth.", "ajustes.abrir"),
    ("Tira um print da tela.", "tela.capturar"),
    ("Qual é o espaço livre no disco?", "sistema.recurso"),
    ("O computador está lento.", "sistema.diagnostico"),
    ("Abre a pasta de downloads.", "pasta.abrir"),
    ("Abre o YouTube.", "site.abrir"),
    ("Entra no Google Classroom.", "site.abrir"),
    ("Abre o Google Drive.", "site.abrir"),
    ("Pesquisa no YouTube aula de cinemática.", "site.pesquisar"),
    ("Pesquisa sobre buracos negros.", "web.pesquisar"),
    ("Toca Alice in Chains.", "youtube.tocar"),
    ("Quero ouvir Legião Urbana.", "youtube.tocar"),
    ("O que é entropia?", "conhecimento.perguntar"),
    ("O que eu tenho amanhã?", "agenda.consultar"),
    ("Marca reunião com a coordenação sexta às três da tarde.", "agenda.criar"),
    ("Me lembra amanhã às oito de mandar o boletim.", "lembrete.criar"),
    ("Cria uma tarefa de corrigir as provas.", "tarefa.criar"),
    ("Mostra minhas tarefas.", "tarefa.listar"),
    ("Lembra que a reunião pedagógica mudou para quinta.", "memoria.salvar"),
    ("Acabou a aula do Rafael, ele melhorou em vetores.", "aula.registrar"),
    ("Como está a Beatriz?", "aluno.consultar"),
    ("Cria uma lista de exercícios de termodinâmica.", "material.produzir"),
    ("Bom dia, Jarvis.", "briefing.diario"),
    ("Gastei cinquenta reais de gasolina.", "financeiro.registrar"),
    ("Calcula a média de sete, oito e nove.", "calculo.media"),
    ("Quanto é vinte e cinco vezes quatro?", "calculo.conta"),
    ("Posta um aviso na turma 2101 dizendo que a prova foi adiada.", "classroom.publicar"),
    ("Que horas são?", "conversa.hora"),
    ("Que dia é hoje?", "conversa.data"),
    ("Obrigado, Jarvis.", "conversa.agradecimento"),
    ("O que você sabe fazer?", "conversa.ajuda"),
    ("Status do JOS.", "sistema.status"),
    ("Abre o sistema do Horizonte.", "escola.abrir"),
]


def _ler_wav(caminho: str) -> np.ndarray:
    with wave.open(caminho, "rb") as w:
        taxa = w.getframerate()
        dados = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
        if w.getnchannels() > 1:
            dados = dados.reshape(-1, w.getnchannels()).mean(axis=1).astype(np.int16)
    if taxa != 16000:
        from scipy.signal import resample_poly
        from math import gcd
        g = gcd(16000, taxa)
        dados = resample_poly(dados.astype(np.float32), 16000 // g, taxa // g).astype(np.int16)
    return dados


def sintetizar(texto: str, tts: str, piper_modelo: str, voz_say: str) -> np.ndarray:
    pasta = tempfile.mkdtemp(prefix="jarvis-tts-")
    wav = os.path.join(pasta, "a.wav")
    if tts == "say":
        aiff = os.path.join(pasta, "a.aiff")
        subprocess.run(["say", "-v", voz_say, "-o", aiff, texto], check=True)
        subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@16000", "-c", "1", aiff, wav], check=True)
    else:
        from piper import PiperVoice
        if not hasattr(sintetizar, "_voz"):
            sintetizar._voz = PiperVoice.load(piper_modelo)
        with wave.open(wav, "wb") as w:
            sintetizar._voz.synthesize_wav(texto, w)
    return _ler_wav(wav)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tts", choices=["say", "piper"], default="say" if platform.system() == "Darwin" else "piper")
    ap.add_argument("--piper", default=os.path.expanduser("~/modelos/pt_BR-faber-medium.onnx"))
    ap.add_argument("--voz-say", default="Luciana")
    ap.add_argument("--modelo", default="small")
    ap.add_argument("--local", default=str(LOCAL_EXEMPLO), help="léxico local (padrão: nomes fictícios de exemplo)")
    ap.add_argument("--sem-vies", action="store_true", help="desliga hotwords/prompt do léxico (comparação)")
    args = ap.parse_args()

    lx = Lexico.carregar(args.local)
    norm = Normalizador(lx)
    motor = Motor(lx, norm)
    termos = [] if args.sem_vies else lx.hotwords()
    t0 = time.time()
    stt = TranscritorWhisper(args.modelo, termos=termos)
    print("Whisper %s carregado em %.1fs (viés do léxico: %s)" % (args.modelo, time.time() - t0, "não" if args.sem_vies else "sim"))
    acertos = 0
    tempos = []
    for texto, esperado in COMANDOS:
        audio = sintetizar(texto, args.tts, args.piper, args.voz_say)
        t = time.time()
        tr = stt.transcrever(audio)
        dt_stt = time.time() - t
        t = time.time()
        hips = motor.entender(norm.normalizar(tr.texto), None, None, usar_llm=False)
        dt_nlu = time.time() - t
        obtido = hips[0].intencao if hips and hips[0].confianca >= 0.5 else None
        ok = obtido == esperado
        acertos += ok
        tempos.append((len(audio) / 16000, dt_stt, dt_nlu))
        print("%s %-58s → %-50s %s" % ("✓" if ok else "✗", texto[:58], tr.texto[:50], "" if ok else "(%s ≠ %s)" % (obtido, esperado)))
    dur = sum(x[0] for x in tempos)
    stt_total = sum(x[1] for x in tempos)
    print("\nAcerto ponta a ponta: %d/%d = %.1f%%" % (acertos, len(COMANDOS), 100.0 * acertos / len(COMANDOS)))
    print("Áudio: %.1fs · STT: %.1fs (fator de tempo real %.2f) · NLU médio: %.1f ms"
          % (dur, stt_total, stt_total / max(dur, 1e-6), 1000 * sum(x[2] for x in tempos) / len(tempos)))

    try:
        from cerebro.voz.ouvido import QUADRO, DespertadorOWW
        d = DespertadorOWW("hey_jarvis", 0.5)
        print("\nPalavra de despertar (openWakeWord hey_jarvis, limiar 0,5):")
        for frase in ["Hey Jarvis.", "Ei, Jarvis.", "Jarvis.", "Abre o Chrome.", "Bom dia a todos."]:
            a = sintetizar(frase, args.tts, args.piper, args.voz_say)
            a = np.concatenate([np.zeros(16000, np.int16), a, np.zeros(8000, np.int16)])
            d.reiniciar()
            pico = max(d.ouvir(a[i:i + QUADRO]) for i in range(0, len(a) - QUADRO, QUADRO))
            print("  %-18s pico %.3f %s" % (frase, pico, "→ acorda" if pico >= 0.5 else ""))
    except Exception as e:  # noqa: BLE001
        print("\n(openWakeWord indisponível: %s)" % e)


if __name__ == "__main__":
    main()
