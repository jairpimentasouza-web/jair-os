"""Ouvido do Jarvis: microfone, palavra de despertar e detecção de fim de fala.

* ``Microfone`` — captura 16 kHz mono em quadros de 80 ms (sounddevice/PortAudio).
* ``DespertadorOWW`` — openWakeWord (modelo "hey_jarvis", roda na CPU, ~1% de uso).
* ``DetectorFala`` — fim de fala por energia com piso de ruído adaptativo
  (sem dependências; o Silero VAD do faster-whisper limpa o resto na transcrição).
"""
from __future__ import annotations

import collections
import queue
from dataclasses import dataclass
from typing import Deque, Iterator, List

import numpy as np

TAXA = 16000
QUADRO = 1280  # 80 ms — o tamanho que o openWakeWord espera


class Microfone:
    def __init__(self, dispositivo=None, taxa: int = TAXA, quadro: int = QUADRO) -> None:
        import sounddevice as sd  # dependência opcional

        self._sd = sd
        self.taxa = taxa
        self.quadro = quadro
        self.fila: "queue.Queue[np.ndarray]" = queue.Queue(maxsize=400)
        self._stream = sd.InputStream(samplerate=taxa, channels=1, dtype="int16", blocksize=quadro,
                                      device=dispositivo, callback=self._cb)
        self.ativo = False

    def _cb(self, dados, _frames, _tempo, _status) -> None:
        try:
            self.fila.put_nowait(dados[:, 0].copy())
        except queue.Full:
            pass

    def __enter__(self) -> "Microfone":
        self._stream.start()
        self.ativo = True
        return self

    def __exit__(self, *exc) -> None:
        self.ativo = False
        self._stream.stop()
        self._stream.close()

    def quadros(self) -> Iterator[np.ndarray]:
        while self.ativo:
            try:
                yield self.fila.get(timeout=0.5)
            except queue.Empty:
                continue

    def esvaziar(self) -> None:
        while not self.fila.empty():
            try:
                self.fila.get_nowait()
            except queue.Empty:
                break


class DespertadorOWW:
    def __init__(self, modelo: str = "hey_jarvis", limiar: float = 0.5) -> None:
        import openwakeword
        from openwakeword.model import Model

        try:
            openwakeword.utils.download_models([modelo])
        except Exception:  # noqa: BLE001 - sem internet: usa o que já estiver baixado
            pass
        self.modelo = Model(wakeword_models=[modelo], inference_framework="onnx")
        self.limiar = limiar

    def ouvir(self, quadro: np.ndarray) -> float:
        notas = self.modelo.predict(quadro.astype(np.int16))
        return float(max(notas.values())) if notas else 0.0

    def acordou(self, quadro: np.ndarray) -> bool:
        return self.ouvir(quadro) >= self.limiar

    def reiniciar(self) -> None:
        try:
            self.modelo.reset()
        except Exception:  # noqa: BLE001
            pass


@dataclass
class EstadoFala:
    falando: bool = False
    terminou: bool = False
    estourou: bool = False


class DetectorFala:
    """Segmenta uma fala: começa quando a energia passa do piso de ruído, termina após silêncio."""

    def __init__(self, taxa: int = TAXA, silencio_fim_ms: int = 800, max_s: float = 15.0,
                 min_fala_ms: int = 240, fator: float = 2.6, minimo_rms: float = 220.0,
                 espera_inicio_s: float = 6.0) -> None:
        self.taxa = taxa
        self.silencio_fim_ms = silencio_fim_ms
        self.max_s = max_s
        self.min_fala_ms = min_fala_ms
        self.fator = fator
        self.minimo_rms = minimo_rms
        self.espera_inicio_s = espera_inicio_s
        self.piso = minimo_rms / fator
        self.reiniciar()

    def reiniciar(self) -> None:
        self.audio: List[np.ndarray] = []
        self.ms_fala = 0.0
        self.ms_silencio = 0.0
        self.ms_total = 0.0
        self.comecou = False

    @staticmethod
    def rms(quadro: np.ndarray) -> float:
        q = quadro.astype(np.float32)
        return float(np.sqrt(np.mean(q * q))) if q.size else 0.0

    def calibrar(self, quadro: np.ndarray) -> None:
        self.piso = 0.95 * self.piso + 0.05 * max(self.rms(quadro), 1.0)

    def processar(self, quadro: np.ndarray) -> EstadoFala:
        ms = 1000.0 * len(quadro) / self.taxa
        self.ms_total += ms
        energia = self.rms(quadro)
        voz = energia > max(self.piso * self.fator, self.minimo_rms)
        if self.comecou or voz:
            self.audio.append(quadro)
        if voz:
            self.comecou = True
            self.ms_fala += ms
            self.ms_silencio = 0.0
        else:
            if self.comecou:
                self.ms_silencio += ms
            else:
                self.calibrar(quadro)
        e = EstadoFala(falando=voz)
        if self.comecou and self.ms_silencio >= self.silencio_fim_ms and self.ms_fala >= self.min_fala_ms:
            e.terminou = True
        elif self.ms_total >= self.max_s * 1000:
            e.estourou = True
            e.terminou = True
        elif not self.comecou and self.ms_total >= self.espera_inicio_s * 1000:
            e.estourou = True
            e.terminou = True
        return e

    def resultado(self) -> np.ndarray:
        return np.concatenate(self.audio) if self.audio else np.zeros(0, dtype=np.int16)


class BufferCircular:
    """Guarda os últimos N ms de áudio (pré-rolagem: não perde o começo da frase)."""

    def __init__(self, ms: int = 700, taxa: int = TAXA, quadro: int = QUADRO) -> None:
        self.quadros: Deque[np.ndarray] = collections.deque(maxlen=max(1, int(ms * taxa / 1000 / quadro)))

    def adicionar(self, q: np.ndarray) -> None:
        self.quadros.append(q)

    def tudo(self) -> List[np.ndarray]:
        return list(self.quadros)

    def limpar(self) -> None:
        self.quadros.clear()
