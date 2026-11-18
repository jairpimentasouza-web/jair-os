"""Último recurso do entendimento: um modelo local (Ollama) com saída JSON restrita.

O modelo só escolhe entre as habilidades registradas (enum no JSON Schema) e
nunca executa nada; a confiança dele é limitada para que a política peça
confirmação antes de qualquer ação com efeito.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Dict, List, Optional, Tuple


class ClienteOllama:
    def __init__(self, url: str = "http://127.0.0.1:11434", modelo: str = "qwen3:1.7b",
                 modelo_conversa: Optional[str] = None, timeout: float = 12.0) -> None:
        self.url = url.rstrip("/")
        self.modelo = modelo
        self.modelo_conversa = modelo_conversa or modelo
        self.timeout = timeout
        self._ok: Optional[bool] = None

    def disponivel(self) -> bool:
        if self._ok is None:
            try:
                with urllib.request.urlopen(self.url + "/api/version", timeout=1.5) as r:
                    self._ok = r.status == 200
            except Exception:
                self._ok = False
        return bool(self._ok)

    def _chat(self, modelo: str, sistema: str, usuario: str, formato=None, max_tokens: int = 220,
              temperatura: float = 0.0) -> Optional[str]:
        corpo = {
            "model": modelo, "stream": False, "think": False, "keep_alive": "15m",
            "messages": [{"role": "system", "content": sistema}, {"role": "user", "content": usuario}],
            "options": {"temperature": temperatura, "num_ctx": 4096, "num_predict": max_tokens},
        }
        if formato is not None:
            corpo["format"] = formato
        req = urllib.request.Request(self.url + "/api/chat", data=json.dumps(corpo).encode(),
                                     headers={"content-type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                dados = json.load(r)
        except (urllib.error.URLError, OSError, ValueError):
            self._ok = False
            return None
        msg = (dados.get("message") or {}).get("content") or dados.get("response") or ""
        return str(msg).strip()

    def classificar(self, texto: str, habilidades: List[Dict]) -> Optional[Tuple[str, Dict[str, str], float]]:
        if not self.disponivel():
            return None
        ids = [h["id"] for h in habilidades] + ["nenhuma"]
        esquema = {
            "type": "object",
            "properties": {
                "intencao": {"type": "string", "enum": ids},
                "slots": {"type": "object", "additionalProperties": {"type": "string"}},
                "confianca": {"type": "number"},
            },
            "required": ["intencao", "slots", "confianca"],
        }
        catalogo = "\n".join("- %s: %s (slots: %s)" % (h["id"], h["descricao"], ", ".join(h["slots"]) or "nenhum")
                             for h in habilidades)
        sistema = ("Você classifica comandos de voz em português do Brasil para o assistente Jarvis. "
                   "O texto pode ter erros de transcrição. Escolha a intenção mais provável do catálogo, ou 'nenhuma' "
                   "se não for um comando. Preencha os slots com trechos do próprio texto. Responda só JSON.\n"
                   "Catálogo:\n" + catalogo)
        bruto = self._chat(self.modelo, sistema, texto, formato=esquema)
        if not bruto:
            return None
        try:
            d = json.loads(bruto[bruto.find("{"):bruto.rfind("}") + 1])
        except ValueError:
            return None
        intencao = str(d.get("intencao") or "nenhuma")
        if intencao not in ids or intencao == "nenhuma":
            return None
        slots = {str(k): str(v) for k, v in (d.get("slots") or {}).items() if v not in (None, "")}
        try:
            conf = float(d.get("confianca", 0.6))
        except (TypeError, ValueError):
            conf = 0.6
        return intencao, slots, max(0.0, min(conf, 1.0))

    def responder(self, pergunta: str, historico: Optional[List[Tuple[str, str]]] = None) -> Optional[str]:
        if not self.disponivel():
            return None
        sistema = ("Você é o Jarvis, assistente de voz do professor Jair (Física e Matemática). Responda em "
                   "português do Brasil, em no máximo 3 frases curtas, próprias para serem faladas em voz alta. "
                   "Sem markdown, sem listas, sem emojis. Se não souber, diga que não sabe.")
        ctx = ""
        for u, a in (historico or [])[-4:]:
            ctx += "Usuário: %s\nJarvis: %s\n" % (u, a)
        return self._chat(self.modelo_conversa, sistema, ctx + pergunta, max_tokens=180, temperatura=0.3)
