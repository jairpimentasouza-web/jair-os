"""Executor nativo para Windows (Asus e outros PCs com o Jarvis).

Implementa as mesmas ações tipadas do executor do iMac — por isso as
habilidades funcionam sem mudança — com uma lista fechada de ações permitidas.
Nada de shell livre: cada ação chama uma função específica.

* apps: ``Get-StartApps`` (programas clássicos e da Microsoft Store) + casamento difuso;
* volume: teclas de mídia do Windows (sem dependências) ou pycaw, se instalado;
* ajustes: URIs ``ms-settings:``; print: Pillow (ImageGrab) ou Ferramenta de Captura;
* passos pensados para o macOS (Cmd+Q, Ctrl+Cmd+Q, tecla "k" do YouTube) são
  traduzidos para o equivalente no Windows.
"""
from __future__ import annotations

import base64
import ctypes
import fnmatch
import json
import os
import re
import shutil
import subprocess
import time
import urllib.parse
import urllib.request
import webbrowser
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .base import Passo, ResultadoPasso

SEM_JANELA = 0x08000000 if os.name == "nt" else 0  # CREATE_NO_WINDOW

AJUSTES = {
    "network": "ms-settings:network-wifi", "bluetooth": "ms-settings:bluetooth", "sound": "ms-settings:sound",
    "display": "ms-settings:display", "security": "ms-settings:privacy", "camera_privacy": "ms-settings:privacy-webcam",
    "microphone_privacy": "ms-settings:privacy-microphone", "keyboard": "ms-settings:typing",
    "mouse": "ms-settings:mousetouchpad", "general": "ms-settings:",
}
# chave do léxico → executável/URI no Windows (quando o léxico não diz)
APPS_WINDOWS = {
    "chrome": "chrome.exe", "edge": "msedge.exe", "finder": "explorer.exe", "terminal": "wt.exe",
    "vscode": "code", "textedit": "notepad.exe", "preferences": "ms-settings:", "activity_monitor": "taskmgr.exe",
    "photobooth": "microsoft.windows.camera:", "calculator": "calc.exe", "word": "winword.exe", "excel": "excel.exe",
    "powerpoint": "powerpnt.exe", "outlook": "outlook.exe", "onenote": "onenote.exe", "notes": "onenote.exe",
}
PROCESSOS = {"chrome": "chrome", "edge": "msedge", "word": "WINWORD", "excel": "EXCEL", "powerpoint": "POWERPNT",
             "outlook": "OUTLOOK", "onenote": "ONENOTE", "vscode": "Code", "textedit": "notepad", "terminal": "WindowsTerminal",
             "calculator": "CalculatorApp", "whatsapp": "WhatsApp", "telegram": "Telegram", "zoom": "Zoom",
             "spotify": "Spotify", "teams": "ms-teams", "canva": "Canva", "capcut": "CapCut", "trello": "Trello"}
PERMITIDAS = {
    "open_app", "close_app", "open_url", "open_folder", "open_file", "system_volume", "system_settings", "screenshot",
    "camera_photo", "disk_usage", "performance_health", "process_list", "window_list", "jair_tech_quick",
    "search_files", "clipboard_read", "notify", "lock_screen", "media_key", "youtube_play", "system_snapshot",
}
VK = {"volume_mute": 0xAD, "volume_down": 0xAE, "volume_up": 0xAF, "next": 0xB0, "prev": 0xB1, "play_pause": 0xB3}


def _ps(script: str, timeout: float = 20.0) -> str:
    """Roda um script PowerShell fixo (codificado em base64, sem interpolação de texto do usuário)."""
    cod = base64.b64encode(("$ProgressPreference='SilentlyContinue';[Console]::OutputEncoding=[Text.Encoding]::UTF8;" + script)
                           .encode("utf-16-le")).decode()
    r = subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-EncodedCommand", cod], capture_output=True,
                       timeout=timeout, creationflags=SEM_JANELA)
    return r.stdout.decode("utf-8", "replace").strip()


def _ps_literal(texto: str) -> str:
    return "'" + str(texto).replace("'", "''") + "'"


