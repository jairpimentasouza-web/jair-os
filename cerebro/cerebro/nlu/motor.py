"""Motor de entendimento em cascata.

1. **Gramática** — padrões das habilidades compilados com todas as formas verbais e
   entidades fuzzy/fonéticas. Precisa e explicável.
2. **Classificador** — TF-IDF de n-gramas + vizinho fuzzy sobre frases
   delexicalizadas, com extração relaxada de slots. Pega o que a gramática perde
   (frases truncadas, ordem diferente, erros de transcrição).
3. **LLM local** (opcional) — Ollama com JSON restrito às habilidades registradas.
"""
from __future__ import annotations

import random
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple

import yaml
from rapidfuzz import process

from ..texto import tempo as tempo_mod
from ..texto.normalizar import Fala
from .classificador import Classificador
from .gramatica import Alt, Compilador, Lit, Seq, Verbo, analisar
from .modelo import TIPOS_GAZETTEER, TIPOS_LIVRES, Habilidade, Hipotese, SlotDef, Valor
from .slots import Contexto, limpar_livre, remover_tempo_de, residual, resolver

PASTA_HABILIDADES = Path(__file__).with_name("habilidades")
ORDEM_DELEX = ["aluno", "escola", "turma", "pessoa", "app", "site", "ajuste", "pasta", "recurso",
               "disciplina", "topico", "material", "banca"]

_AMOSTRAS_TEXTO = [
    "relatividade geral", "a reuniao de pais", "corrigir as provas", "ligar para o banco", "leis de newton",
    "o boleto da internet", "receita de bolo", "a aula de amanha", "buracos negros", "o planejamento semanal",
    "comprar pao", "lista de exercicios de vetores", "pagar a conta de luz", "a prova foi adiada",
    "o horario da coordenacao", "musica para estudar", "alice in chains", "o relatorio do bimestre",
]
_AMOSTRAS_TEMPO = ["hoje", "amanha", "sexta", "amanha as 3 da tarde", "segunda que vem", "dia 25", "daqui a 20 minutos"]


def carregar_habilidades(pasta: Optional[Path] = None, extras: Iterable[Path] = ()) -> Dict[str, Habilidade]:
    habs: Dict[str, Habilidade] = {}
    arquivos = sorted(Path(pasta or PASTA_HABILIDADES).glob("*.yaml")) + [Path(p) for p in extras]
    for arq in arquivos:
        with arq.open(encoding="utf-8") as f:
            itens = yaml.safe_load(f) or []
        for d in itens:
            slots = {n: SlotDef.de(n, s) for n, s in (d.get("slots") or {}).items()}
            h = Habilidade(
                id=d["id"], descricao=d.get("descricao", ""), risco=str(d.get("risco", "R0")),
                padroes=list(d.get("padroes") or []), exemplos=list(d.get("exemplos") or []), slots=slots,
                acao=dict(d.get("acao") or {}), respostas=list(d.get("respostas") or []),
                confirmacao=str(d.get("confirmacao") or ""), dominio=arq.stem,
            )
            habs[h.id] = h
    return habs


