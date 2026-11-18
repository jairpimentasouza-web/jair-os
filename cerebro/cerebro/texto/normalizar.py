"""Normalização da fala em PT-BR antes do entendimento.

Etapas: dobra de acentos → proteção de URLs → correções de STT → contrações
("pra", "tá", "cê") → remoção da palavra de despertar ("ei Jarvis") →
hesitações ("é...", "hum", "tipo") → molduras de pedido ("você pode", "eu
queria") → cortesia final ("por favor", "pra mim") → números por extenso.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from . import numeros
from .basico import dobrar
from .fonetica import chave_compacta

_URL = re.compile(r"https?://\S+|www\.\S+", re.I)


def _alternancia(frases, *, fronteira=True) -> Optional[re.Pattern]:
    itens = sorted({f.strip() for f in frases if f and f.strip()}, key=len, reverse=True)
    if not itens:
        return None
    corpo = "|".join(re.escape(x) for x in itens)
    return re.compile(r"\b(?:%s)\b" % corpo if fronteira else corpo)


@dataclass
class Fala:
    """Resultado da normalização."""

    original: str
    texto: str                      # dobrado, limpo, números em dígitos
    acordou: bool = False           # tinha palavra de despertar
    cortesia: bool = False          # tinha "por favor", "obrigado"...
    urls: List[str] = field(default_factory=list)
    apelido: Optional[str] = None   # apelido aprendido aplicado

    @property
    def vazia(self) -> bool:
        return not self.texto.strip()

    def tokens(self) -> List[str]:
        return self.texto.split()


class Normalizador:
    def __init__(self, lexico) -> None:
        self.lexico = lexico
        self.reconstruir()

    def reconstruir(self) -> None:
        lx = self.lexico
        self._corr = dict(lx.correcoes)
        self._re_corr = _alternancia(self._corr)
        contr = {dobrar(k): dobrar(v) for k, v in (lx.expressoes.get("contracoes") or {}).items()}
        self._contr = contr
        self._re_contr = _alternancia(contr)
        desp = lx.expressoes.get("despertar") or {}
        self._despertar = [dobrar(x) for x in desp.get("palavras") or []]
        self._despertar_fon = {chave_compacta(x) for x in self._despertar if len(x) >= 4}
        prefixos = [dobrar(x) for x in desp.get("prefixos") or []]
        alt_wake = "|".join(re.escape(x) for x in sorted(self._despertar, key=len, reverse=True))
        alt_pref = "|".join(re.escape(x) for x in sorted(prefixos, key=len, reverse=True))
        self._re_wake_ini = re.compile(r"^(?:(?P<pref>%s)\s+)?(?:%s)\b[\s,]*" % (alt_pref, alt_wake))
        self._saudacoes = {"bom dia", "boa tarde", "boa noite", "oi", "ola", "e ai", "fala", "alo"}
        self._re_wake_fim = re.compile(r"[\s,]+(?:%s)$" % alt_wake)
        hes = [dobrar(x) for x in lx.expressoes.get("hesitacoes") or []]
        curtas = [h for h in hes if len(h) <= 4 and h not in ("e", "ne", "assim", "tipo")]
        self._re_hes_qualquer = _alternancia([h for h in curtas if h not in ("ah", "an")] + ["e e", "e e e"])
        self._re_hes_ini = re.compile(r"^(?:(?:%s)\s+)+" % "|".join(re.escape(h) for h in sorted(hes, key=len, reverse=True)))
        molduras = [dobrar(x) for x in lx.expressoes.get("molduras_pedido") or []]
        self._re_moldura = re.compile(r"^(?:(?:%s)\s+)+" % "|".join(re.escape(m) for m in sorted(molduras, key=len, reverse=True)))
        sufixos = [dobrar(x) for x in lx.expressoes.get("sufixos_cortesia") or []]
        self._re_sufixo = re.compile(r"(?:[\s,]+(?:%s))+$" % "|".join(re.escape(s) for s in sorted(sufixos, key=len, reverse=True)))
        self._re_cortesia = re.compile(r"\b(?:por favor|por gentileza|obrigad[oa]|valeu|brigad[oa])\b")
        self._apelidos = dict(lx.apelidos)
        self._frases_inteiras = set()
        for grupo in ("agradecimento", "saudacao", "despedida", "confirmacao", "negacao", "cancelamento"):
            self._frases_inteiras.update(dobrar(x) for x in lx.expressoes.get(grupo) or [])
        verbos_cmd = set()
        for fam in ("abrir", "fechar", "tocar", "pesquisar", "mostrar", "ir", "aumentar", "diminuir", "silenciar",
                    "capturar", "agendar", "lembrar", "anotar", "enviar", "publicar", "calcular", "bloquear", "pausar",
                    "pular", "continuar", "mudar", "ligar", "desligar", "traduzir", "imprimir", "atualizar"):
            if fam in lx.familias:
                verbos_cmd |= {f for f in lx.familias[fam] if " " not in f}
        self._re_cond = re.compile(r"^(?:eu\s+)?(?:preciso|tenho que|tenho de|necessito)\s+(?=(?:%s)\b)" %
                                   "|".join(re.escape(v) for v in sorted(verbos_cmd, key=len, reverse=True)))

    # -------------------------------------------------------------------- API
    def dobrar_e_corrigir(self, texto: str) -> Tuple[str, List[str]]:
        urls = _URL.findall(texto or "")
        s = _URL.sub(" __url__ ", texto or "")
        s = dobrar(s)
        s = s.replace("-", " ").replace("_", " ").replace("’", " ").replace("'", " ")
        s = re.sub(r"(\d)\s*[hH]\s*(\d{2})\b", r"\1:\2", s)  # 14h30 → 14:30
        s = re.sub(r"(?<=\d),(?=\d)", ",", s)
        s = re.sub(r"[^a-z0-9:,./%@ ]+", " ", s)
        s = re.sub(r"[,.](?!\d)|(?<!\d)[,.]", " ", s)  # pontuação do Whisper ("em 30.") sem quebrar 7.5
        s = re.sub(r"\s+", " ", s).strip()
        if self._re_corr:
            s = self._re_corr.sub(lambda m: self._corr[m.group(0)], s)
        if self._re_contr:
            s = self._re_contr.sub(lambda m: self._contr[m.group(0)], s)
        return re.sub(r"\s+", " ", s).strip(), urls

    def tem_despertar(self, texto: str) -> bool:
        s, _ = self.dobrar_e_corrigir(texto)
        if self._re_wake_ini.match(s) or self._re_wake_fim.search(s):
            return True
        toks = s.split()[:3]
        return any(chave_compacta(t) in self._despertar_fon for t in toks if len(t) >= 4)

    def normalizar(self, texto: str) -> Fala:
        original = str(texto or "").strip()
        s, urls = self.dobrar_e_corrigir(original)
        acordou = False
        m = self._re_wake_ini.match(s)
        if m:
            acordou = True
            pref = m.group("pref")
            s = s[m.end():]
            if pref in self._saudacoes and not s.strip():
                s = pref
        else:
            toks = s.split()
            if toks and len(toks[0]) >= 4 and chave_compacta(toks[0]) in self._despertar_fon:
                acordou = True
                s = " ".join(toks[1:])
        m = self._re_wake_fim.search(s)
        if m:
            acordou = True
            s = s[:m.start()]
        cortesia = bool(self._re_cortesia.search(s))
        if self._re_hes_qualquer:
            s = self._re_hes_qualquer.sub(" ", s)
        s = re.sub(r"\s+", " ", s).strip()
        for _ in range(3 if s not in self._frases_inteiras else 0):
            antes = s
            s = self._re_hes_ini.sub("", s)
            s = self._re_moldura.sub("", s)
            s = self._re_cond.sub("", s)
            s = self._re_sufixo.sub("", s).strip(" ,")
            if s == antes:
                break
        s = re.sub(r"\bpor cento\b", "porcento", s)
        s = numeros.converter(s)
        s = re.sub(r"\s+", " ", s).strip()
        apelido = None
        if s in self._apelidos:
            apelido = s
            sub = self.normalizar(self._apelidos[s])
            s = sub.texto
            urls = urls or sub.urls
        return Fala(original=original, texto=s, acordou=acordou, cortesia=cortesia, urls=urls, apelido=apelido)

    def eh_alucinacao(self, texto: str) -> bool:
        s, _ = self.dobrar_e_corrigir(texto)
        s = s.strip(" .")
        return not s or any(s == a or (len(s) < 60 and a in s and len(a) > 12) for a in self.lexico.alucinacoes)

    def pertence(self, texto: str, grupo: str) -> bool:
        """Verifica se a fala inteira é um item do grupo de expressões (confirmação, negação...)."""
        s, _ = self.dobrar_e_corrigir(texto)
        s = self._re_wake_ini.sub("", s).strip()
        s = self._re_wake_fim.sub("", s).strip(" ,")
        s = self._re_sufixo.sub("", s).strip(" ,")
        if not s:
            return False
        itens = set(self.lexico.lista(grupo))
        if s in itens:
            return True
        # "sim, pode" / "não, cancela" → avalia o primeiro pedaço
        primeiro = re.split(r"[,]|\s+(?:pode|por favor)\b", s)[0].strip()
        return primeiro in itens and len(s.split()) <= 4