def traduzir_passos_mac(passos: List[Passo]) -> List[Passo]:
    """Converte padrões de atalho do macOS no equivalente do Windows."""
    out: List[Passo] = []
    i = 0
    while i < len(passos):
        p = passos[i]
        prox = passos[i + 1] if i + 1 < len(passos) else None
        teclas = [str(k).lower() for k in (prox.payload.get("keys") or [])] if prox is not None and prox.acao == "hotkey" else []
        if p.acao == "ui_focus" and teclas:
            app = str(p.payload.get("app") or "")
            if teclas == ["command", "q"]:
                out.append(Passo("desktop", "close_app", {"mac_app": app}, prox.descricao or "Fechar app"))
            elif teclas == ["k"]:
                out.append(Passo("desktop", "media_key", {"key": "play_pause"}, "Tocar/pausar"))
            elif teclas == ["shift", "n"]:
                out.append(Passo("desktop", "media_key", {"key": "next"}, "Próxima"))
            else:
                out.extend([p, prox])
            i += 2
            continue
        if p.acao == "hotkey" and [str(k).lower() for k in p.payload.get("keys") or []] == ["control", "command", "q"]:
            out.append(Passo("desktop", "lock_screen", {}, "Bloquear tela"))
            i += 1
            continue
        out.append(p)
        i += 1
    return out


