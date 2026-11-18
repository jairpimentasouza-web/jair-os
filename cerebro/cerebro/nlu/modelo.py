"""Estruturas de dados do entendimento."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .entidades import Entidade

TIPOS_GAZETTEER = {"app", "site", "ajuste", "pasta", "recurso", "disciplina", "topico", "material",
                   "banca", "aluno", "escola", "turma", "pessoa"}
TIPOS_LIVRES = {"texto", "consulta"}


@dataclass
class SlotDef:
    nome: str
    tipo: str = "texto"
    obrigatorio: bool = False
    pergunta: str = ""
    padrao: Any = None
    fonte: str = "captura"          # captura | frase
    livre_se_falhar: bool = False   # entidade não achada vira texto livre
    fonte_alternativa: str = ""     # "frase": usa a frase toda se a captura vier vazia

    @classmethod
    def de(cls, nome: str, d: Optional[dict]) -> "SlotDef":
        d = d or {}
        return cls(nome=nome, tipo=str(d.get("tipo", "texto")), obrigatorio=bool(d.get("obrigatorio", False)),
                   pergunta=str(d.get("pergunta", "")), padrao=d.get("padrao"), fonte=str(d.get("fonte", "captura")),
                   livre_se_falhar=bool(d.get("livre_se_falhar", False)),
                   fonte_alternativa=str(d.get("fonte_alternativa", "")))


@dataclass
class Habilidade:
    id: str
    descricao: str
    risco: str = "R0"
    padroes: List[str] = field(default_factory=list)
    exemplos: List[str] = field(default_factory=list)
    slots: Dict[str, SlotDef] = field(default_factory=dict)
    acao: Dict[str, Any] = field(default_factory=dict)
    respostas: List[str] = field(default_factory=list)
    confirmacao: str = ""
    dominio: str = ""
    compilados: List[Any] = field(default_factory=list)  # (regex, nomes_slots, padrao)

    @property
    def nivel_risco(self) -> int:
        try:
            return int(self.risco.strip().upper().lstrip("R"))
        except ValueError:
            return 0


@dataclass
class Valor:
    tipo: str
    valor: Any
    texto: str = ""
    entidade: Optional[Entidade] = None
    score: float = 1.0
    extra: Dict[str, Any] = field(default_factory=dict)

    def campo(self, nome: Optional[str]) -> Any:
        if nome in (None, "", "valor"):
            return self.valor
        if nome == "texto":
            return self.texto
        if self.entidade is not None:
            if nome == "nome":
                return self.entidade.nome
            if nome == "id":
                return self.entidade.id
            v = self.entidade.dados.get(nome)
            if v is not None:
                return v
        return self.extra.get(nome)

    def json(self) -> Dict[str, Any]:
        out: Dict[str, Any] = {"tipo": self.tipo, "valor": self.valor, "texto": self.texto, "score": round(self.score, 3)}
        if self.entidade is not None:
            out["entidade"] = {"id": self.entidade.id, "nome": self.entidade.nome}
        if self.extra:
            out["extra"] = {k: v for k, v in self.extra.items() if isinstance(v, (str, int, float, bool, list, dict, type(None)))}
        return out


@dataclass
class Hipotese:
    intencao: str
    confianca: float
    slots: Dict[str, Valor] = field(default_factory=dict)
    fonte: str = "gramatica"   # gramatica | classificador | llm | contexto | apelido
    padrao: str = ""
    faltando: List[str] = field(default_factory=list)
    texto: str = ""            # texto normalizado que gerou a hipótese

    def json(self) -> Dict[str, Any]:
        return {
            "intencao": self.intencao,
            "confianca": round(self.confianca, 3),
            "fonte": self.fonte,
            "slots": {k: v.json() for k, v in self.slots.items()},
            "faltando": list(self.faltando),
            "padrao": self.padrao,
        }
