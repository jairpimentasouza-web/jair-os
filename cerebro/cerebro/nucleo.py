"""O Cérebro: entende, decide, executa e responde — com memória de conversa.

Uso mínimo::

    from cerebro import Cerebro
    c = Cerebro.criar()                    # lê ~/.jos-cerebro/config.yaml
    r = c.processar("Jarvis, abre o Chrome")
    print(r.fala)                          # "Abrindo Google Chrome."
"""
from __future__ import annotations

import json
import random
import re
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Deque, Dict, List, Optional, Tuple

from .config import Config
from .dialogo import respostas as R
from .dialogo.politica import Auditoria, Politica
from .execucao.base import Executores, Passo, Plano, PrecisaSlot, ResultadoPasso
from .execucao.construtores import Ambiente, construir
from .execucao.desktop import DesktopSimulado, PonteDesktop
from .execucao.jos import ClienteJOS, JOSSimulado
from .execucao.lembretes import AgendaLembretes
from .lexico import Lexico
from .nlu.llm import ClienteOllama
from .nlu.modelo import TIPOS_GAZETTEER, Hipotese, SlotDef, Valor
from .nlu.motor import Motor
from .nlu.slots import Contexto, resolver
from .texto.basico import dobrar
from .texto.normalizar import Fala, Normalizador

_CONECTORES = re.compile(r"\s+(?:e depois|depois disso|depois|em seguida|na sequencia|e tambem|e ai|e entao|logo depois|ai depois)\s+")
_ORDINAIS_ESCOLHA = {"primeira": 0, "primeiro": 0, "1": 0, "um": 0, "a primeira": 0, "segunda": 1, "segundo": 1, "2": 1,
                     "dois": 1, "a segunda": 1, "terceira": 2, "terceiro": 2, "3": 2, "a terceira": 2}


@dataclass
class Resposta:
    fala: str
    estado: str                      # ok | pergunta | confirmacao | desambiguacao | nao_entendi | cancelado | erro | ignorado | escutando
    intencao: Optional[str] = None
    confianca: float = 0.0
    fonte: str = ""
    texto: str = ""                  # texto normalizado
    hipoteses: List[Dict[str, Any]] = field(default_factory=list)
    planos: List[Dict[str, Any]] = field(default_factory=list)
    execucao: List[Dict[str, Any]] = field(default_factory=list)
    aguardando: bool = False         # espera resposta (sem palavra de despertar)
    dormir: bool = False
    fala_inicial: str = ""

    def json(self) -> Dict[str, Any]:
        return {k: v for k, v in self.__dict__.items()}


@dataclass
class Pendente:
    tipo: str                        # confirmacao | slot | desambiguacao
    hipotese: Optional[Hipotese] = None
    plano: Optional[Plano] = None
    slot: Optional[SlotDef] = None
    opcoes: List[Hipotese] = field(default_factory=list)
    forte: bool = False
    tentativas: int = 0
    criado: float = field(default_factory=time.time)


@dataclass
class Sessao:
    id: str
    contexto: Contexto = field(default_factory=Contexto)
    pendente: Optional[Pendente] = None
    fila: List[Hipotese] = field(default_factory=list)
    historico: Deque[Tuple[str, str]] = field(default_factory=lambda: deque(maxlen=20))
    ultima_fala: str = ""


