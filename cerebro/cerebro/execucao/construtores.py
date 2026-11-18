"""Construtores de plano: transformam uma hipótese entendida em passos executáveis.

Cada habilidade declara no YAML um ``construtor`` (função aqui), um ``local``
(resposta calculada na hora) ou passos ``desktop`` com modelos ``{slot.campo}``.
"""
from __future__ import annotations

import random
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional
from urllib.parse import quote, quote_plus

from rapidfuzz import fuzz, process

from ..dialogo.respostas import (data_falada, escolher, hora_falada, numero_falado, renderizar,
                                 saudacao_do_horario)
from ..nlu.modelo import Habilidade, Hipotese, Valor
from ..nlu.slots import limpar_livre
from ..texto import tempo as tempo_mod
from ..texto.basico import dobrar
from ..texto.numeros import numeros_em, ordinal
from . import calculo
from .base import Passo, Plano, PrecisaSlot, ResultadoPasso


@dataclass
class Ambiente:
    lexico: Any
    motor: Any = None
    llm: Any = None
    lembretes: Any = None
    nome_usuario: str = "Jair"
    rng: random.Random = field(default_factory=random.Random)
    relogio: Callable[[], datetime] = datetime.now
    ao_aprender: Optional[Callable[[], None]] = None

    @property
    def agora(self) -> datetime:
        return self.relogio()


Construtor = Callable[[Habilidade, Hipotese, Any, Ambiente], Plano]
CONSTRUTORES: Dict[str, Construtor] = {}
LOCAIS: Dict[str, Construtor] = {}


def construtor(nome: str):
    def reg(f):
        CONSTRUTORES[nome] = f
        return f
    return reg


def local(nome: str):
    def reg(f):
        LOCAIS[nome] = f
        return f
    return reg


# ----------------------------------------------------------------- utilidades
def _ack(h: Habilidade, hip: Hipotese, amb: Ambiente, extra: Optional[Dict] = None) -> str:
    return renderizar(escolher(h.respostas, amb.rng), hip.slots, extra)


def _val(hip: Hipotese, nome: str, campo: Optional[str] = None, padrao: Any = None) -> Any:
    v = hip.slots.get(nome)
    if v is None:
        return padrao
    r = v.campo(campo) if campo else v.valor
    return padrao if r in (None, "") else r


def _preencher(obj: Any, slots: Dict[str, Valor]) -> Any:
    if isinstance(obj, dict):
        return {k: _preencher(v, slots) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_preencher(v, slots) for v in obj]
    if isinstance(obj, str):
        m = re.fullmatch(r"\{([a-z_]+)(?:\.([a-z_]+))?\}", obj)
        if m:
            v = slots.get(m.group(1))
            if v is None:
                return None
            return v.campo(m.group(2)) if m.group(2) else v.valor
        if "{" in obj:
            return renderizar(obj, slots)
    return obj


def _slug(texto: str, n: int = 48) -> str:
    s = unicodedata.normalize("NFD", texto.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_")[:n] or "nota"


def _lista(obj: Any, *chaves: str) -> List[Any]:
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict):
        for k in chaves + ("items", "itens", "resultados", "results", "tarefas", "data", "lista"):
            if isinstance(obj.get(k), list):
                return obj[k]
    return []


def _titulo(item: Any) -> str:
    if isinstance(item, dict):
        return str(item.get("title") or item.get("titulo") or item.get("name") or item.get("nome") or item.get("texto") or "")
    return str(item)


def _frase_original(fala) -> str:
    """Pedido original sem a palavra de despertar, com acentos (para mandar ao JOS)."""
    s = re.sub(r"^\s*(?:(?:ei|hey|oi|ok|ola|fala|o)\s*,?\s*)?(?:jarvis|jair os|jairo|jair)\b[\s,]*", "", fala.original, flags=re.I)
    return s.strip() or fala.original


def _acao_jos(ferramenta: str, args: Dict[str, Any], descricao: str = "") -> Passo:
    return Passo("jos", ferramenta, {k: v for k, v in args.items() if v not in (None, "", [])}, descricao)


def construir(h: Habilidade, hip: Hipotese, fala, amb: Ambiente) -> Plano:
    """Monta o plano de uma hipótese (pode lançar ``PrecisaSlot``)."""
    acao = h.acao or {}
    if "construtor" in acao:
        f = CONSTRUTORES.get(acao["construtor"])
        if f is None:
            raise KeyError("construtor desconhecido: %s" % acao["construtor"])
        plano = f(h, hip, fala, amb)
    elif "local" in acao:
        plano = LOCAIS[acao["local"]](h, hip, fala, amb)
    elif acao.get("executor") == "desktop":
        passos = [Passo("desktop", p["action"], _preencher(p.get("payload") or {}, hip.slots), p.get("description", ""))
                  for p in acao.get("passos") or []]
        plano = Plano(h.id, passos, h.nivel_risco, _ack(h, hip, amb))
    else:
        plano = Plano(h.id, [], h.nivel_risco, _ack(h, hip, amb))
    if not plano.fala:
        plano.fala = _ack(h, hip, amb)
    if not plano.risco:
        plano.risco = h.nivel_risco
    if h.confirmacao and not plano.confirmacao:
        plano.confirmacao = renderizar(h.confirmacao, hip.slots)
    return plano


