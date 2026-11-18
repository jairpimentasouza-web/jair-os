"""Biblioteca léxica do Cérebro JOS.

Três camadas, mescladas nesta ordem (a última vence):

1. **núcleo** — ``cerebro/lexico/dados/*.yaml`` (público, versionado);
2. **local** — ``~/.jos-cerebro/local.yaml`` (privado: alunos, escolas, turmas,
   contatos e correções pessoais; nunca vai para o Git);
3. **aprendido** — ``~/.jos-cerebro/aprendido.yaml`` (o que o Jarvis aprendeu
   com você: "quando eu disser X, quero dizer Y").
"""
from __future__ import annotations

import os
import re
import threading
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set

import yaml

from ..nlu.entidades import Entidade, Gazetteer
from ..texto.basico import dobrar
from ..texto.conjugador import formas

DADOS = Path(__file__).with_name("dados")

# Tipos de entidade e o limiar de semelhança de cada um.
LIMIARES = {
    "app": 0.84, "site": 0.84, "ajuste": 0.86, "pasta": 0.86, "recurso": 0.88,
    "disciplina": 0.86, "topico": 0.86, "material": 0.86, "banca": 0.9,
    "aluno": 0.84, "escola": 0.86, "turma": 0.95, "pessoa": 0.86,
}


def _ler_yaml(caminho: Path) -> dict:
    if not caminho or not caminho.exists():
        return {}
    with caminho.open(encoding="utf-8-sig") as f:
        return yaml.safe_load(f) or {}


