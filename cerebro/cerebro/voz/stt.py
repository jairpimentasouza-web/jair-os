"""Transcrição local com faster-whisper (CTranslate2), enviesada pelo léxico.

O viés é o que dá exatidão com as *suas* palavras: os nomes de alunos, escolas,
apps e sistemas entram como ``hotwords`` e num ``initial_prompt`` curto, então o
Whisper prefere "Classroom" a "class room", "ActiveSoft" a "ativo soft".
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Union

import numpy as np

TAXA = 16000


@dataclass
class Transcricao:
    texto: str
    confianca: float          # média de exp(avg_logprob) dos segmentos (0..1)
    duracao: float            # segundos de áudio
    idioma: str = "pt"
    sem_fala: float = 0.0     # maior no_speech_prob

    @property
    def vazia(self) -> bool:
        return not self.texto.strip()


class TranscritorWhisper:
    def __init__(self, modelo: str = "small", dispositivo: str = "cpu", computacao: str = "int8",
                 threads: int = 0, termos: Iterable[str] = (), idioma: str = "pt") -> None:
        from faster_whisper import WhisperModel  # importação tardia: dependência opcional

        self.idioma = idioma
        self.modelo = WhisperModel(modelo, device=dispositivo, compute_type=computacao, cpu_threads=threads, num_workers=1)
        self.definir_termos(termos)

    def definir_termos(self, termos: Iterable[str]) -> None:
        lista: List[str] = []
        for t in termos:
            t = str(t).strip()
            if t and t not in lista:
                lista.append(t)
        self.hotwords = ", ".join(lista[:60]) or None
        self.prompt = ("Comandos de voz em português para o Jarvis, assistente do Jair OS. "
                       "Termos: " + ", ".join(lista[:25]) + ".") if lista else None

    def transcrever(self, audio: Union[np.ndarray, str], feixe: int = 5) -> Transcricao:
        if isinstance(audio, np.ndarray):
            inteiro = np.issubdtype(audio.dtype, np.integer)
            dados = audio.astype(np.float32).reshape(-1)
            if inteiro or (dados.size and np.abs(dados).max() > 1.5):
                dados = dados / 32768.0
            duracao = float(len(dados)) / TAXA
            margem = np.zeros(int(0.3 * TAXA), dtype=np.float32)  # falas curtas ("tira o som") somem sem margem
            dados = np.concatenate([margem, dados, margem])
        else:
            dados = audio
            duracao = 0.0
        # Áudio do microfone já vem recortado pelo DetectorFala; o VAD interno (Silero)
        # corta comandos curtos ("Tira o som." → "Chilson."), então só vale para arquivos.
        vad = not isinstance(audio, np.ndarray)
        segmentos, info = self.modelo.transcribe(
            dados, language=self.idioma, beam_size=feixe, best_of=feixe, temperature=0.0,
            vad_filter=vad, vad_parameters={"min_silence_duration_ms": 400},
            condition_on_previous_text=False, without_timestamps=True,
            initial_prompt=self.prompt, hotwords=self.hotwords,
        )
        textos: List[str] = []
        probs: List[float] = []
        sem_fala = 0.0
        for s in segmentos:
            textos.append(s.text.strip())
            probs.append(float(np.exp(s.avg_logprob)))
            sem_fala = max(sem_fala, float(s.no_speech_prob))
        if not duracao:
            duracao = float(getattr(info, "duration", 0.0) or 0.0)
        texto = " ".join(t for t in textos if t).strip()
        # Whisper às vezes devolve o próprio prompt quando não há fala (eco longo)
        if self.prompt and len(texto) >= 20 and texto.strip(" .") in self.prompt:
            texto = ""
        return Transcricao(texto, float(np.mean(probs)) if probs else 0.0, duracao,
                           str(getattr(info, "language", self.idioma)), sem_fala)