# ===================================================================== sistema
@construtor("abrir_app")
def abrir_app(h, hip, fala, amb):
    v = hip.slots["app"]
    e = v.entidade
    chave = e.dados.get("mac") or e.id

    def resumo(res):
        if res and not res[-1].ok and "não autorizado" in (res[-1].erro or ""):
            return ("O executor do iMac ainda não tem permissão para abrir %s. Adicione \"%s\" em allowed_apps "
                    "no config do always_on." % (e.nome, chave))
        if res and not res[-1].ok and "não encontrei" in (res[-1].erro or ""):
            return "Não encontrei o %s instalado neste computador." % e.nome
        return None
    payload = {"name": chave, "nome": e.nome, "mac_app": e.dados.get("mac_app"), "windows": e.dados.get("windows"),
               "aliases": list(e.aliases[:8])}
    return Plano(h.id, [Passo("desktop", "open_app", payload, "Abrir %s" % e.nome)], 0, _ack(h, hip, amb), resumir=resumo)


@construtor("volume_diminuir")
def volume_diminuir(h, hip, fala, amb):
    delta = -abs(int(float(_val(hip, "delta", padrao=10))))
    return Plano(h.id, [Passo("desktop", "system_volume", {"delta": delta}, "Diminuir volume")], 1, _ack(h, hip, amb))


_RECURSOS = {"disco": "disk_usage", "memoria": "performance_health", "cpu": "performance_health",
             "processos": "process_list", "janelas": "window_list", "rede": "network_snapshot", "bateria": "system_snapshot"}


def _gb(n: Any) -> str:
    try:
        return numero_falado(round(float(n) / 1024 ** 3, 1))
    except (TypeError, ValueError):
        return "?"


@construtor("recurso_sistema")
def recurso_sistema(h, hip, fala, amb):
    rid = _val(hip, "recurso", padrao="disco")
    acao = _RECURSOS.get(rid, "system_snapshot")
    payload = {"limit": 40} if acao in ("process_list", "window_list") else {}

    def resumo(res):
        if not res or not res[-1].ok:
            return None
        r = res[-1].resultado or {}
        if acao == "disk_usage" and r.get("disks"):
            d = r["disks"][0]
            return "Você tem %s GB livres de %s GB no disco." % (_gb(d.get("free")), _gb(d.get("total")))
        if acao == "process_list":
            return "Há %d processos em execução." % len(r.get("processes") or [])
        if acao == "window_list":
            nomes = [str(w.get("app") or w.get("name") or w) for w in (r.get("windows") or [])][:5]
            return "Janelas abertas: %s." % ", ".join(nomes) if nomes else "Não encontrei janelas abertas."
        if acao == "performance_health":
            mem = r.get("memory") or r.get("memoria") or {}
            uso = mem.get("percent") or mem.get("used_percent")
            cpu = r.get("cpu_percent") or (r.get("cpu") or {}).get("percent")
            partes = []
            if uso is not None:
                partes.append("memória em %s por cento" % numero_falado(round(float(uso))))
            if cpu is not None:
                partes.append("processador em %s por cento" % numero_falado(round(float(cpu))))
            return ("Agora: %s." % " e ".join(partes)) if partes else "Verificação de desempenho concluída."
        return "Verificação concluída."
    return Plano(h.id, [Passo("desktop", acao, payload, "Verificar %s" % rid)], 0, _ack(h, hip, amb), resumir=resumo)


def _padrao_busca(consulta: str) -> str:
    palavras = [w for w in re.findall(r"[a-z0-9]+", dobrar(consulta)) if len(w) > 2 and w not in ("das", "dos", "com", "para", "uma")]
    return "*" + "*".join(palavras[:4]) + "*" if palavras else "*"


_RAIZES = ["~/Desktop", "~/Documents", "~/Downloads"]


@construtor("procurar_arquivo")
def procurar_arquivo(h, hip, fala, amb):
    consulta = str(_val(hip, "consulta", padrao=""))
    padrao = _padrao_busca(consulta)
    passos = [Passo("desktop", "search_files", {"root": r, "pattern": padrao, "limit": 20}, "Buscar em %s" % r) for r in _RAIZES]

    def resumo(res):
        itens = []
        for r in res:
            if r.ok and isinstance(r.resultado, dict):
                itens.extend(r.resultado.get("items") or [])
        if not itens:
            return "Não encontrei arquivos com %s." % consulta
        nomes = [str(i.get("path", "")).rsplit("/", 1)[-1] for i in itens[:3]]
        return "Encontrei %d arquivo%s. Os primeiros: %s." % (len(itens), "" if len(itens) == 1 else "s", "; ".join(nomes))
    return Plano(h.id, passos, 0, _ack(h, hip, amb), resumir=resumo)


@construtor("abrir_arquivo")
def abrir_arquivo(h, hip, fala, amb):
    consulta = str(_val(hip, "consulta", padrao=""))
    padrao = _padrao_busca(consulta)

    def buscar_e_abrir(ex):
        itens = []
        for raiz in _RAIZES:
            res = ex.desktop.executar([Passo("desktop", "search_files", {"root": raiz, "pattern": padrao, "limit": 30})])
            if res and res[0].ok and isinstance(res[0].resultado, dict):
                itens.extend(res[0].resultado.get("items") or [])
        if not itens:
            return {"ok": False, "erro": "não encontrei %s" % consulta}
        nomes = [str(i.get("path", "")).rsplit("/", 1)[-1] for i in itens]
        melhor = process.extractOne(dobrar(consulta), [dobrar(n) for n in nomes], scorer=fuzz.token_set_ratio)
        caminho = itens[melhor[2] if melhor else 0]["path"]
        r = ex.desktop.executar([Passo("desktop", "open_file", {"path": caminho})])
        return {"ok": bool(r and r[0].ok), "aberto": caminho, "erro": r[0].erro if r else ""}

    def resumo(res):
        r = res[-1].resultado if res else None
        if isinstance(r, dict) and r.get("aberto"):
            return "Abri %s." % str(r["aberto"]).rsplit("/", 1)[-1]
        return None
    return Plano(h.id, [Passo("funcao", "buscar_e_abrir", {"consulta": consulta}, "Buscar e abrir arquivo", buscar_e_abrir)],
                 0, _ack(h, hip, amb), resumir=resumo)