def _slug(texto: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", dobrar(texto)).strip("_")


def _entidades(tipo: str, bloco: Dict[str, dict]) -> List[Entidade]:
    out = []
    for id_, d in (bloco or {}).items():
        d = d or {}
        dados = {k: v for k, v in d.items() if k not in ("nome", "aliases")}
        if isinstance(d.get("dados"), dict):
            dados.update(d["dados"])
            dados.pop("dados", None)
        out.append(Entidade(id=str(id_), tipo=tipo, nome=str(d.get("nome") or id_),
                            aliases=[str(a) for a in d.get("aliases") or []], dados=dados))
    return out


class Lexico:
    """Vocabulário completo: verbos, expressões, correções e entidades."""

    def __init__(self) -> None:
        self.familias: Dict[str, Set[str]] = {}
        self.verbos_por_familia: Dict[str, List[str]] = {}
        self.expressoes: Dict[str, object] = {}
        self.correcoes: Dict[str, str] = {}
        self.alucinacoes: List[str] = []
        self.apelidos: Dict[str, str] = {}
        self.gazetteers: Dict[str, Gazetteer] = {}
        self.topicos_por_disciplina: Dict[str, List[str]] = {}
        self.caminho_aprendido: Optional[Path] = None
        self.caminho_local: Optional[Path] = None
        self._trava = threading.Lock()

    # ------------------------------------------------------------------ carga
    @classmethod
    def carregar(cls, local: Optional[os.PathLike] = None, aprendido: Optional[os.PathLike] = None,
                 dados: Optional[os.PathLike] = None) -> "Lexico":
        lx = cls()
        base = Path(dados) if dados else DADOS
        verbos = _ler_yaml(base / "verbos.yaml")
        expr = _ler_yaml(base / "expressoes.yaml")
        corr = _ler_yaml(base / "correcoes_stt.yaml")
        apps = _ler_yaml(base / "apps.yaml")
        sites = _ler_yaml(base / "sites.yaml")
        sistema = _ler_yaml(base / "sistema.yaml")
        disc = _ler_yaml(base / "disciplinas.yaml")

        for nome, d in verbos.items():
            lx._adicionar_familia(nome, d.get("verbos") or [], d.get("irregulares") or [], d.get("expressoes") or [])
        lx.expressoes = expr
        lx.correcoes = {dobrar(k): dobrar(v) for k, v in (corr.get("correcoes") or {}).items()}
        lx.alucinacoes = [dobrar(x) for x in corr.get("alucinacoes") or []]

        tipos: Dict[str, List[Entidade]] = {
            "app": _entidades("app", apps),
            "site": _entidades("site", sites),
            "ajuste": _entidades("ajuste", sistema.get("ajustes")),
            "pasta": _entidades("pasta", sistema.get("pastas")),
            "recurso": _entidades("recurso", sistema.get("recursos")),
            "disciplina": _entidades("disciplina", disc.get("disciplinas")),
            "material": [Entidade(id=k, tipo="material", nome=v[0], aliases=list(v)) for k, v in (disc.get("materiais") or {}).items()],
            "banca": [Entidade(id=_slug(b), tipo="banca", nome=b.upper() if len(b) <= 6 else b.title(), aliases=[b]) for b in disc.get("bancas") or []],
            "topico": [],
            "aluno": [], "escola": [], "turma": [], "pessoa": [],
        }
        for disciplina, lista in (disc.get("topicos") or {}).items():
            lx.topicos_por_disciplina[disciplina] = list(lista)
            for t in lista:
                tipos["topico"].append(Entidade(id=_slug(t), tipo="topico", nome=t, aliases=[t], dados={"disciplina": disciplina}))

        # Camada local (privada)
        lx.caminho_local = Path(local).expanduser() if local else None
        loc = _ler_yaml(lx.caminho_local) if lx.caminho_local else {}
        for tipo_local, tipo in (("alunos", "aluno"), ("escolas", "escola"), ("turmas", "turma"), ("pessoas", "pessoa"),
                                 ("apps", "app"), ("sites", "site"), ("pastas", "pasta")):
            if loc.get(tipo_local):
                existentes = {e.id: e for e in tipos[tipo]}
                for e in _entidades(tipo, loc[tipo_local]):
                    if e.id in existentes:
                        existentes[e.id].aliases.extend(e.aliases)
                        existentes[e.id].dados.update(e.dados)
                    else:
                        tipos[tipo].append(e)
        for k, v in (loc.get("correcoes") or {}).items():
            lx.correcoes[dobrar(k)] = dobrar(v)
        for nome, d in (loc.get("verbos") or {}).items():
            lx._adicionar_familia(nome, d.get("verbos") or [], d.get("irregulares") or [], d.get("expressoes") or [])

        for tipo, ents in tipos.items():
            lx.gazetteers[tipo] = Gazetteer(tipo, ents, LIMIARES.get(tipo, 0.85))

        # Camada aprendida
        lx.caminho_aprendido = Path(aprendido).expanduser() if aprendido else None
        apr = _ler_yaml(lx.caminho_aprendido) if lx.caminho_aprendido else {}
        lx.apelidos = {dobrar(k): str(v) for k, v in (apr.get("apelidos") or {}).items()}
        for k, v in (apr.get("correcoes") or {}).items():
            lx.correcoes[dobrar(k)] = dobrar(v)
        for tipo, bloco in (apr.get("entidades") or {}).items():
            g = lx.gazetteers.get(tipo)
            if g is not None:
                for e in _entidades(tipo, bloco):
                    atual = g.get(e.id)
                    if atual:
                        atual.aliases.extend(e.aliases)
                        g.adicionar(atual)
                    else:
                        g.adicionar(e)
        return lx

    def _adicionar_familia(self, nome: str, verbos: Iterable[str], irregulares: Iterable[str], expressoes: Iterable[str]) -> None:
        conj: Set[str] = set(self.familias.get(nome, set()))
        for v in verbos:
            conj |= formas(v)
        conj |= {dobrar(x).strip() for x in list(irregulares) + list(expressoes) if str(x).strip()}
        self.familias[nome] = {c for c in conj if c}
        self.verbos_por_familia.setdefault(nome, [])
        self.verbos_por_familia[nome].extend(v for v in verbos if v not in self.verbos_por_familia[nome])

    # -------------------------------------------------------------- consultas
    def familia(self, nome: str) -> Set[str]:
        if nome not in self.familias:
            raise KeyError("família de verbos desconhecida: %s" % nome)
        return self.familias[nome]

    def gaz(self, tipo: str) -> Gazetteer:
        if tipo not in self.gazetteers:
            self.gazetteers[tipo] = Gazetteer(tipo, [], LIMIARES.get(tipo, 0.85))
        return self.gazetteers[tipo]

    def lista(self, grupo: str) -> List[str]:
        v = self.expressoes.get(grupo) or []
        if isinstance(v, dict):
            return [dobrar(x) for x in v]
        return [dobrar(x) for x in v]

    def hotwords(self, limite: int = 80) -> List[str]:
        """Termos raros que o reconhecimento de voz deve priorizar (nomes próprios)."""
        termos: List[str] = ["Jarvis", "Jair OS"]
        for tipo in ("aluno", "escola", "turma", "app", "site", "pessoa"):
            for e in self.gaz(tipo).entidades.values():
                if e.nome not in termos:
                    termos.append(e.nome)
        for termo in ("Classroom", "ActiveSoft", "Drive", "Gmail", "WhatsApp", "YouTube", "AV1", "AV2", "ENEM", "UERJ", "bimestre", "gabarito"):
            if termo not in termos:
                termos.append(termo)
        return termos[:limite]

    def estatisticas(self) -> Dict[str, int]:
        formas_verbais = sum(len(v) for v in self.familias.values())
        aliases = sum(len(g.aliases()) for g in self.gazetteers.values())
        entidades = sum(len(g) for g in self.gazetteers.values())
        expr = 0
        for v in self.expressoes.values():
            expr += len(v) if isinstance(v, (list, dict)) else 0
        return {
            "familias_verbais": len(self.familias),
            "formas_verbais": formas_verbais,
            "entidades": entidades,
            "aliases_de_entidades": aliases,
            "expressoes_de_conversa": expr + sum(len(v) for v in (self.expressoes.get("despertar") or {}).values()),
            "correcoes_stt": len(self.correcoes),
            "apelidos_aprendidos": len(self.apelidos),
            "total_termos": formas_verbais + aliases + expr + len(self.correcoes) + len(self.apelidos),
        }

    # ------------------------------------------------------------ aprendizado
    def _salvar_aprendido(self, mutador) -> None:
        if not self.caminho_aprendido:
            return
        with self._trava:
            dados = _ler_yaml(self.caminho_aprendido)
            mutador(dados)
            self.caminho_aprendido.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.caminho_aprendido.with_suffix(".tmp")
            with tmp.open("w", encoding="utf-8") as f:
                yaml.safe_dump(dados, f, allow_unicode=True, sort_keys=True)
            tmp.replace(self.caminho_aprendido)

    def aprender_apelido(self, frase: str, significado: str) -> None:
        chave = dobrar(frase).strip()
        self.apelidos[chave] = significado.strip()
        self._salvar_aprendido(lambda d: d.setdefault("apelidos", {}).__setitem__(frase.strip(), significado.strip()))

    def esquecer_apelido(self, frase: str) -> bool:
        chave = dobrar(frase).strip()
        if chave not in self.apelidos:
            return False
        del self.apelidos[chave]

        def _rm(d):
            ap = d.get("apelidos") or {}
            for k in list(ap):
                if dobrar(k).strip() == chave:
                    del ap[k]
        self._salvar_aprendido(_rm)
        return True

    def aprender_correcao(self, errado: str, certo: str) -> None:
        self.correcoes[dobrar(errado)] = dobrar(certo)
        self._salvar_aprendido(lambda d: d.setdefault("correcoes", {}).__setitem__(errado.strip(), certo.strip()))

    def aprender_alias(self, tipo: str, id_: str, alias: str) -> bool:
        g = self.gaz(tipo)
        e = g.get(id_)
        if not e:
            return False
        e.aliases.append(alias)
        g.adicionar(e)

        def _add(d):
            ent = d.setdefault("entidades", {}).setdefault(tipo, {}).setdefault(id_, {"aliases": []})
            ent.setdefault("aliases", []).append(alias)
        self._salvar_aprendido(_add)
        return True
