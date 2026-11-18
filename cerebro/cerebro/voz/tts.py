"""Fala (TTS) em PT-BR: ``say`` do macOS (voz Luciana), Piper neural offline ou eSpeak.

Todas as vozes podem ser interrompidas (``parar``) — é isso que permite cortar
o Jarvis no meio da frase dizendo "Jarvis" de novo.
"""
from __future__ import annotations

import base64
import os
import platform
import re
import shutil
import subprocess
import tempfile
import threading
import wave
from pathlib import Path
from typing import Optional

_PRONUNCIA = [
    (re.compile(r"\bJOS\b"), "Jair OS"),
    (re.compile(r"\bR\$\s*"), ""),
    (re.compile(r"(\d)\s*%"), r"\1 por cento"),
    (re.compile(r"\b[Tt]urma (\d{2})(\d{2})\b"), r"turma \1 \2"),
    (re.compile(r"\bAV(\d)\b"), r"A V \1"),
    (re.compile(r"\bMCP\b"), "M C P"),
    (re.compile(r"\bIA\b"), "I A"),
    (re.compile(r"https?://\S+"), "o endereço"),
]


def preparar(texto: str) -> str:
    s = str(texto or "")
    for rx, troca in _PRONUNCIA:
        s = rx.sub(troca, s)
    s = s.replace("—", ", ").replace("\"", "").replace("*", "")
    return re.sub(r"\s+", " ", s).strip()


SEM_JANELA = 0x08000000 if os.name == "nt" else 0


class VozBase:
    nome = "base"

    def __init__(self) -> None:
        self._proc: Optional[subprocess.Popen] = None
        self._trava = threading.Lock()

    @property
    def falando(self) -> bool:
        return self._proc is not None and self._proc.poll() is None

    def _comando(self, texto: str):  # pragma: no cover - abstrato
        raise NotImplementedError

    def falar(self, texto: str, bloquear: bool = True) -> None:
        texto = preparar(texto)
        if not texto:
            return
        self.parar()
        with self._trava:
            self._proc = subprocess.Popen(self._comando(texto), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                          creationflags=SEM_JANELA)
        if bloquear:
            self._proc.wait()

    def parar(self) -> None:
        with self._trava:
            if self.falando:
                self._proc.terminate()
                try:
                    self._proc.wait(timeout=1)
                except subprocess.TimeoutExpired:
                    self._proc.kill()
            self._proc = None


class VozSay(VozBase):
    nome = "say"

    def __init__(self, voz: str = "Luciana", velocidade: int = 195) -> None:
        super().__init__()
        self.voz = voz
        self.velocidade = velocidade

    def _comando(self, texto: str):
        return ["/usr/bin/say", "-v", self.voz, "-r", str(self.velocidade), texto]


class VozEspeak(VozBase):
    nome = "espeak"

    def __init__(self, velocidade: int = 170) -> None:
        super().__init__()
        self.bin = shutil.which("espeak-ng") or shutil.which("espeak") or "espeak-ng"
        self.velocidade = velocidade

    def _comando(self, texto: str):
        return [self.bin, "-v", "pt-br", "-s", str(self.velocidade), texto]


class VozPiper(VozBase):
    """Piper (rhasspy) — voz neural offline, ex.: pt_BR-faber-medium.onnx."""

    nome = "piper"

    def __init__(self, modelo: str) -> None:
        super().__init__()
        from piper import PiperVoice  # dependência opcional

        self.voz = PiperVoice.load(str(Path(modelo).expanduser()))
        self.player = shutil.which("afplay") or shutil.which("aplay") or shutil.which("paplay") or shutil.which("ffplay")
        self._wav: Optional[str] = None

    def sintetizar(self, texto: str, destino: str) -> str:
        with wave.open(destino, "wb") as w:
            if hasattr(self.voz, "synthesize_wav"):
                self.voz.synthesize_wav(preparar(texto), w)
            else:  # API antiga do piper-tts
                self.voz.synthesize(preparar(texto), w)
        return destino

    def _comando(self, texto: str):
        f = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        f.close()
        self._wav = self.sintetizar(texto, f.name)
        if not self.player:
            return ["true"]
        if self.player.endswith("ffplay"):
            return [self.player, "-nodisp", "-autoexit", "-loglevel", "quiet", self._wav]
        return [self.player, self._wav]


class VozWindows(VozBase):
    """Voz do próprio Windows (System.Speech) — usa a Microsoft Maria (pt-BR) se estiver instalada."""

    nome = "windows"

    def __init__(self, voz: str = "", velocidade: int = 1) -> None:
        super().__init__()
        self.voz = voz
        self.velocidade = max(-10, min(10, int(velocidade)))

    def _comando(self, texto: str):
        b64 = base64.b64encode(texto.encode("utf-8")).decode()
        nome = (self.voz or "").replace("'", "")
        script = (
            "Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; "
            "$vs=$s.GetInstalledVoices()|ForEach-Object{$_.VoiceInfo}; "
            "$v=($vs|Where-Object{$_.Name -eq '%s'}|Select-Object -First 1); "
            "if(-not $v){$v=($vs|Where-Object{$_.Culture.Name -eq 'pt-BR'}|Select-Object -First 1)}; "
            "if($v){$s.SelectVoice($v.Name)}; $s.Rate=%d; "
            "$s.Speak([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('%s')))" % (nome, self.velocidade, b64))
        cod = base64.b64encode(script.encode("utf-16-le")).decode()
        return ["powershell", "-NoProfile", "-NonInteractive", "-EncodedCommand", cod]


class VozNula(VozBase):
    nome = "texto"

    def falar(self, texto: str, bloquear: bool = True) -> None:
        texto = preparar(texto)
        if texto:
            print("🗣  %s" % texto, flush=True)

    @property
    def falando(self) -> bool:
        return False


def criar_voz(tipo: str = "auto", voz_say: str = "Luciana", velocidade: int = 195, modelo_piper: str = "") -> VozBase:
    tipo = (tipo or "auto").lower()
    mac = platform.system() == "Darwin" and Path("/usr/bin/say").exists()
    if tipo == "windows" or (tipo == "auto" and os.name == "nt" and not modelo_piper):
        return VozWindows(voz_say if voz_say and voz_say != "Luciana" else "Microsoft Maria Desktop", 1)
    if tipo == "say" or (tipo == "auto" and mac and not modelo_piper):
        return VozSay(voz_say, velocidade)
    if tipo == "piper" or (tipo == "auto" and modelo_piper and Path(modelo_piper).expanduser().exists()):
        try:
            return VozPiper(modelo_piper)
        except Exception:  # noqa: BLE001
            if tipo == "piper":
                raise
    if tipo == "espeak" or (tipo == "auto" and (shutil.which("espeak-ng") or shutil.which("espeak"))):
        return VozEspeak()
    if tipo == "auto" and mac:
        return VozSay(voz_say, velocidade)
    return VozNula()