# ========================================================================= web
@construtor("pesquisar_site")
def pesquisar_site(h, hip, fala, amb):
    site = hip.slots["site"].entidade
    consulta = str(_val(hip, "consulta", padrao=""))
    modelo = site.dados.get("busca")
    if modelo:
        url = str(modelo).replace("{q}", quote_plus(consulta))
    else:
        url = "https://www.google.com/search?q=" + quote_plus("%s %s" % (consulta, site.nome))
    return Plano(h.id, [Passo("desktop", "open_url", {"url": url}, "Pesquisar no %s" % site.nome)], 0, _ack(h, hip, amb))


@construtor("pesquisar_web")
def pesquisar_web(h, hip, fala, amb):
    consulta = str(_val(hip, "consulta", padrao=""))
    url = "https://www.google.com/search?q=" + quote_plus(consulta)
    return Plano(h.id, [Passo("desktop", "open_url", {"url": url}, "Pesquisar no Google")], 0, _ack(h, hip, amb))


@construtor("responder_pergunta")
def responder_pergunta(h, hip, fala, amb):
    pergunta = _frase_original(fala)
    url = "https://www.google.com/search?q=" + quote_plus(pergunta)
    if amb.llm is not None and amb.llm.disponivel():
        def responder(ex):
            r = amb.llm.responder(pergunta)
            return {"ok": bool(r), "resposta": r, "erro": "sem resposta do modelo local"}

        def resumo(res):
            r = res[-1].resultado if res else None
            return r.get("resposta") if isinstance(r, dict) and r.get("resposta") else None
        return Plano(h.id, [Passo("funcao", "llm_responder", {"pergunta": pergunta}, "Responder com IA local", responder)],
                     0, "Deixa eu pensar.", resumir=resumo)
    return Plano(h.id, [Passo("desktop", "open_url", {"url": url}, "Pesquisar a pergunta")], 0,
                 "Vou pesquisar isso para você.")


# ====================================================================== google
def _url_agenda(t: tempo_mod.Tempo) -> str:
    d = t.inicio
    vista = "week" if t.granularidade == "semana" else "day"
    return "https://calendar.google.com/calendar/r/%s/%d/%d/%d" % (vista, d.year, d.month, d.day)


@construtor("agenda_consultar")
def agenda_consultar(h, hip, fala, amb):
    v = hip.slots.get("quando")
    t = v.extra.get("tempo") if v else None
    if t is None:
        t = tempo_mod.Tempo(inicio=amb.agora, granularidade="dia")
    return Plano(h.id, [Passo("desktop", "open_url", {"url": _url_agenda(t)}, "Abrir agenda")], 0, _ack(h, hip, amb))


@construtor("agenda_criar")
def agenda_criar(h, hip, fala, amb):
    titulo = str(_val(hip, "titulo", padrao="Compromisso"))
    t = hip.slots["quando"].extra.get("tempo")
    if t.tem_hora:
        ini = t.inicio
        fim = ini + timedelta(hours=1)
        datas = "%s/%s" % (ini.strftime("%Y%m%dT%H%M00"), fim.strftime("%Y%m%dT%H%M00"))
    else:
        datas = "%s/%s" % (t.inicio.strftime("%Y%m%d"), (t.inicio + timedelta(days=1)).strftime("%Y%m%d"))
    url = ("https://calendar.google.com/calendar/render?action=TEMPLATE&text=%s&dates=%s&ctz=America/Sao_Paulo"
           % (quote_plus(titulo[:1].upper() + titulo[1:]), datas))
    return Plano(h.id, [Passo("desktop", "open_url", {"url": url}, "Abrir evento preenchido")], 1, _ack(h, hip, amb))


@construtor("gmail_escrever")
def gmail_escrever(h, hip, fala, amb):
    dest = hip.slots.get("destinatario")
    email = ""
    nome = ""
    if dest is not None:
        if dest.entidade is not None:
            email = str(dest.entidade.dados.get("email") or "")
            nome = dest.entidade.nome
        else:
            m = re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", str(dest.valor))
            email = m.group(0) if m else ""
            nome = str(dest.valor)
    corpo = str(_val(hip, "texto", padrao=""))
    assunto = corpo[:60] if corpo else ""
    url = "https://mail.google.com/mail/?view=cm&fs=1&to=%s&su=%s&body=%s" % (quote(email), quote(assunto), quote(corpo))
    fala_ = "Abri um rascunho para %s no Gmail. Revise e envie." % (nome or email or "o destinatário")
    return Plano(h.id, [Passo("desktop", "open_url", {"url": url}, "Abrir rascunho do Gmail")], 1, fala_)


