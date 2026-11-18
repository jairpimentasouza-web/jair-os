"""API HTTP local do Cérebro (FastAPI). Escuta só em 127.0.0.1 por padrão.

    GET  /                 console web (texto + microfone)
    GET  /v1/saude         estado dos executores e do léxico
    GET  /v1/habilidades   catálogo de habilidades
    POST /v1/entender      {"texto"} → hipóteses (não executa)
    POST /v1/comando       {"texto", "sessao"?, "executar"?} → resposta falada + execução
    POST /v1/audio         arquivo de áudio (webm/ogg/wav/m4a) → transcrição + comando
    WS   /v1/conversa      {"texto"} ↔ respostas; também recebe lembretes
"""
from __future__ import annotations

import asyncio
import contextlib
import os
import tempfile
import threading
from typing import Any, Dict, List, Set

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field


class PedidoTexto(BaseModel):
    texto: str = Field(..., min_length=1, max_length=4000)
    sessao: str = Field("api", max_length=80)
    executar: bool = True


def criar_app(cerebro, com_voz: bool = True) -> FastAPI:
    laco: Dict[str, Any] = {}
    sockets: Set[WebSocket] = set()

    def avisar_lembrete(item: Dict) -> None:
        loop = laco.get("loop")
        if loop is None:
            return
        for ws in list(sockets):
            asyncio.run_coroutine_threadsafe(ws.send_json({"tipo": "lembrete", "texto": item["texto"], "quando": item["quando"]}), loop)

    @contextlib.asynccontextmanager
    async def ciclo(_app):
        laco["loop"] = asyncio.get_running_loop()
        cerebro.iniciar_lembretes(avisar_lembrete)
        yield
        cerebro.lembretes.parar()

    app = FastAPI(title="Cérebro JOS (Jarvis)", version="1.0.0", lifespan=ciclo)
    app.add_middleware(CORSMiddleware, allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
                       allow_methods=["GET", "POST"], allow_headers=["*"])
    token = cerebro.config.token_api
    trava = threading.Lock()
    estado: Dict[str, Any] = {"stt": None, "erro_stt": None}

    def auth(request: Request) -> None:
        if not token:
            return
        h = request.headers.get("authorization", "")
        if h != "Bearer " + token and request.query_params.get("token") != token:
            raise HTTPException(401, "token inválido")

    def stt():
        if estado["stt"] is None and com_voz and estado["erro_stt"] is None:
            try:
                from .voz.stt import TranscritorWhisper
                cfg = cerebro.config
                estado["stt"] = TranscritorWhisper(cfg.modelo_stt, computacao=cfg.computacao_stt, termos=cerebro.lexico.hotwords())
            except Exception as e:  # noqa: BLE001
                estado["erro_stt"] = str(e)
        if estado["stt"] is None:
            raise HTTPException(503, "transcrição indisponível: %s" % (estado["erro_stt"] or "voz desativada"))
        return estado["stt"]

    @app.get("/", response_class=HTMLResponse)
    def console() -> str:
        return CONSOLE

    @app.get("/v1/saude")
    def saude(_: None = Depends(auth)) -> Dict[str, Any]:
        e = cerebro.estatisticas()
        e["voz"] = {"carregada": estado["stt"] is not None, "erro": estado["erro_stt"], "modelo": cerebro.config.modelo_stt}
        e["lembretes_pendentes"] = len(cerebro.lembretes.pendentes())
        return e

    @app.get("/v1/habilidades")
    def habilidades(_: None = Depends(auth)) -> List[Dict[str, Any]]:
        return [{"id": h.id, "descricao": h.descricao, "risco": h.risco, "dominio": h.dominio,
                 "exemplos": h.exemplos[:3], "slots": list(h.slots)} for h in cerebro.motor.habilidades.values()]

    @app.post("/v1/entender")
    def entender(p: PedidoTexto, _: None = Depends(auth)) -> Dict[str, Any]:
        with trava:
            return cerebro.entender(p.texto, p.sessao)

    @app.post("/v1/comando")
    def comando(p: PedidoTexto, _: None = Depends(auth)) -> Dict[str, Any]:
        with trava:
            return cerebro.processar(p.texto, sessao=p.sessao, executar=p.executar).json()

    @app.post("/v1/audio")
    async def audio(arquivo: UploadFile = File(...), sessao: str = Form("api"), executar: bool = Form(True),
                    _: None = Depends(auth)) -> Dict[str, Any]:
        bruto = await arquivo.read()
        if not bruto or len(bruto) > 25_000_000:
            raise HTTPException(400, "áudio vazio ou grande demais")
        sufixo = os.path.splitext(arquivo.filename or "")[1][:6] or ".webm"
        with tempfile.NamedTemporaryFile(suffix=sufixo, delete=False) as f:
            f.write(bruto)
            caminho = f.name
        try:
            t = await asyncio.to_thread(lambda: stt().transcrever(caminho))
        finally:
            os.unlink(caminho)
        if t.vazia or cerebro.norm.eh_alucinacao(t.texto):
            return {"transcricao": t.texto, "confianca": t.confianca, "resposta": None}
        with trava:
            r = await asyncio.to_thread(cerebro.processar, t.texto, sessao, executar)
        return {"transcricao": t.texto, "confianca": round(t.confianca, 3), "resposta": r.json()}

    @app.websocket("/v1/conversa")
    async def conversa(ws: WebSocket) -> None:
        if token and ws.query_params.get("token") != token:
            await ws.close(code=4401)
            return
        await ws.accept()
        sockets.add(ws)
        try:
            while True:
                msg = await ws.receive_json()
                texto = str(msg.get("texto") or "").strip()
                if not texto:
                    continue
                r = await asyncio.to_thread(cerebro.processar, texto, str(msg.get("sessao") or "ws"), bool(msg.get("executar", True)))
                await ws.send_json({"tipo": "resposta", **r.json()})
        except WebSocketDisconnect:
            pass
        finally:
            sockets.discard(ws)

    return app


