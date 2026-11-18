"""Configuração do Cérebro (arquivo YAML opcional + variáveis de ambiente)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field, fields
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

PASTA = Path(os.environ.get("CEREBRO_HOME", "~/.jos-cerebro")).expanduser()


@dataclass
class Config:
    pasta: Path = PASTA
    nome_usuario: str = "Jair"
    # Execução
    modo_desktop: str = "auto"          # auto | ponte | simulado
    ponte_desktop: str = "~/JairOS/desktop-personal/desktop_command_bridge.py"
    python_ponte: str = ""
    modo_jos: str = "auto"              # auto | mcp | simulado
    jos_mcp_url: str = ""
    jos_mcp_token: str = ""
    permitir_r4: bool = False
    # Entendimento
    usar_llm: bool = True
    ollama_url: str = "http://127.0.0.1:11434"
    modelo_llm: str = "qwen3:1.7b"
    modelo_conversa: str = "qwen3:1.7b"
    # Voz
    palavras_despertar: List[str] = field(default_factory=lambda: ["jarvis", "jair"])
    modo_despertar: str = "transcricao"         # transcricao (qualquer pronúncia) | oww (openWakeWord, calibre antes)
    modelo_despertar: str = "hey_jarvis"        # modelo do openWakeWord quando modo_despertar = oww
    limiar_despertar: float = 0.35              # calibre com "python -m cerebro calibrar"
    modelo_stt_despertar: str = "base"          # Whisper rápido que só procura "Jarvis/Jair" no começo da fala
    modelo_stt: str = "small"                   # tiny | base | small | medium (faster-whisper)
    computacao_stt: str = "int8"
    voz_tts: str = "auto"                       # auto | say | piper | espeak | nenhuma
    voz_say: str = "Luciana"
    velocidade_fala: int = 195
    modelo_piper: str = ""
    janela_conversa_s: float = 7.0              # escuta sem palavra de despertar depois de responder
    # API
    host: str = "127.0.0.1"
    porta: int = 8767
    token_api: str = ""

    @property
    def arquivo_local(self) -> Path:
        return self.pasta / "local.yaml"

    @property
    def arquivo_aprendido(self) -> Path:
        return self.pasta / "aprendido.yaml"

    @property
    def arquivo_auditoria(self) -> Path:
        return self.pasta / "auditoria.jsonl"

    @property
    def arquivo_lembretes(self) -> Path:
        return self.pasta / "lembretes.json"

    @property
    def arquivo_nao_entendidos(self) -> Path:
        return self.pasta / "nao_entendidos.jsonl"

    @property
    def pasta_cache(self) -> Path:
        return self.pasta / "cache"

    @classmethod
    def carregar(cls, arquivo: Optional[os.PathLike] = None, **sobrepor: Any) -> "Config":
        c = cls()
        caminho = Path(arquivo).expanduser() if arquivo else (PASTA / "config.yaml")
        dados: Dict[str, Any] = {}
        if caminho.exists():
            with caminho.open(encoding="utf-8-sig") as f:
                dados = yaml.safe_load(f) or {}
        nomes = {f.name: f for f in fields(cls)}
        for k, v in dados.items():
            if k in nomes:
                setattr(c, k, Path(v).expanduser() if k == "pasta" else v)
        for f in fields(cls):
            env = os.environ.get("CEREBRO_" + f.name.upper())
            if env is None:
                continue
            atual = getattr(c, f.name)
            if isinstance(atual, bool):
                setattr(c, f.name, env.strip().lower() in ("1", "true", "sim", "yes"))
            elif isinstance(atual, int):
                setattr(c, f.name, int(env))
            elif isinstance(atual, float):
                setattr(c, f.name, float(env))
            elif isinstance(atual, list):
                setattr(c, f.name, [x.strip() for x in env.split(",") if x.strip()])
            elif isinstance(atual, Path):
                setattr(c, f.name, Path(env).expanduser())
            else:
                setattr(c, f.name, env)
        c.jos_mcp_url = c.jos_mcp_url or os.environ.get("JOS_MCP_URL", "")
        c.jos_mcp_token = c.jos_mcp_token or os.environ.get("JOS_MCP_TOKEN", "")
        for k, v in sobrepor.items():
            if v is not None:
                setattr(c, k, v)
        c.pasta = Path(c.pasta).expanduser()
        return c