def _turma_id(ex, turma: Valor) -> Dict[str, str]:
    e = turma.entidade
    conta = None  # sem conta definida, o conector do JOS usa a conta padrão dele
    if e is not None:
        conta = e.dados.get("classroom_conta") or None
        if e.dados.get("classroom_id"):
            return {"id": str(e.dados["classroom_id"]), "conta": conta, "nome": e.nome}
    nome = e.nome if e is not None else str(turma.valor)
    lista = _lista(ex.jos.chamar("jair_os_classroom_turmas", {"conta": conta} if conta else {}), "turmas", "courses")
    if not lista:
        raise RuntimeError("nenhuma turma no Classroom")
    nomes = [dobrar(_titulo(t)) for t in lista]
    alvo = dobrar(nome)
    codigo = re.search(r"\d{3,4}", alvo)
    idx = None
    if codigo:
        for i, n in enumerate(nomes):
            if codigo.group(0) in n:
                idx = i
                break
    if idx is None:
        m = process.extractOne(alvo, nomes, scorer=fuzz.token_set_ratio, score_cutoff=70)
        if not m:
            raise RuntimeError("não achei a turma %s no Classroom" % nome)
        idx = m[2]
    t = lista[idx]
    return {"id": str(t.get("id") or t.get("turma_id") or t.get("courseId")), "conta": conta, "nome": _titulo(t)}


@construtor("classroom_avisos")
def classroom_avisos(h, hip, fala, amb):
    turma = hip.slots["turma"]

    def ver(ex):
        t = _turma_id(ex, turma)
        r = ex.jos.chamar("jair_os_classroom_avisos", {"turma_id": t["id"], "conta": t["conta"], "limite": 5})
        return {"ok": True, "turma": t, "avisos": _lista(r, "avisos", "announcements")}

    def resumo(res):
        r = res[-1].resultado if res else {}
        avisos = (r or {}).get("avisos") or []
        if not avisos:
            return "Não há avisos recentes no mural."
        textos = [str(a.get("text") or a.get("texto") or _titulo(a))[:90] for a in avisos[:2]]
        return "O mural tem %d aviso%s recente%s. O último diz: %s" % (
            len(avisos), "" if len(avisos) == 1 else "s", "" if len(avisos) == 1 else "s", textos[0])
    return Plano(h.id, [Passo("funcao", "classroom_avisos", {"turma": turma.valor}, "Ler mural", ver)], 0,
                 _ack(h, hip, amb), resumir=resumo)


@construtor("classroom_publicar")
def classroom_publicar(h, hip, fala, amb):
    turma = hip.slots["turma"]
    texto = str(_val(hip, "texto"))
    texto = texto[:1].upper() + texto[1:]

    def publicar(ex):
        t = _turma_id(ex, turma)
        r = ex.jos.chamar("jair_os_classroom_publicar", {"turma_id": t["id"], "texto": texto, "conta": t["conta"],
                                                          "tipo": "aviso", "confirmar": True})
        return {"ok": True, "turma": t, "resposta": r}
    return Plano(h.id, [Passo("funcao", "classroom_publicar", {"turma": turma.valor, "texto": texto}, "Publicar aviso", publicar)],
                 3, _ack(h, hip, amb), confirmacao=renderizar(h.confirmacao, hip.slots),
                 resumir=lambda res: "Aviso publicado na %s." % (turma.entidade.nome if turma.entidade else turma.valor))


# ========================================================================= JOS
_PRIORIDADE = [(r"\b(urgente|urgentissimo|prioridade maxima|critico|critica)\b", 4),
               (r"\b(importante|prioridade alta|alta prioridade)\b", 3),
               (r"\b(sem pressa|quando der|baixa prioridade|prioridade baixa)\b", 1)]


def _prioridade(texto: str) -> Optional[int]:
    for padrao, p in _PRIORIDADE:
        if re.search(padrao, texto):
            return p
    return None


def _limpar_prioridade(titulo: str) -> str:
    for padrao, _ in _PRIORIDADE:
        titulo = re.sub(padrao, "", titulo, flags=re.I)
    return " ".join(titulo.split()).strip(" ,")


@construtor("tarefa_criar")
def tarefa_criar(h, hip, fala, amb):
    titulo = limpar_livre(_limpar_prioridade(str(_val(hip, "titulo"))), "texto")
    titulo = titulo[:1].upper() + titulo[1:]
    prazo = _val(hip, "quando", "iso")
    args = {"titulo": titulo, "prazo": prazo, "prioridade": _prioridade(fala.texto), "status": "planned" if prazo else "inbox"}
    falar = "Tarefa criada: %s%s." % (titulo, (", para " + hip.slots["quando"].extra.get("desc", "")) if prazo else "")
    return Plano(h.id, [_acao_jos("jair_os_criar_tarefa", args, "Criar tarefa")], 2, falar)


@construtor("tarefa_listar")
def tarefa_listar(h, hip, fala, amb):
    consulta = _val(hip, "consulta")
    args = {"consulta": consulta, "limite": 10}

    def resumo(res):
        itens = _lista(res[-1].resultado if res else None, "tarefas")
        if not itens:
            return "Você não tem tarefas abertas%s." % (" sobre " + str(consulta) if consulta else "")
        tit = [_titulo(t) for t in itens[:3]]
        return "Você tem %d tarefa%s aberta%s. As principais: %s." % (
            len(itens), "" if len(itens) == 1 else "s", "" if len(itens) == 1 else "s", "; ".join(tit))
    return Plano(h.id, [_acao_jos("jair_os_tarefas", args, "Listar tarefas")], 0, _ack(h, hip, amb), resumir=resumo)