CONSOLE = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jarvis · Cérebro JOS</title>
<style>
:root{--fundo:#0f1115;--cartao:#181b22;--texto:#e8eaf0;--suave:#9aa3b2;--acento:#4f8cff;--ok:#2fbf71;--alerta:#e5a50a}
@media (prefers-color-scheme: light){:root{--fundo:#f4f6fa;--cartao:#fff;--texto:#14171f;--suave:#5b6474;--acento:#2563eb}}
*{box-sizing:border-box}body{margin:0;background:var(--fundo);color:var(--texto);font:16px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:760px;margin:0 auto;padding:20px 16px 120px}h1{font-size:20px;margin:0 0 4px}p.sub{color:var(--suave);margin:0 0 18px}
#log{display:flex;flex-direction:column;gap:10px}.msg{background:var(--cartao);border-radius:12px;padding:10px 14px;max-width:88%}
.eu{align-self:flex-end;background:var(--acento);color:#fff}.meta{font-size:12px;color:var(--suave);margin-top:4px}
form{position:fixed;left:0;right:0;bottom:0;background:var(--fundo);padding:12px 16px;display:flex;gap:8px;max-width:760px;margin:0 auto}
input{flex:1;padding:12px;border-radius:10px;border:1px solid #3334;background:var(--cartao);color:var(--texto);font-size:16px}
button{padding:0 16px;border-radius:10px;border:0;background:var(--acento);color:#fff;font-size:16px;cursor:pointer}
button.gravando{background:#d33}
</style></head><body><main>
<h1>Jarvis</h1><p class="sub">Cérebro do Jair OS · fale ou digite um comando</p><div id="log"></div></main>
<form id="f"><button type="button" id="mic" title="Segure para falar">🎙</button><input id="t" placeholder="Ex.: me lembra amanhã às 3 de ligar para a coordenação" autocomplete="off"><button>Enviar</button></form>
<script>
const log=document.getElementById('log'),t=document.getElementById('t'),mic=document.getElementById('mic');
function add(txt,eu,meta){const d=document.createElement('div');d.className='msg'+(eu?' eu':'');d.textContent=txt;if(meta){const m=document.createElement('div');m.className='meta';m.textContent=meta;d.appendChild(m)}log.appendChild(d);d.scrollIntoView()}
function falar(txt){try{const u=new SpeechSynthesisUtterance(txt);u.lang='pt-BR';speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
function mostrar(r){if(!r){add('(não ouvi nada)',false);return}add(r.fala||'…',false,[r.estado,r.intencao,(r.confianca||0).toFixed(2),r.fonte].filter(Boolean).join(' · '));falar(r.fala)}
document.getElementById('f').onsubmit=async e=>{e.preventDefault();const x=t.value.trim();if(!x)return;t.value='';add(x,true);
 const r=await fetch('/v1/comando',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({texto:x,sessao:'console'})});mostrar(await r.json())};
let rec,partes=[];
mic.onclick=async()=>{if(rec&&rec.state==='recording'){rec.stop();return}
 const s=await navigator.mediaDevices.getUserMedia({audio:true});rec=new MediaRecorder(s);partes=[];
 rec.ondataavailable=e=>partes.push(e.data);rec.onstop=async()=>{mic.classList.remove('gravando');s.getTracks().forEach(x=>x.stop());
  const fd=new FormData();fd.append('arquivo',new Blob(partes,{type:'audio/webm'}),'fala.webm');fd.append('sessao','console');
  const r=await fetch('/v1/audio',{method:'POST',body:fd});const j=await r.json();if(j.transcricao)add(j.transcricao,true,'voz · conf. '+(j.confianca||0));mostrar(j.resposta)};
 rec.start();mic.classList.add('gravando')};
try{const ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/v1/conversa');ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.tipo==='lembrete'){add('⏰ Lembrete: '+m.texto,false);falar('Lembrete: '+m.texto)}}}catch(e){}
</script></body></html>"""