class DesktopWindows:
    plataforma = "windows"
    disponivel = True

    def __init__(self, raiz_usuario: Optional[str] = None) -> None:
        self.casa = Path(raiz_usuario or os.path.expanduser("~"))
        self._apps: Optional[List[Tuple[str, str]]] = None
        self.chamadas: List[Dict[str, Any]] = []

    # ------------------------------------------------------------- executar
    def executar(self, passos: List[Passo]) -> List[ResultadoPasso]:
        out: List[ResultadoPasso] = []
        for p in traduzir_passos_mac(passos):
            self.chamadas.append({"action": p.acao, "payload": p.payload})
            if p.acao not in PERMITIDAS:
                out.append(ResultadoPasso(p, False, None, "ação não disponível no Windows: %s" % p.acao))
                break
            try:
                r = getattr(self, "_" + p.acao)(p.payload or {})
                out.append(ResultadoPasso(p, True, r))
            except Exception as e:  # noqa: BLE001
                out.append(ResultadoPasso(p, False, None, "%s: %s" % (type(e).__name__, e)))
                break
        return out

    # ------------------------------------------------------------ caminhos
    def _caminho(self, bruto: str) -> Path:
        s = str(bruto or "").strip()
        if s == "/Applications":
            return Path("shell:AppsFolder")
        q = Path(os.path.expandvars(os.path.expanduser(s))).resolve()
        if not (str(q).lower().startswith(str(self.casa).lower()) or str(q).lower().startswith("c:\\temp")):
            raise PermissionError("fora das pastas permitidas: %s" % q)
        return q

    # ---------------------------------------------------------------- apps
    def _lista_apps(self) -> List[Tuple[str, str]]:
        if self._apps is None:
            bruto = _ps("Get-StartApps | Select-Object Name,AppID | ConvertTo-Json -Compress", timeout=30)
            try:
                dados = json.loads(bruto) if bruto else []
            except ValueError:
                dados = []
            if isinstance(dados, dict):
                dados = [dados]
            self._apps = [(str(d.get("Name") or ""), str(d.get("AppID") or "")) for d in dados if d.get("AppID")]
        return self._apps

    def _achar_app(self, nomes: List[str]) -> Optional[Tuple[str, str]]:
        from rapidfuzz import fuzz, process
        apps = self._lista_apps()
        if not apps:
            return None
        rotulos = [a[0].lower() for a in apps]
        melhor = None
        for n in nomes:
            n = str(n or "").lower().strip()
            if not n:
                continue
            r = process.extractOne(n, rotulos, scorer=fuzz.WRatio, score_cutoff=86)
            if r and (melhor is None or r[1] > melhor[1]):
                melhor = r
        return apps[melhor[2]] if melhor else None

    def _open_app(self, p: Dict[str, Any]) -> Dict[str, Any]:
        chave = str(p.get("name") or "").lower()
        alvo = str(p.get("windows") or APPS_WINDOWS.get(chave) or "")
        if alvo.endswith(":"):
            os.startfile(alvo)  # type: ignore[attr-defined]
            return {"opened_app": chave, "via": alvo}
        if alvo:
            exe = shutil.which(alvo)
            if exe:
                subprocess.Popen([exe], creationflags=SEM_JANELA if alvo == "code" else 0)
                return {"opened_app": chave, "via": exe}
        achado = self._achar_app([p.get("nome"), p.get("mac_app"), chave] + list(p.get("aliases") or []))
        if achado:
            subprocess.Popen(["explorer.exe", "shell:AppsFolder\\" + achado[1]])
            return {"opened_app": achado[0], "via": "menu_iniciar"}
        if alvo:
            os.startfile(alvo)  # type: ignore[attr-defined]  # deixa o Windows procurar no PATH/App Paths
            return {"opened_app": chave, "via": alvo}
        raise FileNotFoundError("não encontrei o aplicativo %s neste computador" % (p.get("nome") or chave))

    def _close_app(self, p: Dict[str, Any]) -> Dict[str, Any]:
        chave = str(p.get("name") or "").lower()
        nome = str(p.get("mac_app") or p.get("nome") or chave)
        proc = PROCESSOS.get(chave) or PROCESSOS.get(nome.lower().replace("google ", "").replace("microsoft ", "")) or ""
        termo = nome.replace("Google ", "").replace("Microsoft ", "")
        script = ("$n=0; Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and ($_.ProcessName -eq %s -or "
                  "$_.ProcessName -like ('*'+%s+'*') -or $_.MainWindowTitle -like ('*'+%s+'*')) } | "
                  "ForEach-Object { if ($_.CloseMainWindow()) { $n++ } }; $n") % (_ps_literal(proc or termo), _ps_literal(termo), _ps_literal(termo))
        fechados = int((_ps(script) or "0").splitlines()[-1] or 0)
        if not fechados:
            raise RuntimeError("%s não está aberto" % termo)
        return {"closed": termo, "janelas": fechados}

    # ------------------------------------------------------------ web/pastas
    def _open_url(self, p: Dict[str, Any]) -> Dict[str, Any]:
        url = str(p.get("url") or "")
        if not url.startswith(("http://", "https://")):
            raise ValueError("URL inválida")
        webbrowser.open(url, new=2)
        return {"opened": url}

    def _open_folder(self, p: Dict[str, Any]) -> Dict[str, Any]:
        q = self._caminho(p.get("path"))
        if str(q) == "shell:AppsFolder":
            subprocess.Popen(["explorer.exe", "shell:AppsFolder"])
            return {"opened_folder": "Aplicativos"}
        alternativas = {"Documents": "Documentos", "Pictures": "Imagens", "Movies": "Videos", "Music": "Musicas"}
        if not q.exists() and q.name in alternativas and q.with_name("Videos" if q.name == "Movies" else q.name).exists():
            q = q.with_name("Videos" if q.name == "Movies" else q.name)
        if not q.exists() and q.name == "Movies":
            q = q.with_name("Videos")
        os.startfile(str(q))  # type: ignore[attr-defined]
        return {"opened_folder": str(q)}

    def _open_file(self, p: Dict[str, Any]) -> Dict[str, Any]:
        q = self._caminho(p.get("path"))
        if not q.is_file():
            raise FileNotFoundError(str(q))
        os.startfile(str(q))  # type: ignore[attr-defined]
        return {"opened_file": str(q)}

    def _search_files(self, p: Dict[str, Any]) -> Dict[str, Any]:
        raiz = self._caminho(p.get("root") or "~")
        padrao = str(p.get("pattern") or "*").lower()
        limite = min(max(int(p.get("limit", 50)), 1), 500)
        itens = []
        pular = {"appdata", "node_modules", ".git", ".cache", "$recycle.bin", ".venv", "venv"}
        if not raiz.exists():
            return {"items": []}
        inicio = time.time()
        for atual, dirs, arquivos in os.walk(raiz):
            dirs[:] = [d for d in dirs if d.lower() not in pular and not d.startswith(".")]
            for n in arquivos:
                if fnmatch.fnmatch(n.lower(), padrao):
                    c = Path(atual) / n
                    try:
                        itens.append({"path": str(c), "size": c.stat().st_size, "modified": c.stat().st_mtime})
                    except OSError:
                        pass
                    if len(itens) >= limite:
                        return {"items": itens}
            if time.time() - inicio > 20:
                break
        return {"items": itens}

    # --------------------------------------------------------------- sistema
    def _system_settings(self, p: Dict[str, Any]) -> Dict[str, Any]:
        uri = AJUSTES.get(str(p.get("pane") or "general"), "ms-settings:")
        os.startfile(uri)  # type: ignore[attr-defined]
        return {"opened_settings": p.get("pane"), "uri": uri}

    def _tecla(self, vk: int, vezes: int = 1) -> None:
        u32 = ctypes.windll.user32  # type: ignore[attr-defined]
        for _ in range(vezes):
            u32.keybd_event(vk, 0, 0, 0)
            u32.keybd_event(vk, 0, 2, 0)
            time.sleep(0.01)

    def _volume_pycaw(self):
        try:
            from pycaw.pycaw import AudioUtilities  # type: ignore
            alto = AudioUtilities.GetSpeakers()
            return getattr(alto, "EndpointVolume", None)
        except Exception:  # noqa: BLE001
            return None

    def _system_volume(self, p: Dict[str, Any]) -> Dict[str, Any]:
        ep = self._volume_pycaw()
        if "mute" in p:
            if ep is not None:
                ep.SetMute(1 if p.get("mute") else 0, None)
            else:
                self._tecla(VK["volume_mute"])
            return {"muted": bool(p.get("mute"))}
        if ep is not None:
            atual = int(round(ep.GetMasterVolumeLevelScalar() * 100))
            alvo = p.get("level")
            alvo = int(alvo) if alvo is not None else atual + int(p.get("delta") or 0)
            alvo = max(0, min(100, alvo))
            ep.SetMute(0, None)
            ep.SetMasterVolumeLevelScalar(alvo / 100.0, None)
            return {"volume": alvo, "previous": atual}
        # Sem pycaw: cada tecla de volume vale 2 pontos.
        if p.get("level") is not None:
            self._tecla(VK["volume_down"], 50)
            self._tecla(VK["volume_up"], int(int(p["level"]) / 2))
            return {"volume": int(p["level"]), "metodo": "teclas"}
        delta = int(p.get("delta") or 0)
        self._tecla(VK["volume_up"] if delta > 0 else VK["volume_down"], max(1, abs(delta) // 2))
        return {"delta": delta, "metodo": "teclas"}

    def _media_key(self, p: Dict[str, Any]) -> Dict[str, Any]:
        self._tecla(VK[str(p.get("key") or "play_pause")])
        return {"media": p.get("key")}

    def _lock_screen(self, p: Dict[str, Any]) -> Dict[str, Any]:
        ctypes.windll.user32.LockWorkStation()  # type: ignore[attr-defined]
        return {"locked": True}

    def _screenshot(self, p: Dict[str, Any]) -> Dict[str, Any]:
        pasta = self.casa / "Pictures" / "Jarvis"
        pasta.mkdir(parents=True, exist_ok=True)
        destino = pasta / ("print_%s.png" % datetime.now().strftime("%Y%m%d_%H%M%S"))
        try:
            from PIL import ImageGrab  # type: ignore
            ImageGrab.grab(all_screens=True).save(destino)
            return {"path": str(destino)}
        except Exception:  # noqa: BLE001
            os.startfile("ms-screenclip:")  # type: ignore[attr-defined]
            return {"path": None, "ferramenta": "Ferramenta de Captura"}

    def _camera_photo(self, p: Dict[str, Any]) -> Dict[str, Any]:
        os.startfile("microsoft.windows.camera:")  # type: ignore[attr-defined]
        return {"camera": "aberta", "observacao": "toque no botão da câmera para tirar a foto"}

    def _disk_usage(self, p: Dict[str, Any]) -> Dict[str, Any]:
        u = shutil.disk_usage(os.environ.get("SystemDrive", "C:") + "\\" if os.name == "nt" else "/")
        return {"disks": [{"mount": "C:", "free": u.free, "total": u.total, "used": u.used}]}

    def _memoria(self) -> Dict[str, Any]:
        class MS(ctypes.Structure):
            _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong), ("ullTotalPhys", ctypes.c_ulonglong),
                        ("ullAvailPhys", ctypes.c_ulonglong), ("ullTotalPageFile", ctypes.c_ulonglong),
                        ("ullAvailPageFile", ctypes.c_ulonglong), ("ullTotalVirtual", ctypes.c_ulonglong),
                        ("ullAvailVirtual", ctypes.c_ulonglong), ("sullAvailExtendedVirtual", ctypes.c_ulonglong)]
        m = MS()
        m.dwLength = ctypes.sizeof(MS)
        ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))  # type: ignore[attr-defined]
        return {"percent": int(m.dwMemoryLoad), "total": m.ullTotalPhys, "available": m.ullAvailPhys}

    def _cpu(self) -> float:
        k = ctypes.windll.kernel32  # type: ignore[attr-defined]
        FT = ctypes.c_ulonglong

        def tempos():
            i, kk, u = FT(), FT(), FT()
            k.GetSystemTimes(ctypes.byref(i), ctypes.byref(kk), ctypes.byref(u))
            return i.value, kk.value, u.value
        a = tempos()
        time.sleep(0.4)
        b = tempos()
        ocioso, total = b[0] - a[0], (b[1] - a[1]) + (b[2] - a[2])
        return round(100.0 * (1 - ocioso / total), 1) if total else 0.0

    def _performance_health(self, p: Dict[str, Any]) -> Dict[str, Any]:
        return {"memory": self._memoria(), "cpu_percent": self._cpu()}

    def _process_list(self, p: Dict[str, Any]) -> Dict[str, Any]:
        r = subprocess.run(["tasklist", "/fo", "csv", "/nh"], capture_output=True, timeout=15, creationflags=SEM_JANELA)
        linhas = r.stdout.decode("cp850", "replace").splitlines()
        nomes = sorted({l.split('","')[0].strip('"') for l in linhas if l.strip()})
        return {"processes": [{"name": n} for n in nomes]}

    def _window_list(self, p: Dict[str, Any]) -> Dict[str, Any]:
        bruto = _ps("Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object ProcessName,MainWindowTitle | ConvertTo-Json -Compress")
        try:
            dados = json.loads(bruto) if bruto else []
        except ValueError:
            dados = []
        if isinstance(dados, dict):
            dados = [dados]
        return {"windows": [{"app": d.get("ProcessName"), "title": d.get("MainWindowTitle")} for d in dados]}

    def _system_snapshot(self, p: Dict[str, Any]) -> Dict[str, Any]:
        return {"hostname": os.environ.get("COMPUTERNAME"), **self._disk_usage(p), "memory": self._memoria()}

    def _jair_tech_quick(self, p: Dict[str, Any]) -> Dict[str, Any]:
        d = self._disk_usage(p)["disks"][0]
        mem = self._memoria()
        cpu = self._cpu()
        alertas = []
        if d["free"] / max(d["total"], 1) < 0.1:
            alertas.append("pouco espaço em disco")
        if mem["percent"] >= 90:
            alertas.append("memória quase cheia")
        if cpu >= 90:
            alertas.append("processador no limite")
        return {"disk_free": d["free"], "disk_total": d["total"], "memory_percent": mem["percent"], "cpu_percent": cpu,
                "alertas": alertas, "status": "atenção" if alertas else "ok"}

    def _clipboard_read(self, p: Dict[str, Any]) -> Dict[str, Any]:
        return {"text": _ps("Get-Clipboard -Raw")[:200000]}

    def _notify(self, p: Dict[str, Any]) -> Dict[str, Any]:
        titulo, msg = str(p.get("title") or "Jarvis"), str(p.get("message") or "")
        script = ("Add-Type -AssemblyName System.Windows.Forms; $n=New-Object System.Windows.Forms.NotifyIcon; "
                  "$n.Icon=[System.Drawing.SystemIcons]::Information; $n.Visible=$true; "
                  "$n.ShowBalloonTip(8000,%s,%s,'Info'); Start-Sleep 9; $n.Dispose()") % (_ps_literal(titulo), _ps_literal(msg))
        cod = base64.b64encode(script.encode("utf-16-le")).decode()
        subprocess.Popen(["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-EncodedCommand", cod], creationflags=SEM_JANELA)
        return {"notified": True}

    def _youtube_play(self, p: Dict[str, Any]) -> Dict[str, Any]:
        q = str(p.get("query") or "").strip()
        if not q:
            raise ValueError("o que eu toco?")
        busca = "https://www.youtube.com/results?search_query=" + urllib.parse.quote_plus(q)
        try:
            req = urllib.request.Request(busca, headers={"User-Agent": "Mozilla/5.0", "Accept-Language": "pt-BR"})
            with urllib.request.urlopen(req, timeout=10) as r:
                html = r.read(3_000_000).decode("utf-8", "ignore")
            ids = []
            for vid in re.findall(r'"videoId":"([A-Za-z0-9_-]{11})"', html):
                if vid not in ids:
                    ids.append(vid)
            if ids:
                url = "https://www.youtube.com/watch?v=" + ids[0]
                webbrowser.open(url, new=2)
                return {"query": q, "url": url, "playing": True}
        except Exception:  # noqa: BLE001
            pass
        webbrowser.open(busca, new=2)
        return {"query": q, "url": busca, "playing": False}