@construtor("tarefa_concluir")
def tarefa_concluir(h, hip, fala, amb):
    consulta = str(_val(hip, "consulta"))

    def concluir(ex):
        itens = _lista(ex.jos.chamar("jair_os_tarefas", {"limite": 50}), "tarefas")
        if not itens:
            return {"ok": False, "erro": "não há tarefas abertas"}
        nomes = [dobrar(_titulo(t)) for t in itens]
        m = process.extract(dobrar(consulta), nomes, scorer=fuzz.token_set_ratio, limit=2)
        if not m or m[0][1] < 70:
            return {"ok": False, "erro": "não achei uma tarefa parecida com %s" % consulta}
        if len(m) > 1 and m[1][1] >= m[0][1] - 3 and m[1][1] >= 80:
            return {"ok": False, "erro": "achei mais de uma: %s e %s; diga qual" % (_titulo(itens[m[0][2]]), _titulo(itens[m[1][2]]))}
        alvo = itens[m[0][2]]
        ex.jos.chamar("jair_os_atualizar_tarefa", {"id": alvo.get("id"), "status": "done"})
        return {"ok": True, "tarefa": _titulo(alvo)}

    def resumo(res):
        r = res[-1].resultado if res else {}
        return "Marquei como concluída: %s." % r.get("tarefa") if isinstance(r, dict) and r.get("tarefa") else None
    return Plano(h.id, [Passo("funcao", "tarefa_concluir", {"consulta": consulta}, "Concluir tarefa", concluir)], 2,
                 _ack(h, hip, amb), resumir=resumo)


@construtor("lembrete_criar")
def lembrete_criar(h, hip, fala, amb):
    texto = str(_val(hip, "texto"))
    t = hip.slots["quando"].extra.get("tempo")
    quando = t.inicio
    if not t.tem_hora:
        quando = quando.replace(hour=9, minute=0)
    desc = t.descrever(amb.agora) if t.tem_hora else "%s às 9h" % t.descrever(amb.agora)

    def agendar(ex):
        if amb.lembretes is None:
            return {"ok": True, "local": False}
        item = amb.lembretes.agendar(texto, quando)
        return {"ok": True, "local": True, "id": item["id"]}
    def registrar_jos(ex):
        try:
            ex.jos.chamar("jair_os_criar_tarefa", {"titulo": "Lembrete: " + texto, "prazo": quando.isoformat(timespec="minutes"),
                                                   "status": "planned", "prioridade": 3})
            return {"ok": True, "jos": True}
        except Exception as e:  # noqa: BLE001 - o aviso local já está agendado
            return {"ok": True, "jos": False, "aviso": str(e)}

    def resumo(res):
        r = res[-1].resultado if res else {}
        base = "Combinado, vou te lembrar de %s %s." % (texto, desc)
        if isinstance(r, dict) and r.get("jos") is False:
            return base + " Ficou só neste computador; o JOS não está conectado."
        return base
    passos = [Passo("funcao", "agendar_lembrete", {"texto": texto, "quando": quando.isoformat(timespec="minutes")},
                    "Agendar aviso local", agendar),
              Passo("funcao", "registrar_lembrete_jos", {"titulo": "Lembrete: " + texto}, "Registrar no JOS", registrar_jos)]
    return Plano(h.id, passos, 2, "Combinado, vou te lembrar de %s %s." % (texto, desc), resumir=resumo)


@construtor("memoria_salvar")
def memoria_salvar(h, hip, fala, amb):
    texto = str(_val(hip, "texto"))
    texto = texto[:1].upper() + texto[1:]
    args = {"namespace": "jarvis_voz", "chave": _slug(texto), "valor": {"texto": texto, "dito_em": amb.agora.isoformat(timespec="minutes")}, "confianca": 0.9}
    return Plano(h.id, [_acao_jos("jair_os_salvar_memoria", args, "Salvar na memória")], 2, "Guardado na memória do JOS.")


@construtor("memoria_buscar")
def memoria_buscar(h, hip, fala, amb):
    consulta = str(_val(hip, "consulta"))
    passos = [_acao_jos("jair_os_buscar_memoria", {"consulta": consulta, "limite": 5}, "Buscar memória"),
              _acao_jos("jair_os_buscar_conhecimento", {"consulta": consulta, "limite": 3}, "Buscar conhecimento")]

    def resumo(res):
        mem = _lista(res[0].resultado if res else None)
        if mem:
            v = mem[0].get("value") if isinstance(mem[0], dict) else mem[0]
            if isinstance(v, dict):
                v = v.get("texto") or v.get("text") or ", ".join("%s: %s" % (k, x) for k, x in list(v.items())[:3])
            return "Na memória: %s" % str(v)[:220]
        con = _lista(res[1].resultado if len(res) > 1 else None, "resultados")
        if con:
            c = con[0]
            return "Encontrei em %s: %s" % (c.get("titulo") or "a base", str(c.get("trecho") or "")[:220])
        return "Não encontrei nada sobre %s na memória do JOS." % consulta
    return Plano(h.id, passos, 0, _ack(h, hip, amb), resumir=resumo)


def _achar(lexico, tipo: str, texto: str):
    r = lexico.gaz(tipo).buscar_em(texto)
    return r[0].entidade if r else None


@construtor("aula_registrar")
def aula_registrar(h, hip, fala, amb):
    aluno = hip.slots["aluno"].entidade
    resumo_txt = str(_val(hip, "resumo", padrao="") or "")
    if len(resumo_txt) < 4:
        raise PrecisaSlot("resumo", "Como foi a aula de %s? Me conte o resumo." % aluno.nome)
    resumo_txt = resumo_txt[:1].upper() + resumo_txt[1:]
    disc = _achar(amb.lexico, "disciplina", fala.texto)
    topicos = [a.entidade.nome for a in amb.lexico.gaz("topico").buscar_em(fala.texto)][:5]
    args = {"aluno": aluno.nome, "resumo": resumo_txt, "assunto": disc.nome if disc else None,
            "topicos": topicos or None, "data": amb.agora.isoformat(timespec="minutes")}
    return Plano(h.id, [_acao_jos("jair_os_registrar_aula", args, "Registrar aula")], 2,
                 "Aula de %s registrada." % aluno.nome)


