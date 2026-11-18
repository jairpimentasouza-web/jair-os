"""Classificador estatístico de intenções (rota de segurança quando a gramática não casa).

Combina dois sinais sobre frases *delexicalizadas* ("abre <app>", "toca <texto>"):

* centróides TF-IDF de n-gramas de caracteres (3–5) e de palavras — robusto a
  erros de grafia e à ordem das palavras;
* vizinho mais próximo por distância de edição (RapidFuzz) — capta frases
  quase idênticas a um exemplo conhecido.

Sem dependências além do RapidFuzz; treina em ~1 s e usa cache em disco.
"""
from __future__ import annotations

import hashlib
import math
import pickle
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

from rapidfuzz import fuzz, process

from ..texto.fonetica import chave


def _features(texto: str) -> Counter:
    c: Counter = Counter()
    palavras = texto.split()
    for w in palavras:
        c["w:" + w] += 1
    for a, b in zip(palavras, palavras[1:]):
        c["b:%s_%s" % (a, b)] += 1
    for w in palavras:
        if w.startswith("<"):
            continue
        k = " %s " % chave(w)
        for n in (3, 4, 5):
            for i in range(0, max(0, len(k) - n + 1)):
                c["c:" + k[i:i + n]] += 1
    return c


class Classificador:
    VERSAO = 3

    def __init__(self) -> None:
        self.idf: Dict[str, float] = {}
        self.centroides: Dict[str, Dict[str, float]] = {}
        self.textos: List[str] = []
        self.rotulos: List[str] = []

    # ---------------------------------------------------------------- treino
    def treinar(self, exemplos: Sequence[Tuple[str, str]]) -> "Classificador":
        vistos = set()
        docs: List[Tuple[str, str]] = []
        for texto, rotulo in exemplos:
            t = " ".join(texto.split())
            if t and (t, rotulo) not in vistos:
                vistos.add((t, rotulo))
                docs.append((t, rotulo))
        self.textos = [t for t, _ in docs]
        self.rotulos = [r for _, r in docs]
        feats = [_features(t) for t in self.textos]
        df: Counter = Counter()
        for f in feats:
            df.update(f.keys())
        n = len(feats)
        self.idf = {k: math.log((1 + n) / (1 + v)) + 1.0 for k, v in df.items()}
        soma: Dict[str, Counter] = defaultdict(Counter)
        cont: Counter = Counter()
        for f, r in zip(feats, self.rotulos):
            v = self._vetor(f)
            soma[r].update(v)
            cont[r] += 1
        self.centroides = {}
        for r, s in soma.items():
            norma = math.sqrt(sum(x * x for x in s.values())) or 1.0
            self.centroides[r] = {k: x / norma for k, x in s.items()}
        return self

    def _vetor(self, f: Counter) -> Dict[str, float]:
        v = {k: (1 + math.log(c)) * self.idf.get(k, 0.0) for k, c in f.items() if k in self.idf}
        norma = math.sqrt(sum(x * x for x in v.values())) or 1.0
        return {k: x / norma for k, x in v.items()}

    # -------------------------------------------------------------- predição
    def prever(self, texto: str, k: int = 5) -> List[Tuple[str, float]]:
        texto = " ".join(texto.split())
        if not texto or not self.centroides:
            return []
        q = self._vetor(_features(texto))
        cos = {r: sum(w * c.get(f, 0.0) for f, w in q.items()) for r, c in self.centroides.items()}
        vizinho: Dict[str, float] = {}
        for _, s, i in process.extract(texto, self.textos, scorer=fuzz.token_sort_ratio, limit=60):
            r = self.rotulos[i]
            s2 = 0.5 * s + 0.5 * fuzz.ratio(texto, self.textos[i])
            if s2 > vizinho.get(r, 0.0):
                vizinho[r] = s2
        final = {}
        for r in self.centroides:
            final[r] = 0.45 * cos.get(r, 0.0) + 0.55 * vizinho.get(r, 0.0) / 100.0
        return sorted(final.items(), key=lambda x: -x[1])[:k]

    # ----------------------------------------------------------------- cache
    @staticmethod
    def assinatura(exemplos: Sequence[Tuple[str, str]]) -> str:
        h = hashlib.sha256(str(Classificador.VERSAO).encode())
        for t, r in exemplos:
            h.update(t.encode())
            h.update(b"\x00")
            h.update(r.encode())
            h.update(b"\x01")
        return h.hexdigest()[:20]

    @classmethod
    def treinar_com_cache(cls, exemplos: Sequence[Tuple[str, str]], pasta_cache: Optional[Path]) -> "Classificador":
        if pasta_cache is None:
            return cls().treinar(exemplos)
        arq = Path(pasta_cache) / ("classificador-%s.pkl" % cls.assinatura(exemplos))
        if arq.exists():
            try:
                with arq.open("rb") as f:
                    obj = pickle.load(f)
                if isinstance(obj, cls):
                    return obj
            except Exception:  # cache corrompido: retreina
                pass
        obj = cls().treinar(exemplos)
        try:
            arq.parent.mkdir(parents=True, exist_ok=True)
            for velho in arq.parent.glob("classificador-*.pkl"):
                velho.unlink()
            with arq.open("wb") as f:
                pickle.dump(obj, f)
        except OSError:
            pass
        return obj
