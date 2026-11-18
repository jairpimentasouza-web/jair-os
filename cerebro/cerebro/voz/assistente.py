"""Laço de voz do Jarvis: dormindo → acordado → ouvindo → pensando → falando → (janela de conversa).

Dois modos de despertar:

* ``oww`` — openWakeWord ("hey jarvis") ouvindo continuamente; leve e preciso.
* ``transcricao`` — sem modelo de despertar: cada fala curta é transcrita e só
  vira comando se começar com "Jarvis"/"Jair" (útil para testar e para nomes
  personalizados de despertar). Permite falar tudo de uma vez:
  "Jarvis, abre o Chrome".

Depois de responder, o Jarvis fica alguns segundos ouvindo sem precisar do nome
(conversa contínua) — e dá para interrompê-lo dizendo o nome enquanto ele fala.
"""
from __future__ import annotations

import platform
import shutil
import subprocess
import threading
import time
from typing import Callable, Optional

import numpy as np

from .ouvido import TAXA, BufferCircular, DetectorFala

SOM_ESCUTA = "/System/Library/Sounds/Tink.aiff"
SOM_FIM = "/System/Library/Sounds/Pop.aiff"


def _bip(arquivo: str) -> None:
    if platform.system() == "Darwin" and shutil.which("afplay"):
        subprocess.Popen(["afplay", arquivo], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


class AssistenteVoz:
    def __init__(self, cerebro, transcritor, voz, despertador=None, janela_conversa_s: float = 7.0,
                 sessao: str = "voz", registro: Optional[Callable[[str], None]] = None, bips: bool = True,
                 transcritor_rapido=None) -> None:
        self.cerebro = cerebro
        self.stt = transcritor
        self.stt_rapido = transcritor_rapido  # só procura "Jarvis/Jair" nos primeiros segundos
        self.voz = voz
        self.despertador = despertador
        self.janela = janela_conversa_s
        self.sessao = sessao
        self.log = registro or (lambda m: print(m, flush=True))
        self.bips = bips
        self._parar = threading.Event()
        self._fala_lock = threading.Lock()

    # ----------------------------------------------------------- utilidades
    def falar(self, texto: str, bloquear: bool = False) -> None:
        if not texto:
            return
        self.log("🤖 %s" % texto)
        with self._fala_lock:
            self.voz.falar(texto, bloquear=bloquear)

    def processar_audio(self, audio: np.ndarray, exigir_despertar: bool = False):
        """Transcreve e entrega ao cérebro. Retorna (transcrição, resposta | None).

        Com ``exigir_despertar`` e um transcritor rápido, primeiro confere se os ~3 s
        iniciais contêm "Jarvis/Jair" (barato); só então transcreve tudo com o modelo bom.
        """
        if exigir_despertar and self.stt_rapido is not None:
            previa = self.stt_rapido.transcrever(audio[: int(TAXA * 3.0)], feixe=1)
            if previa.vazia or not self.cerebro.norm.tem_despertar(previa.texto):
                return previa, None
            exigir_despertar = False
        t = self.stt.transcrever(audio)
        if t.vazia or self.cerebro.norm.eh_alucinacao(t.texto) or t.sem_fala > 0.85:
            return t, None
        self.log("🎙  %s  (conf. %.2f)" % (t.texto, t.confianca))
        if exigir_despertar and not self.cerebro.norm.tem_despertar(t.texto):
            return t, None
        resp = self.cerebro.processar(t.texto, sessao=self.sessao, ao_iniciar=lambda f: self.falar(f))
        return t, resp

    def parar(self) -> None:
        self._parar.set()

    # ------------------------------------------------------------------ laço
    def rodar(self, microfone) -> None:
        modo = "oww" if self.despertador is not None else "transcricao"
        self.log("Jarvis pronto (despertar: %s). Diga \"Jarvis\"…" % ("hey jarvis" if modo == "oww" else "Jarvis/Jair"))
        pre = BufferCircular(700)
        ate_conversa = 0.0
        detector: Optional[DetectorFala] = None
        exigir = modo == "transcricao"
        with microfone as mic:
            for quadro in mic.quadros():
                if self._parar.is_set():
                    break
                agora = time.time()
                falando = self.voz.falando
                acordou = False
                if self.despertador is not None:
                    acordou = self.despertador.acordou(quadro)
                if acordou and falando:
                    self.voz.parar()  # interrupção ("barge-in")
                    falando = False
                if detector is None:
                    pre.adicionar(quadro)
                    em_conversa = agora < ate_conversa
                    if acordou:
                        _bip(SOM_ESCUTA) if self.bips else None
                        detector = DetectorFala(silencio_fim_ms=750, espera_inicio_s=5.0)
                        exigir = False
                        if self.despertador is not None:
                            self.despertador.reiniciar()
                        continue
                    if falando:
                        continue  # não ouvir a própria voz
                    if em_conversa or modo == "transcricao":
                        d = DetectorFala(silencio_fim_ms=700, espera_inicio_s=0.25)
                        if d.processar(quadro).falando:
                            detector = DetectorFala(silencio_fim_ms=700, espera_inicio_s=5.0)
                            for q in pre.tudo():
                                detector.processar(q)
                            exigir = modo == "transcricao" and not em_conversa
                    continue
                estado = detector.processar(quadro)
                if not estado.terminou:
                    continue
                audio = detector.resultado()
                detector = None
                pre.limpar()
                if len(audio) < TAXA * 0.3:
                    continue
                _, resp = self.processar_audio(audio, exigir_despertar=exigir)
                if resp is None:
                    continue
                if resp.fala and resp.fala != resp.fala_inicial:
                    self.falar(resp.fala)
                elif resp.fala and not resp.execucao:
                    self.falar(resp.fala)
                mic.esvaziar()
                if resp.dormir:
                    ate_conversa = 0.0
                else:
                    ate_conversa = time.time() + self.janela + (4.0 if resp.aguardando else 0.0)