@construtor("aluno_consultar")
def aluno_consultar(h, hip, fala, amb):
    aluno = hip.slots["aluno"].entidade

    def resumo(res):
        r = res[-1].resultado if res else None
        if not isinstance(r, dict):
            return None
        partes = []
        perfil = r.get("perfil") or r.get("profile") or r
        serie = perfil.get("grade_or_series") or perfil.get("serie") or perfil.get("grade")
        if serie:
            partes.append("%s está no %s" % (aluno.nome, serie))
        dif = perfil.get("difficulties") or perfil.get("dificuldades")
        if dif:
            partes.append("dificuldades: %s" % (", ".join(map(str, dif[:3])) if isinstance(dif, list) else str(dif)[:120]))
        aulas = _lista(r.get("aulas") or r.get("aulas_recentes") or r.get("sessions"))
        if aulas:
            a = aulas[0]
            partes.append("última aula: %s" % str(a.get("summary") or a.get("resumo") or a.get("assunto") or "")[:120])
        return (". ".join(partes) + ".") if partes else "Abri a ficha de %s." % aluno.nome
    return Plano(h.id, [_acao_jos("jair_os_aluno_detalhe", {"aluno": aluno.nome}, "Ficha do aluno")], 0,
                 _ack(h, hip, amb), resumir=resumo)


def _campo_aninhado(r: Any, chaves, sub=("execucao", "execution", "plano", "plan", "roteamento")) -> Any:
    if not isinstance(r, dict):
        return None
    for k in chaves:
        if r.get(k):
            return r[k]
    for s in sub:
        if isinstance(r.get(s), dict):
            for k in chaves:
                if r[s].get(k):
                    return r[s][k]
    return None


def _oferecer_execucao(h: Habilidade, res: List[ResultadoPasso], amb: Ambiente) -> Optional[Plano]:
    r = res[-1].resultado if res else None
    eid = _campo_aninhado(r, ("execution_id", "executionId", "id"))
    if not eid:
        return None
    return Plano(h.id + ".executar", [_acao_jos("jair_os_executar", {"execution_id": eid, "finalizar": False}, "Executar no JOS")],
                 2, "Executando no JOS.", confirmacao="O plano está pronto no JOS. Quer que eu execute agora? Isso usa créditos de IA.",
                 resumir=lambda rr: "Pronto, o JOS executou. O resultado fica registrado na execução.")


def _resumo_rota(res: List[ResultadoPasso]) -> Optional[str]:
    r = res[-1].resultado if res else None
    if not isinstance(r, dict):
        return "Pedido enviado ao JOS."
    wf = _campo_aninhado(r, ("workflow", "workflow_key", "fluxo"))
    risco = _campo_aninhado(r, ("risco", "risk_level", "risk"))
    partes = ["O JOS montou o plano"]
    if wf:
        partes.append("pelo fluxo %s" % (wf.get("key") or wf.get("nome") if isinstance(wf, dict) else wf))
    if risco:
        partes.append("com risco %s" % risco)
    return " ".join(partes) + "."


def _rotear(h, pedido: str, amb: Ambiente, fala_: str) -> Plano:
    return Plano(h.id, [_acao_jos("jair_os_rotear", {"pedido": pedido}, "Rotear no orquestrador")], 2, fala_,
                 resumir=_resumo_rota, continuacao=lambda res: _oferecer_execucao(h, res, amb))


@construtor("material_produzir")
def material_produzir(h, hip, fala, amb):
    return _rotear(h, _frase_original(fala), amb, "Enviando o pedido de material ao JOS.")


@construtor("jos_rotear")
def jos_rotear(h, hip, fala, amb):
    pedido = str(_val(hip, "pedido", padrao="")) or _frase_original(fala)
    return _rotear(h, pedido, amb, "Encaminhando ao orquestrador do JOS.")


@construtor("fechamento")
def fechamento(h, hip, fala, amb):
    return _rotear(h, "Fechamento diário (evening_close): resumo do dia, pendências e prioridades de amanhã.", amb,
                   "Fazendo o fechamento do dia.")


@construtor("financeiro_registrar")
def financeiro_registrar(h, hip, fala, amb):
    return _rotear(h, "Registro financeiro: " + _frase_original(fala), amb,
                   "Registrando %s reais no financeiro." % numero_falado(_val(hip, "valor")))


@construtor("briefing")
def briefing(h, hip, fala, amb):
    agora = amb.agora
    passos = [_acao_jos("jair_os_tarefas", {"limite": 25}, "Tarefas abertas"),
              _acao_jos("jair_os_status_operacional", {}, "Status do JOS")]

    def resumo(res):
        tarefas = _lista(res[0].resultado if res else None, "tarefas")
        hoje = agora.date().isoformat()
        do_dia = [t for t in tarefas if isinstance(t, dict) and str(t.get("due_at") or t.get("prazo") or "")[:10] <= hoje
                  and (t.get("due_at") or t.get("prazo"))]
        frase = "%s, %s! Hoje é %s." % (saudacao_do_horario(agora), amb.nome_usuario, data_falada(agora))
        if tarefas:
            frase += " Você tem %d tarefas abertas" % len(tarefas)
            if do_dia:
                frase += ", %d com prazo até hoje" % len(do_dia)
            principais = [_titulo(t) for t in (do_dia or tarefas)[:2]]
            frase += ". Destaques: %s." % "; ".join(principais)
        status = res[1].resultado if len(res) > 1 else None
        alertas = _lista(status, "alertas")
        crit = [a for a in alertas if isinstance(a, dict) and a.get("severity") == "critical"]
        if crit:
            frase += " Atenção: %d alerta%s crítico%s no JOS." % (len(crit), "" if len(crit) == 1 else "s", "" if len(crit) == 1 else "s")
        return frase
    return Plano(h.id, passos, 0, "Montando seu briefing.", resumir=resumo)