class Cerebro:
    def __init__(self, config: Optional[Config] = None, lexico: Optional[Lexico] = None, desktop=None, jos=None,
                 llm: Any = "auto", relogio: Optional[Callable[[], datetime]] = None, semente: Optional[int] = None,
                 usar_cache: bool = True) -> None:
        self.config = config or Config.carregar()
        cfg = self.config
        self.relogio = relogio or datetime.now
        self.rng = random.Random(semente)
        self.lexico = lexico or Lexico.carregar(local=cfg.arquivo_local, aprendido=cfg.arquivo_aprendido)
        self.norm = Normalizador(self.lexico)
        if llm == "auto":
            llm = ClienteOllama(cfg.ollama_url, cfg.modelo_llm, cfg.modelo_conversa) if cfg.usar_llm else None
        self.llm = llm
        self.motor = Motor(self.lexico, self.norm, pasta_cache=cfg.pasta_cache if usar_cache else None, llm=self.llm)
        self.desktop = desktop or self._desktop_padrao()
        self.jos = jos or self._jos_padrao()
        self.executores = Executores(self.desktop, self.jos)
        self.politica = Politica(permitir_r4=cfg.permitir_r4)
        self.auditoria = Auditoria(cfg.arquivo_auditoria)
        self.lembretes = AgendaLembretes(cfg.arquivo_lembretes)
        self.amb = Ambiente(self.lexico, self.motor, self.llm, self.lembretes, cfg.nome_usuario, self.rng,
                            self.relogio, ao_aprender=self._reconstruir_normalizador)
        self.sessoes: Dict[str, Sessao] = {}
        self._log_nao_entendidos = cfg.arquivo_nao_entendidos

    @classmethod
    def criar(cls, arquivo_config: Optional[str] = None, **kw) -> "Cerebro":
        return cls(Config.carregar(arquivo_config), **kw)

    def _desktop_padrao(self):
        cfg = self.config
        if cfg.modo_desktop == "simulado":
            return DesktopSimulado()
        ponte = PonteDesktop(cfg.ponte_desktop, cfg.python_ponte or None)
        if cfg.modo_desktop == "ponte" or ponte.disponivel:
            return ponte
        return DesktopSimulado()

    def _jos_padrao(self):
        cfg = self.config
        if cfg.modo_jos == "simulado":
            return JOSSimulado()
        cliente = ClienteJOS(cfg.jos_mcp_url, cfg.jos_mcp_token)
        if cfg.modo_jos == "mcp" or cliente.configurado:
            return cliente
        return JOSSimulado()

    def _reconstruir_normalizador(self) -> None:
        self.norm.reconstruir()

    def sessao(self, sid: str = "padrao") -> Sessao:
        if sid not in self.sessoes:
            self.sessoes[sid] = Sessao(sid)
        return self.sessoes[sid]

    # ===================================================================== API
    def entender(self, texto: str, sessao: str = "padrao") -> Dict[str, Any]:
        fala = self.norm.normalizar(texto)
        hips = self.motor.entender(fala, self.sessao(sessao).contexto, self.relogio(), usar_llm=False)
        return {"original": texto, "texto": fala.texto, "acordou": fala.acordou, "hipoteses": [h.json() for h in hips[:5]]}

    def processar(self, texto: str, sessao: str = "padrao", executar: bool = True,
                  ao_iniciar: Optional[Callable[[str], None]] = None) -> Resposta:
        s = self.sessao(sessao)
        inicio = time.time()
        resp = self._processar(texto, s, executar, ao_iniciar)
        if resp.fala:
            s.ultima_fala = resp.fala
            s.historico.append((texto, resp.fala))
        self.auditoria.registrar(sessao=s.id, original=texto, texto=resp.texto, intencao=resp.intencao,
                                 confianca=resp.confianca, fonte=resp.fonte, estado=resp.estado, fala=resp.fala,
                                 ms=int((time.time() - inicio) * 1000),
                                 ok=all(e.get("ok") for e in resp.execucao) if resp.execucao else None)
        return resp

    # ============================================================== diálogo
    def _processar(self, texto: str, s: Sessao, executar: bool, ao_iniciar) -> Resposta:
        if self.norm.eh_alucinacao(texto):
            return Resposta("", "ignorado")
        fala = self.norm.normalizar(texto)
        if s.pendente and time.time() - s.pendente.criado > 120:
            s.pendente = None
            s.fila = []
        if fala.vazia:
            if s.pendente:
                return Resposta(self._pergunta_pendente(s.pendente), s.pendente.tipo, aguardando=True)
            return Resposta(R.escolher(R.ESCUTANDO, self.rng), "escutando", aguardando=True)

        if s.pendente is not None:
            r = self._resolver_pendente(texto, fala, s, executar, ao_iniciar)
            if r is not None:
                return r

        if self.norm.pertence(texto, "cancelamento"):
            s.fila = []
            return Resposta("Ok.", "cancelado", texto=fala.texto)
        if self.norm.pertence(texto, "repeticao") and s.ultima_fala and len(fala.tokens()) <= 4:
            return Resposta(s.ultima_fala, "ok", texto=fala.texto)

        hips = self._entender_com_contexto(fala, s)
        segmentos = self._compostos(fala, hips, s)
        if segmentos:
            return self._executar_fila(segmentos, fala, s, executar, ao_iniciar)
        if not hips or hips[0].confianca < 0.5:
            return self._nao_entendi(texto, fala, s, hips)
        topo = hips[0]
        if (len(hips) > 1 and topo.confianca < 0.9 and hips[1].confianca >= topo.confianca - 0.03
                and hips[1].intencao.split(".")[0] != topo.intencao.split(".")[0]):
            s.pendente = Pendente("desambiguacao", opcoes=hips[:2])
            return self._resposta(self._pergunta_pendente(s.pendente), "desambiguacao", topo, fala, hips, aguardando=True)
        return self._atender(topo, fala, s, executar, ao_iniciar, hips)

    def _entender_com_contexto(self, fala: Fala, s: Sessao) -> List[Hipotese]:
        hips = self.motor.entender(fala, s.contexto, self.relogio())
        cont = self._continuacao(fala, s)
        if cont is not None and (not hips or hips[0].confianca < 0.86 or fala.texto.startswith("e ")):
            hips = [cont] + [h for h in hips if h.intencao != cont.intencao]
        return hips

    def _continuacao(self, fala: Fala, s: Sessao) -> Optional[Hipotese]:
        """"e amanhã?" depois da agenda; "e o word?" depois de abrir um app."""
        ctx = s.contexto
        if not ctx.ultima_intencao:
            return None
        t = fala.texto
        if not (t.startswith("e ") or len(t.split()) <= 3):
            return None
        resto = re.sub(r"^e\s+(?:o|a|os|as|para|pra|no|na|do|da|de)?\s*", "", t).strip()
        h = self.motor.habilidades.get(ctx.ultima_intencao)
        if h is None or not resto:
            return None
        novos = dict(ctx.ultimos_slots)
        mudou = False
        sub = Fala(original=fala.original, texto=resto, urls=fala.urls)
        for nome, d in h.slots.items():
            if d.tipo in TIPOS_GAZETTEER:
                a = self.lexico.gaz(d.tipo).resolver(resto) or next(iter(self.lexico.gaz(d.tipo).buscar_em(resto)), None)
                if a:
                    novos[nome] = Valor(d.tipo, a.entidade.id, resto, a.entidade, a.score)
                    mudou = True
            elif d.tipo == "tempo":
                v, _ = resolver(SlotDef(nome, "tempo", fonte="frase"), None, sub, self.lexico, ctx, self.relogio())
                if v is not None:
                    novos[nome] = v
                    mudou = True
        if not mudou:
            return None
        return Hipotese(h.id, 0.87, novos, "contexto", "", [], fala.texto)

    def _compostos(self, fala: Fala, hips: List[Hipotese], s: Sessao) -> Optional[List[Hipotese]]:
        if hips and hips[0].confianca >= 0.93 and hips[0].fonte == "gramatica":
            return None
        partes = [p for p in _CONECTORES.split(fala.texto) if p.strip()]
        if len(partes) < 2:
            partes = self._dividir_no_e(fala.texto)
        if len(partes) < 2:
            return None
        seq: List[Hipotese] = []
        for p in partes:
            sub = Fala(original=fala.original, texto=p.strip(), urls=fala.urls)
            hs = self.motor.entender(sub, s.contexto, self.relogio(), usar_llm=False)
            if not hs or hs[0].confianca < 0.8:
                return None
            seq.append(hs[0])
        # "abre o youtube e pesquisa X" → pesquisa dentro do site
        unidos: List[Hipotese] = []
        for h in seq:
            ant = unidos[-1] if unidos else None
            if (ant is not None and ant.intencao == "site.abrir" and h.intencao in ("web.pesquisar", "youtube.tocar")
                    and ant.slots.get("site") and ant.slots["site"].entidade.dados.get("busca")):
                consulta = h.slots.get("consulta") or h.slots.get("musica")
                if consulta is not None:
                    if ant.slots["site"].entidade.id == "youtube" and h.intencao == "youtube.tocar":
                        unidos[-1] = h
                    else:
                        unidos[-1] = Hipotese("site.pesquisar", min(ant.confianca, h.confianca),
                                              {"site": ant.slots["site"], "consulta": consulta}, "composto", "", [], fala.texto)
                    continue
            unidos.append(h)
        return unidos

    def _dividir_no_e(self, texto: str) -> List[str]:
        toks = texto.split()
        verbos = set()
        for fam in ("abrir", "fechar", "tocar", "pesquisar", "mostrar", "criar", "lembrar", "anotar", "aumentar",
                    "diminuir", "silenciar", "capturar", "enviar", "agendar", "publicar", "calcular", "ir", "pausar"):
            verbos |= {f for f in self.lexico.familia(fam) if " " not in f}
        for i, t in enumerate(toks):
            if t == "e" and 1 < i < len(toks) - 1 and toks[i + 1] in verbos:
                return [" ".join(toks[:i]), " ".join(toks[i + 1:])]
        return []

    def _executar_fila(self, hips: List[Hipotese], fala: Fala, s: Sessao, executar: bool, ao_iniciar) -> Resposta:
        falas: List[str] = []
        execucao: List[Dict[str, Any]] = []
        planos: List[Dict[str, Any]] = []
        ultimo: Optional[Resposta] = None
        for i, h in enumerate(hips):
            r = self._atender(h, fala, s, executar, ao_iniciar, [h])
            ultimo = r
            if r.fala:
                falas.append(r.fala)
            execucao.extend(r.execucao)
            planos.extend(r.planos)
            if r.estado not in ("ok",):
                s.fila = hips[i + 1:]
                break
        r = ultimo or Resposta("", "ok")
        r.fala = " ".join(falas)
        r.execucao = execucao
        r.planos = planos
        r.hipoteses = [h.json() for h in hips]
        return r

    # ------------------------------------------------------------ pendências
    def _pergunta_pendente(self, p: Pendente) -> str:
        if p.tipo == "confirmacao":
            return p.plano.confirmacao if p.plano and p.plano.confirmacao else "Confirma?"
        if p.tipo == "slot":
            return p.slot.pergunta or "Pode completar o pedido?"
        if p.tipo == "desambiguacao":
            descr = [self.motor.habilidades[o.intencao].descricao.lower() for o in p.opcoes]
            return "Você quer %s ou %s?" % (descr[0], descr[1])
        return "Pode repetir?"

    def _resolver_pendente(self, texto: str, fala: Fala, s: Sessao, executar: bool, ao_iniciar) -> Optional[Resposta]:
        p = s.pendente
        nega = self.norm.pertence(texto, "negacao") or self.norm.pertence(texto, "cancelamento")
        if p.tipo == "confirmacao":
            ok = self.norm.pertence(texto, "confirmacao")
            if p.forte:
                ok = bool(re.search(r"\bconfirmo\b", fala.texto))
            if ok:
                s.pendente = None
                r = self._executar_plano(p.plano, p.hipotese, fala, s, executar, ao_iniciar)
                return self._seguir_fila(r, fala, s, executar, ao_iniciar)
            if nega:
                s.pendente = None
                s.fila = []
                return Resposta(R.escolher(R.CANCELADO, self.rng), "cancelado", texto=fala.texto)
            hips = self.motor.entender(fala, s.contexto, self.relogio(), usar_llm=False)
            if hips and hips[0].confianca >= 0.85:
                s.pendente = None
                s.fila = []
                return None  # é um comando novo
            p.tentativas += 1
            if p.tentativas > 2:
                s.pendente = None
                return Resposta("Deixei de lado. Pode pedir de novo quando quiser.", "cancelado", texto=fala.texto)
            return Resposta("Não entendi. %s Responda sim ou não." % self._pergunta_pendente(p), "confirmacao",
                            texto=fala.texto, aguardando=True)

        if p.tipo == "desambiguacao":
            if nega:
                s.pendente = None
                return Resposta(R.escolher(R.CANCELADO, self.rng), "cancelado", texto=fala.texto)
            t = re.sub(r"^(?:a|o)\s+", "", fala.texto).strip()
            escolha = _ORDINAIS_ESCOLHA.get(t) if t in _ORDINAIS_ESCOLHA else None
            if escolha is None and self.norm.pertence(texto, "confirmacao"):
                escolha = 0
            if escolha is None:
                for i, o in enumerate(p.opcoes):
                    desc = self.motor.habilidades[o.intencao].descricao.lower()
                    if any(w in dobrar(desc) for w in fala.tokens() if len(w) > 3):
                        escolha = i
                        break
            if escolha is not None and escolha < len(p.opcoes):
                s.pendente = None
                return self._atender(p.opcoes[escolha], fala, s, executar, ao_iniciar, p.opcoes)
            s.pendente = None
            return None

        if p.tipo == "slot":
            if nega:
                s.pendente = None
                s.fila = []
                return Resposta(R.escolher(R.CANCELADO, self.rng), "cancelado", texto=fala.texto)
            d = p.slot
            capt = fala.texto if d.tipo not in ("tempo",) else None
            v, ok = resolver(SlotDef(d.nome, d.tipo, fonte="frase" if d.tipo in ("tempo", "numeros") else "captura",
                                     livre_se_falhar=d.livre_se_falhar), capt, fala, self.lexico, s.contexto, self.relogio())
            if v is None and d.tipo in TIPOS_GAZETTEER:
                achados = self.lexico.gaz(d.tipo).buscar_em(fala.texto)
                if achados:
                    a = achados[0]
                    v = Valor(d.tipo, a.entidade.id, a.alias, a.entidade, a.score)
            if v is not None:
                hip = p.hipotese
                hip.slots[d.nome] = v
                hip.faltando = [n for n in hip.faltando if n != d.nome]
                s.pendente = None
                return self._atender(hip, fala, s, executar, ao_iniciar, [hip])
            hips = self.motor.entender(fala, s.contexto, self.relogio(), usar_llm=False)
            if hips and hips[0].confianca >= 0.88:
                s.pendente = None
                return None
            p.tentativas += 1
            if p.tentativas > 1:
                s.pendente = None
                return Resposta("Não consegui entender. Vamos recomeçar: pode fazer o pedido completo?", "nao_entendi",
                                texto=fala.texto)
            return Resposta("Não peguei. %s" % self._pergunta_pendente(p), "pergunta", texto=fala.texto, aguardando=True)
        return None

    def _seguir_fila(self, r: Resposta, fala: Fala, s: Sessao, executar: bool, ao_iniciar) -> Resposta:
        if r.estado == "ok" and s.fila and s.pendente is None:
            fila, s.fila = s.fila, []
            r2 = self._executar_fila(fila, fala, s, executar, ao_iniciar)
            r2.fala = (r.fala + " " + r2.fala).strip()
            r2.execucao = r.execucao + r2.execucao
            return r2
        return r

    # ------------------------------------------------------------- atender
    def _atender(self, hip: Hipotese, fala: Fala, s: Sessao, executar: bool, ao_iniciar,
                 hips: List[Hipotese]) -> Resposta:
        h = self.motor.habilidades.get(hip.intencao)
        if h is None:
            return self._nao_entendi(fala.original, fala, s, hips)
        if hip.faltando:
            nome = hip.faltando[0]
            d = h.slots.get(nome) or SlotDef(nome)
            s.pendente = Pendente("slot", hipotese=hip, slot=d)
            return self._resposta(d.pergunta or "Pode completar?", "pergunta", hip, fala, hips, aguardando=True)
        try:
            plano = construir(h, hip, fala, self.amb)
        except PrecisaSlot as e:
            d = h.slots.get(e.nome) or SlotDef(e.nome, e.tipo, pergunta=e.pergunta)
            d = SlotDef(d.nome, d.tipo, True, e.pergunta, fonte=d.fonte)
            hip.faltando = [e.nome]
            s.pendente = Pendente("slot", hipotese=hip, slot=d)
            return self._resposta(e.pergunta, "pergunta", hip, fala, hips, aguardando=True)
        except Exception as e:  # noqa: BLE001
            return self._resposta("Tive um problema ao montar esse pedido: %s" % e, "erro", hip, fala, hips)
        decisao = self.politica.avaliar(plano.risco, hip.confianca, hip.fonte)
        if decisao.acao == "bloquear":
            return self._resposta("Essa ação é destrutiva e está bloqueada por segurança.", "erro", hip, fala, hips, plano)
        if decisao.acao == "esclarecer":
            return self._nao_entendi(fala.original, fala, s, hips)
        if decisao.acao in ("confirmar", "confirmar_forte"):
            if not plano.confirmacao:
                plano.confirmacao = self._frase_confirmacao(h, hip)
            if decisao.acao == "confirmar_forte":
                plano.confirmacao += " Para confirmar, diga: confirmo."
            s.pendente = Pendente("confirmacao", hipotese=hip, plano=plano, forte=decisao.acao == "confirmar_forte")
            return self._resposta(plano.confirmacao, "confirmacao", hip, fala, hips, plano, aguardando=True)
        return self._executar_plano(plano, hip, fala, s, executar, ao_iniciar, hips)

    def _frase_confirmacao(self, h, hip: Hipotese) -> str:
        detalhes = []
        for nome, v in hip.slots.items():
            if v.extra.get("padrao"):
                continue
            if v.entidade is not None:
                detalhes.append(v.entidade.nome)
            elif v.tipo == "tempo":
                detalhes.append(str(v.extra.get("desc") or v.texto))
            elif v.valor not in (None, ""):
                detalhes.append(R.numero_falado(v.valor) if not isinstance(v.valor, list) else ", ".join(map(R.numero_falado, v.valor)))
        base = "Entendi: %s" % h.descricao[:1].lower() + h.descricao[1:]
        if detalhes:
            base += " — %s" % "; ".join(str(d) for d in detalhes)
        return base + "." + R.CONFIRMA_SUFIXO

    def _executar_plano(self, plano: Plano, hip: Optional[Hipotese], fala: Fala, s: Sessao, executar: bool,
                        ao_iniciar, hips: Optional[List[Hipotese]] = None) -> Resposta:
        if hip is not None:
            s.contexto.lembrar(hip.intencao, hip.slots)
        if ao_iniciar and plano.fala and plano.passos:
            try:
                ao_iniciar(plano.fala)
            except Exception:  # noqa: BLE001
                pass
        res: List[ResultadoPasso] = []
        if executar and plano.passos:
            res = self.executores.executar(plano)
        ok = all(r.ok for r in res) and (len(res) >= len([p for p in plano.passos]) or not executar)
        fala_final = plano.fala
        if executar and plano.passos:
            resumo = None
            if plano.resumir:
                try:
                    resumo = plano.resumir(res)
                except Exception:  # noqa: BLE001
                    resumo = None
            if ok:
                fala_final = resumo or plano.fala
            else:
                falhou = next((r for r in res if not r.ok), None)
                erro = (falhou.erro if falhou else "etapa não executada").split("\n")[0][:160]
                descr = (falhou.passo.descricao if falhou and falhou.passo.descricao else "executar").lower()
                fala_final = resumo or "Não consegui %s: %s." % (descr, erro)
        estado = "ok" if ok else "erro"
        aguardando = False
        if ok and executar and plano.continuacao:
            try:
                prox = plano.continuacao(res)
            except Exception:  # noqa: BLE001
                prox = None
            if prox is not None:
                s.pendente = Pendente("confirmacao", hipotese=hip, plano=prox)
                fala_final = (fala_final + " " + prox.confirmacao).strip()
                estado = "confirmacao"
                aguardando = True
        r = self._resposta(fala_final, estado, hip, fala, hips or ([hip] if hip else []), plano, aguardando=aguardando)
        r.execucao = [x.json() for x in res]
        r.fala_inicial = plano.fala
        r.dormir = plano.dormir
        return r

    def _resposta(self, falar: str, estado: str, hip: Optional[Hipotese], fala: Fala, hips: List[Hipotese],
                  plano: Optional[Plano] = None, aguardando: bool = False) -> Resposta:
        return Resposta(falar, estado, hip.intencao if hip else None, hip.confianca if hip else 0.0,
                        hip.fonte if hip else "", fala.texto, [x.json() for x in hips[:3]],
                        [plano.json()] if plano else [], [], aguardando)

    def _nao_entendi(self, texto: str, fala: Fala, s: Sessao, hips: List[Hipotese]) -> Resposta:
        if self._log_nao_entendidos:
            try:
                self._log_nao_entendidos.parent.mkdir(parents=True, exist_ok=True)
                with self._log_nao_entendidos.open("a", encoding="utf-8") as f:
                    f.write(json.dumps({"em": self.relogio().isoformat(timespec="seconds"), "original": texto,
                                        "texto": fala.texto, "palpites": [h.json() for h in hips[:2]]}, ensure_ascii=False) + "\n")
            except OSError:
                pass
        if self.llm is not None and len(fala.tokens()) >= 3 and self.llm.disponivel():
            resposta = self.llm.responder(fala.original, list(s.historico))
            if resposta:
                return Resposta(resposta, "ok", "conversa.livre", 0.5, "llm", fala.texto, [h.json() for h in hips[:2]])
        return Resposta(R.escolher(R.NAO_ENTENDI, self.rng), "nao_entendi", None, 0.0, "", fala.texto,
                        [h.json() for h in hips[:2]], aguardando=True)

    # ------------------------------------------------------------- lembretes
    def iniciar_lembretes(self, ao_disparar: Callable[[Dict], None]) -> None:
        def disparar(item: Dict) -> None:
            try:
                self.desktop.executar([Passo("desktop", "notify", {"title": "Jarvis — lembrete", "message": item["texto"]})])
            except Exception:  # noqa: BLE001
                pass
            ao_disparar(item)
        self.lembretes.iniciar(disparar)

    def estatisticas(self) -> Dict[str, Any]:
        return {"lexico": self.lexico.estatisticas(), "motor": self.motor.cobertura(),
                "executores": {"desktop": type(self.desktop).__name__, "jos": type(self.jos).__name__,
                               "llm": bool(self.llm and self.llm.disponivel())}}