class Motor:
    def __init__(self, lexico, normalizador, habilidades: Optional[Dict[str, Habilidade]] = None,
                 pasta_cache: Optional[Path] = None, llm=None, usar_classificador: bool = True,
                 amostras_por_padrao: int = 28) -> None:
        self.lexico = lexico
        self.norm = normalizador
        self.habilidades = habilidades if habilidades is not None else carregar_habilidades()
        self.compilador = Compilador(lexico)
        self.llm = llm
        self._palavras_hab: Dict[str, Set[str]] = {}
        for h in self.habilidades.values():
            h.compilados = []
            for p in h.padroes:
                rx, nomes = self.compilador.compilar(p)
                h.compilados.append((rx, nomes, p))
            self._palavras_hab[h.id] = self._palavras_de(h)
        self.classificador: Optional[Classificador] = None
        if usar_classificador:
            exemplos = self._corpus(amostras_por_padrao)
            self.classificador = Classificador.treinar_com_cache(exemplos, pasta_cache)

    # --------------------------------------------------------------- corpus
    def _palavras_de(self, h: Habilidade) -> Set[str]:
        out: Set[str] = set()

        def andar(no):
            if isinstance(no, Lit):
                if len(no.palavra) >= 4:
                    out.add(no.palavra)
            elif isinstance(no, Verbo):
                for f in no.familias:
                    out.update(self.lexico.familia(f))
            elif isinstance(no, Seq):
                for x in no.nos:
                    andar(x)
            elif isinstance(no, Alt):
                for s in no.opcoes:
                    if not no.opcional or len(s.nos) <= 3:
                        andar(s)
        for p in h.padroes:
            andar(analisar(p))
        return out

    def _amostra_slot(self, h: Habilidade):
        def valor(nome: str, rng: random.Random) -> str:
            d = h.slots.get(nome) or SlotDef(nome)
            if d.tipo in TIPOS_GAZETTEER:
                return "<%s>" % d.tipo
            if d.tipo in ("numero", "nivel"):
                return "<num>"
            if d.tipo == "numeros":
                return "<num> e <num>"
            if d.tipo == "tempo":
                return "<tempo>"
            if d.tipo == "url":
                return "<url>"
            return rng.choice(_AMOSTRAS_TEXTO)
        return valor

    def _corpus(self, n: int) -> List[Tuple[str, str]]:
        rng = random.Random(42)
        exemplos: List[Tuple[str, str]] = []
        for h in self.habilidades.values():
            for p in h.padroes:
                for frase in self.compilador.gerar(p, n, rng, self._amostra_slot(h)):
                    exemplos.append((self._delex_placeholders(frase), h.id))
            for ex in h.exemplos:
                fala = self.norm.normalizar(ex)
                exemplos.append((self.delexicalizar(fala.texto)[0], h.id))
        return exemplos

    def _delex_placeholders(self, frase: str) -> str:
        # Amostras de tempo geradas viram <tempo>; o resto já tem marcadores.
        t = tempo_mod.extrair(frase)
        if t:
            frase = tempo_mod.remover(frase, t) + " <tempo>"
        return re.sub(r"\b\d+(?:\.\d+)?\b", "<num>", frase)

    # ------------------------------------------------------- delexicalização
    def delexicalizar(self, texto: str) -> Tuple[str, Dict[str, List], List[Tuple[int, int]]]:
        toks = texto.split()
        ocupado: Set[int] = set()
        achados: Dict[str, List] = {}
        trocas: Dict[int, Tuple[int, str]] = {}
        for tipo in ORDEM_DELEX:
            g = self.lexico.gaz(tipo)
            if not len(g):
                continue
            for a in g.buscar_em(texto):
                faixa = set(range(a.inicio, a.fim))
                if faixa & ocupado:
                    continue
                ocupado |= faixa
                achados.setdefault(tipo, []).append(a)
                trocas[a.inicio] = (a.fim, "<%s>" % tipo)
        t = tempo_mod.extrair(texto)
        if t:
            pos = 0
            inicios = []
            for tk in toks:
                inicios.append(pos)
                pos += len(tk) + 1
            for (ca, cb) in t.trechos:
                ia = next((i for i, p in enumerate(inicios) if p >= ca), None)
                ib = next((i for i, p in enumerate(inicios) if p >= cb), len(toks))
                if ia is None or ia >= ib:
                    continue
                faixa = set(range(ia, ib))
                if faixa & ocupado:
                    continue
                ocupado |= faixa
                trocas[ia] = (ib, "<tempo>")
            achados["tempo"] = [t]
        saida: List[str] = []
        spans: List[Tuple[int, int]] = []
        i = 0
        while i < len(toks):
            if i in trocas:
                fim, marca = trocas[i]
                saida.append(marca)
                spans.append((i, fim))
                i = fim
                continue
            tk = toks[i]
            saida.append("<num>" if re.fullmatch(r"\d+(?:\.\d+)?", tk) else ("<url>" if tk == "url" else tk))
            i += 1
        return " ".join(saida), achados, spans

    # -------------------------------------------------------------- entender
    def entender(self, fala: Fala, contexto: Optional[Contexto] = None, agora: Optional[datetime] = None,
                 usar_llm: bool = True) -> List[Hipotese]:
        texto = fala.texto
        if not texto:
            return []
        hips = self._gramatica(fala, contexto, agora)
        melhor = max((h.confianca for h in hips), default=0.0)
        if melhor < 0.9 and self.classificador is not None:
            hips.extend(self._classificar(fala, contexto, agora, ja=set(h.intencao for h in hips)))
        hips = self._unicos(hips)
        melhor = hips[0].confianca if hips else 0.0
        if melhor < 0.85:
            reparado = self._reparar_inicio(texto)
            if reparado:
                sub = Fala(original=fala.original, texto=reparado, acordou=fala.acordou, urls=fala.urls)
                for h in self._gramatica(sub, contexto, agora):
                    h.confianca = round(h.confianca - 0.05, 4)
                    h.fonte = "gramatica_reparada"
                    hips.append(h)
                hips = self._unicos(hips)
                melhor = hips[0].confianca if hips else 0.0
        if usar_llm and self.llm is not None and melhor < 0.62:
            h = self._via_llm(fala, contexto, agora)
            if h:
                hips.append(h)
                hips = self._unicos(hips)
        return hips

    def _vocabulario(self) -> Tuple[Set[str], List[str]]:
        if not hasattr(self, "_vocab"):
            conhecidas: Set[str] = set()
            verbos: Set[str] = set()
            for formas in self.lexico.familias.values():
                for f in formas:
                    conhecidas.update(f.split())
                    if " " not in f and len(f) >= 4:
                        verbos.add(f)
            for g in self.lexico.gazetteers.values():
                for a in g.aliases():
                    conhecidas.update(a.split())
            for h in self.habilidades.values():
                for p in h.padroes:
                    conhecidas.update(w for w in re.findall(r"[a-z]+", p))
            self._vocab = (conhecidas, sorted(verbos))
        return self._vocab

    def _reparar_inicio(self, texto: str) -> Optional[str]:
        """Troca a 1ª palavra desconhecida pelo verbo conhecido mais próximo (distância de edição 1)."""
        from rapidfuzz.distance import Levenshtein
        toks = texto.split()
        if len(toks) < 2 or len(toks[0]) < 5 or not toks[0].isalpha():
            return None
        conhecidas, verbos = self._vocabulario()
        if toks[0] in conhecidas:
            return None
        r = process.extractOne(toks[0], verbos, scorer=Levenshtein.distance, score_cutoff=1)
        if not r:
            return None
        return " ".join([r[0]] + toks[1:])

    @staticmethod
    def _unicos(hips: List[Hipotese]) -> List[Hipotese]:
        melhor: Dict[str, Hipotese] = {}
        for h in hips:
            if h.intencao not in melhor or h.confianca > melhor[h.intencao].confianca:
                melhor[h.intencao] = h
        return sorted(melhor.values(), key=lambda h: -h.confianca)

    def _gramatica(self, fala: Fala, contexto: Optional[Contexto], agora: Optional[datetime]) -> List[Hipotese]:
        texto = fala.texto
        out: List[Hipotese] = []
        for h in self.habilidades.values():
            for rx, nomes, padrao in h.compilados:
                m = rx.match(texto)
                if not m:
                    continue
                capturas: Dict[str, str] = {}
                for grupo, v in m.groupdict().items():
                    if v is not None:
                        capturas.setdefault(nomes[int(grupo[1:])], v)
                hip = self._montar(h, capturas, fala, contexto, agora, padrao)
                if hip is not None:
                    out.append(hip)
        return out

    def _montar(self, h: Habilidade, capturas: Dict[str, str], fala: Fala, contexto, agora, padrao: str,
                fonte: str = "gramatica") -> Optional[Hipotese]:
        slots: Dict[str, Valor] = {}
        faltando: List[str] = []
        livres = 0
        scores_ent: List[float] = []
        anafora = False
        defs = dict(h.slots)
        for nome in capturas:
            defs.setdefault(nome, SlotDef(nome, "texto"))
        tem_tempo = any(d.tipo == "tempo" for d in defs.values())
        for nome, d in defs.items():
            cap = capturas.get(nome)
            v, ok = resolver(d, cap, fala, self.lexico, contexto, agora)
            if not ok:
                return None
            if v is None and d.padrao is not None:
                v = self._padrao(d, agora)
            if v is None:
                if d.obrigatorio:
                    faltando.append(nome)
                continue
            if d.tipo in TIPOS_LIVRES and tem_tempo:
                v = remover_tempo_de(v, fala, agora)
            slots[nome] = v
            if d.tipo in TIPOS_LIVRES or (v.entidade is None and d.tipo in TIPOS_GAZETTEER):
                livres += len(cap or "")
            if v.entidade is not None:
                scores_ent.append(v.score)
            if v.extra.get("anafora"):
                anafora = True
        frac = min(1.0, livres / max(1, len(fala.texto)))
        conf = 0.78 + 0.13 * (1 - frac) + 0.08 * (min(scores_ent) if scores_ent else 1.0)
        if anafora:
            conf -= 0.03
        if faltando:
            conf -= 0.04
        return Hipotese(h.id, round(min(conf, 0.995), 4), slots, fonte, padrao, faltando, fala.texto)

    def _padrao(self, d: SlotDef, agora: Optional[datetime]) -> Optional[Valor]:
        if d.tipo == "tempo" and d.padrao in ("hoje", "agora"):
            agora = agora or datetime.now()
            t = tempo_mod.Tempo(inicio=agora.replace(hour=0, minute=0, second=0, microsecond=0), granularidade="dia")
            return Valor("tempo", t.iso(), "hoje", None, 1.0, {"tempo": t, "desc": "hoje", "iso": t.iso()})
        if d.tipo in TIPOS_GAZETTEER:
            e = self.lexico.gaz(d.tipo).get(str(d.padrao))
            return Valor(d.tipo, e.id, e.nome, e, 1.0, {"padrao": True}) if e else None
        if d.tipo in ("numero", "nivel"):
            return Valor(d.tipo, d.padrao, str(d.padrao), None, 1.0, {"padrao": True})
        return Valor(d.tipo, d.padrao, str(d.padrao), None, 1.0, {"padrao": True})

    # --------------------------------------------------------- classificador
    def _classificar(self, fala: Fala, contexto, agora, ja: Set[str]) -> List[Hipotese]:
        delex, achados, spans = self.delexicalizar(fala.texto)
        previsoes = self.classificador.prever(delex, k=3) if self.classificador else []
        out: List[Hipotese] = []
        if not previsoes:
            return out
        topo = previsoes[0][1]
        for i, (intencao, score) in enumerate(previsoes):
            if score < 0.5 or intencao in ja:
                continue
            h = self.habilidades[intencao]
            hip = self._extrair_relaxado(h, fala, achados, spans, contexto, agora)
            if hip is None:
                continue
            conf = 0.2 + 0.75 * score
            if i == 0 and len(previsoes) > 1 and topo - previsoes[1][1] < 0.04:
                conf -= 0.06
            if hip.faltando:
                conf -= 0.05
            hip.confianca = round(min(conf, 0.88), 4)
            out.append(hip)
        return out

    def _extrair_relaxado(self, h: Habilidade, fala: Fala, achados, spans, contexto, agora) -> Optional[Hipotese]:
        texto = fala.texto
        slots: Dict[str, Valor] = {}
        faltando: List[str] = []
        usados: List[Tuple[int, int]] = []
        tipos_slots = {d.tipo for d in h.slots.values()}
        for nome, d in h.slots.items():
            v = None
            if d.tipo in TIPOS_GAZETTEER:
                lista = achados.get(d.tipo) or []
                if lista:
                    a = lista[0]
                    v = Valor(d.tipo, a.entidade.id, a.alias, a.entidade, a.score)
                    usados.append((a.inicio, a.fim))
            elif d.tipo in ("tempo", "numero", "nivel", "numeros", "url"):
                v, _ = resolver(SlotDef(nome, d.tipo, fonte="frase"), None, fala, self.lexico, contexto, agora)
            if v is None and d.padrao is not None and d.tipo not in TIPOS_LIVRES:
                v = self._padrao(d, agora)
            if v is not None:
                slots[nome] = v
        livres = [n for n, d in h.slots.items() if d.tipo in TIPOS_LIVRES]
        if livres:
            remover = set(self._palavras_hab.get(h.id, set()))
            tira = list(usados)
            delex_spans = spans
            if "tempo" in tipos_slots:
                for (a, b) in delex_spans:
                    toks = texto.split()[a:b]
                    if toks and tempo_mod.extrair(" ".join(toks)):
                        tira.append((a, b))
            resto = residual(texto, sorted(remover), tira)
            livres.sort(key=lambda n: not h.slots[n].obrigatorio)
            alvo = livres[0]
            tipo = h.slots[alvo].tipo
            resto = limpar_livre(resto, tipo)
            if resto:
                v, _ = resolver(h.slots[alvo], resto, fala, self.lexico, contexto, agora)
                if v is not None:
                    if "tempo" in tipos_slots:
                        v = remover_tempo_de(v, fala, agora)
                    slots[alvo] = v
        for nome, d in h.slots.items():
            if d.obrigatorio and nome not in slots:
                faltando.append(nome)
        return Hipotese(h.id, 0.0, slots, "classificador", "", faltando, texto)

    # ------------------------------------------------------------------- LLM
    def _via_llm(self, fala: Fala, contexto, agora) -> Optional[Hipotese]:
        catalogo = [{"id": h.id, "descricao": h.descricao, "slots": list(h.slots)} for h in self.habilidades.values()]
        r = self.llm.classificar(fala.original, catalogo)
        if not r:
            return None
        intencao, brutos, conf = r
        h = self.habilidades.get(intencao)
        if not h:
            return None
        capturas = {k: self.norm.normalizar(v).texto for k, v in brutos.items() if k in h.slots}
        hip = self._montar(h, capturas, fala, contexto, agora, "", fonte="llm")
        if hip is None:
            return None
        hip.confianca = round(min(0.72, 0.4 + 0.4 * conf), 4)
        return hip

    # ------------------------------------------------------------- relatório
    def cobertura(self) -> Dict[str, int]:
        total = 0
        por_hab = {}
        for h in self.habilidades.values():
            n = sum(self.compilador.cobertura(p, 50) for p in h.padroes)
            por_hab[h.id] = n
            total += n
        return {"habilidades": len(self.habilidades), "padroes": sum(len(h.padroes) for h in self.habilidades.values()),
                "frases_aceitas_estimadas": total, "exemplos_treino": len(self.classificador.textos) if self.classificador else 0}