@construtor("status_jos")
def status_jos(h, hip, fala, amb):
    def resumo(res):
        r = res[-1].resultado if res else None
        if not isinstance(r, dict):
            return "O JOS respondeu."
        disp = _lista(r.get("dispositivos"))
        ativos = [d for d in disp if isinstance(d, dict) and d.get("enabled")]
        alertas = _lista(r.get("alertas"))
        crit = [a for a in alertas if isinstance(a, dict) and a.get("severity") == "critical"]
        return "O JOS está no ar com %d dispositivo%s ativo%s e %d alerta%s, %d crítico%s." % (
            len(ativos), "" if len(ativos) == 1 else "s", "" if len(ativos) == 1 else "s",
            len(alertas), "" if len(alertas) == 1 else "s", len(crit), "" if len(crit) == 1 else "s")
    return Plano(h.id, [_acao_jos("jair_os_status_operacional", {}, "Status operacional")], 0, _ack(h, hip, amb), resumir=resumo)


# ===================================================================== cálculo
@construtor("calculo_media")
def calculo_media(h, hip, fala, amb):
    nums = _val(hip, "numeros", padrao=[])
    m = calculo.media(nums)
    falar = "A média de %s é %s." % (", ".join(numero_falado(float(x)) for x in nums), calculo.formatar(m, 2))
    return Plano(h.id, [], 0, falar)


@construtor("calculo_nota_necessaria")
def calculo_nota_necessaria(h, hip, fala, amb):
    r = calculo.nota_necessaria(fala.texto, [])
    if r is None:
        raise PrecisaSlot("detalhe", "Me diga a média que quer atingir e as notas que já tem. Por exemplo: média 6, notas 4 e 5.")
    nec, alvo, notas, restantes = r
    if nec > 10:
        falar = "Mesmo tirando 10 não chega a %s: precisaria de %s em cada uma." % (calculo.formatar(alvo), calculo.formatar(nec, 2))
    elif nec <= 0:
        falar = "Já está garantido: a média %s já foi atingida." % calculo.formatar(alvo)
    else:
        falar = "Com %s, para média %s precisa tirar %s%s, supondo pesos iguais." % (
            " e ".join(calculo.formatar(n) for n in notas), calculo.formatar(alvo), calculo.formatar(nec, 2),
            " em cada uma das %d" % restantes if restantes > 1 else "")
    return Plano(h.id, [], 0, falar)


@construtor("calculo_conta")
def calculo_conta(h, hip, fala, amb):
    expr = str(_val(hip, "expressao", "texto", padrao="") or fala.texto)
    r = calculo.avaliar(dobrar(expr))
    if r is None:
        raise PrecisaSlot("expressao", "Não entendi a conta. Pode dizer de novo, por exemplo: 25 vezes 4?")
    return Plano(h.id, [], 0, "Dá %s." % calculo.formatar(r))


# ======================================================================= escola
_ESCRITA = re.compile(r"\b(lanca|lancar|lance|coloca|coloque|poe|ponha|bota|marca|marque|registra|registre|da|de|atribui|"
                      r"digita|preenche|muda|altera|corrige|anota|falta|faltou|faltaram|presente|ausente|ausentes|presentes)\b")


def _escola_de(lexico, texto: str, turma) -> Any:
    e = _achar(lexico, "escola", texto)
    if e:
        return e
    if turma is not None and turma.dados.get("escola"):
        return lexico.gaz("escola").get(str(turma.dados["escola"]))
    escolas = list(lexico.gaz("escola").entidades.values())
    return escolas[0] if len(escolas) == 1 else None


def _bimestre(texto: str) -> str:
    m = re.search(r"\b(\w+)\s+bimestre\b", texto)
    if m:
        n = ordinal(m.group(1))
        if n and 1 <= n <= 4:
            return "%d° BIMESTRE" % n
    return ""


def _passos_escola(escola, texto_goal: str, prep: Optional[Passo], abrir_notas: bool) -> List[Passo]:
    plataforma = str(escola.dados.get("plataforma") or "")
    perfil = escola.dados.get("perfil")
    url = escola.dados.get("url")
    passos: List[Passo] = []
    if plataforma == "activesoft":
        if prep is not None:
            passos.append(prep)
        elif abrir_notas:
            passos.append(Passo("desktop", "legacy_gradebook_open", {}, "Abrir registro de notas"))
        passos.append(Passo("desktop", "browser_goal", {"profile": perfil, "session": perfil, "goal": texto_goal}, "Executar no sistema"))
    else:
        passos.append(Passo("desktop", "browser_goal", {"url": url, "session": perfil or escola.id, "goal": texto_goal}, "Executar no portal"))
    return passos


