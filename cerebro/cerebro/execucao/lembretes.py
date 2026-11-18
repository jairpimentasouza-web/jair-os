"""Agenda local de lembretes: dispara na hora certa (fala + notificação)."""
from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Callable, Dict, List, Optional


class AgendaLembretes:
    def __init__(self, arquivo: Optional[Path] = None) -> None:
        self.arquivo = Path(arquivo).expanduser() if arquivo else None
        self._itens: List[Dict] = []
        self._trava = threading.Lock()
        self._thread: Optional[threading.Thread] = None
        self._parar = threading.Event()
        self._carregar()

    def _carregar(self) -> None:
        if self.arquivo and self.arquivo.exists():
            try:
                self._itens = json.loads(self.arquivo.read_text(encoding="utf-8"))
            except ValueError:
                self._itens = []

    def _salvar(self) -> None:
        if not self.arquivo:
            return
        self.arquivo.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.arquivo.with_suffix(".tmp")
        tmp.write_text(json.dumps(self._itens, ensure_ascii=False, indent=1), encoding="utf-8")
        tmp.replace(self.arquivo)

    def agendar(self, texto: str, quando: datetime) -> Dict:
        item = {"id": uuid.uuid4().hex[:10], "texto": texto, "quando": quando.isoformat(timespec="minutes"), "disparado": False}
        with self._trava:
            self._itens.append(item)
            self._salvar()
        return item

    def pendentes(self) -> List[Dict]:
        with self._trava:
            return [dict(i) for i in self._itens if not i.get("disparado")]

    def vencidos(self, agora: Optional[datetime] = None) -> List[Dict]:
        agora = agora or datetime.now()
        saida = []
        with self._trava:
            for i in self._itens:
                if not i.get("disparado") and datetime.fromisoformat(i["quando"]) <= agora:
                    i["disparado"] = True
                    saida.append(dict(i))
            if saida:
                self._itens = [i for i in self._itens if not i.get("disparado")] + []
                self._salvar()
        return saida

    def iniciar(self, ao_disparar: Callable[[Dict], None], intervalo: float = 15.0) -> None:
        if self._thread and self._thread.is_alive():
            return

        def laco() -> None:
            while not self._parar.is_set():
                for item in self.vencidos():
                    try:
                        ao_disparar(item)
                    except Exception:  # noqa: BLE001
                        pass
                self._parar.wait(intervalo)

        self._thread = threading.Thread(target=laco, name="jarvis-lembretes", daemon=True)
        self._thread.start()

    def parar(self) -> None:
        self._parar.set()