@construtor("escola_abrir")
def escola_abrir(h, hip, fala, amb):
    e = hip.slots["escola"].entidade
    if e.dados.get("perfil"):
        passo = Passo("desktop", "browser_auth_login", {"profile": e.dados["perfil"], "headed": True}, "Entrar no sistema")
    elif e.dados.get("url"):
        passo = Passo("desktop", "open_url", {"url": e.dados["url"]}, "Abrir portal")
    else:
        return Plano(h.id, [], 0, "Não tenho o endereço do sistema da %s no léxico local." % e.nome)
    return Plano(h.id, [passo], 0, _ack(h, hip, amb))


@construtor("escola_frequencia")
def escola_frequencia(h, hip, fala, amb):
    texto = fala.texto
    turma = _achar(amb.lexico, "turma", texto)
    escola = _escola_de(amb.lexico, texto, turma)
    if escola is None:
        raise PrecisaSlot("escola", "De qual escola é a frequência?", "escola")
    escrita = bool(_ESCRITA.search(texto))
    t = tempo_mod.extrair(texto, amb.agora)
    data = t.inicio.strftime("%d/%m/%Y") if t else amb.agora.strftime("%d/%m/%Y")
    serie = str(turma.dados.get("serie") or (turma.id[1] if turma and len(turma.id) == 4 else "")) if turma else ""
    prep = None
    if escola.dados.get("plataforma") == "activesoft":
        prep = Passo("desktop", "legacy_frequency_prepare", {"series": serie, "turma": turma.id if turma else "",
                                                              "phase": _bimestre(texto), "start_date": data, "end_date": data,
                                                              "consult": True}, "Preparar frequência")
    passos = [prep] if (prep is not None and not escrita) else _passos_escola(escola, _frase_original(fala), prep, False)
    alvo = ("da %s " % turma.nome) if turma else ""
    if escrita:
        return Plano(h.id, passos, 3, "Vou lançar a frequência %sno sistema da escola %s." % (alvo, escola.nome),
                     confirmacao="Vou lançar a frequência %sno sistema da escola %s: \"%s\". A gravação final ainda pede seu clique. Confirma?"
                     % (alvo, escola.nome, _frase_original(fala)))
    return Plano(h.id, passos, 1, "Abrindo a frequência %sno sistema da escola %s." % (alvo, escola.nome))


@construtor("escola_notas")
def escola_notas(h, hip, fala, amb):
    texto = fala.texto
    turma = _achar(amb.lexico, "turma", texto)
    escola = _escola_de(amb.lexico, texto, turma)
    if escola is None:
        raise PrecisaSlot("escola", "Em qual escola?", "escola")
    escrita = bool(_ESCRITA.search(texto)) and bool(numeros_em(re.sub(r"\b\d{4}\b", "", texto)))
    aluno = _achar(amb.lexico, "aluno", texto)
    passos = _passos_escola(escola, _frase_original(fala), None, True)
    if escrita:
        notas = [n for n in numeros_em(re.sub(r"\b\d{4}\b", "", texto)) if n <= 10]
        quem = (" de %s" % aluno.nome) if aluno else ""
        nota_txt = (" %s" % numero_falado(notas[0])) if notas else ""
        return Plano(h.id, passos, 3, "Lançando a nota%s%s." % (nota_txt, quem),
                     confirmacao="Vou lançar a nota%s%s no sistema da escola %s: \"%s\". A gravação final ainda pede seu clique. Confirma?"
                     % (nota_txt, quem, escola.nome, _frase_original(fala)))
    return Plano(h.id, passos, 1, "Abrindo as notas no sistema da escola %s." % escola.nome)


# ====================================================================== locais
@construtor("saudacao")
def saudacao(h, hip, fala, amb):
    return Plano(h.id, [], 0, "%s, %s! %s" % (saudacao_do_horario(amb.agora), amb.nome_usuario,
                                              escolher(["Em que posso ajudar?", "O que vamos fazer?", "Pode falar."], amb.rng)))


@local("nada")
def _nada(h, hip, fala, amb):
    return Plano(h.id, [], 0, _ack(h, hip, amb))


@local("dormir")
def _dormir(h, hip, fala, amb):
    return Plano(h.id, [], 0, _ack(h, hip, amb), dormir=True)


@local("hora")
def _hora(h, hip, fala, amb):
    return Plano(h.id, [], 0, "Agora são %s." % hora_falada(amb.agora))


@local("data")
def _data(h, hip, fala, amb):
    return Plano(h.id, [], 0, "Hoje é %s." % data_falada(amb.agora))


@local("ajuda")
def _ajuda(h, hip, fala, amb):
    return Plano(h.id, [], 0, _ack(h, hip, amb))


@local("aprender")
def _aprender(h, hip, fala, amb):
    frase = str(_val(hip, "frase", "texto"))
    significado = str(_val(hip, "significado"))

    def aprender(ex):
        amb.lexico.aprender_apelido(frase, significado)
        if amb.ao_aprender:
            amb.ao_aprender()
        return {"ok": True}
    return Plano(h.id, [Passo("funcao", "aprender_apelido", {"frase": frase, "significado": significado}, "Aprender apelido", aprender)],
                 1, "Aprendido: quando você disser \"%s\", vou entender \"%s\"." % (frase, significado))


@local("esquecer")
def _esquecer(h, hip, fala, amb):
    frase = str(_val(hip, "frase", "texto"))

    def esquecer(ex):
        ok = amb.lexico.esquecer_apelido(frase)
        if ok and amb.ao_aprender:
            amb.ao_aprender()
        return {"ok": ok, "erro": "eu não conhecia \"%s\"" % frase}
    return Plano(h.id, [Passo("funcao", "esquecer_apelido", {"frase": frase}, "Esquecer apelido", esquecer)], 1,
                 "Pronto, esqueci \"%s\"." % frase)
