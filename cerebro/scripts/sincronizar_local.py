#!/usr/bin/env python3
"""Gera/atualiza o léxico LOCAL (~/.jos-cerebro/local.yaml) com os dados reais do JOS.

Fontes:
* ``~/JairOS/desktop-personal/jair_preferences.json`` — escolas, perfis do navegador e
  correções de fala que o Jair Personal já usa;
* conector MCP do JOS (se ``JOS_MCP_URL`` estiver definido) — alunos e turmas do Classroom.

Mescla sem apagar o que você escreveu à mão. Nada daqui vai para o Git.

    python scripts/sincronizar_local.py            # escreve ~/.jos-cerebro/local.yaml
    python scripts/sincronizar_local.py --mostrar  # só mostra o resultado
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from cerebro.config import Config  # noqa: E402
from cerebro.execucao.jos import ClienteJOS, ErroJOS  # noqa: E402

PREFS = Path.home() / "JairOS" / "desktop-personal" / "jair_preferences.json"


def slug(t: str) -> str:
    s = unicodedata.normalize("NFD", t.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_")


def aliases_pessoa(nome: str):
    partes = nome.split()
    out = {nome.lower()}
    if partes:
        out.add(partes[0].lower())
    if len(partes) >= 2:
        out.add("%s %s" % (partes[0].lower(), partes[-1].lower()))
        out.add(partes[-1].lower())
    return sorted(out)


def lista(obj, *chaves):
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict):
        for k in chaves + ("items", "resultados", "data", "lista"):
            if isinstance(obj.get(k), list):
                return obj[k]
    return []


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mostrar", action="store_true")
    ap.add_argument("--destino", default=None)
    ap.add_argument("--contas-classroom", default="legacy,pessoal",
                    help="contas aceitas por jair_os_classroom_turmas, separadas por vírgula")
    args = ap.parse_args()
    cfg = Config.carregar()
    destino = Path(args.destino).expanduser() if args.destino else cfg.arquivo_local
    atual = yaml.safe_load(destino.read_text(encoding="utf-8")) if destino.exists() else {}
    atual = atual or {}
    for k in ("alunos", "escolas", "turmas", "pessoas", "correcoes"):
        atual.setdefault(k, {})

    if PREFS.exists():
        prefs = json.loads(PREFS.read_text(encoding="utf-8"))
        for chave, d in (prefs.get("schools") or {}).items():
            e = atual["escolas"].setdefault(chave, {"nome": chave.title(), "aliases": [], "dados": {}})
            e["aliases"] = sorted(set(e.get("aliases") or []) | set(d.get("aliases") or []))
            dados = e.setdefault("dados", {})
            if d.get("profile"):
                dados.setdefault("perfil", d["profile"])
                dados.setdefault("plataforma", "activesoft" if "activesoft" in d["profile"] else "outra")
            if d.get("url"):
                dados.setdefault("url", d["url"])
                if "p4ed" in d["url"]:
                    dados.setdefault("plataforma", "p4ed")
                elif "classroom" in d["url"]:
                    dados.setdefault("plataforma", "classroom")
        for errado, certo in (prefs.get("speech_aliases") or {}).items():
            # Só frases inteiras: aliases de uma palavra ("bota" → "toca") eram regras do parser
            # antigo e, como correção global, estragariam "bota na agenda".
            if len(str(errado).split()) >= 2:
                atual["correcoes"].setdefault(errado, certo)
        print("Preferências do Jair Personal: %d escolas, %d correções" % (len(prefs.get("schools") or {}), len(prefs.get("speech_aliases") or {})))
    else:
        print("(sem %s)" % PREFS)

    jos = ClienteJOS(cfg.jos_mcp_url, cfg.jos_mcp_token)
    if jos.configurado:
        try:
            bruto = jos.chamar("jair_os_alunos", {})
            alunos = lista(bruto, "alunos")
            if not alunos and isinstance(bruto, dict):  # {"jair_os": [...], "portal_didatica": [...]}
                alunos = [a for v in bruto.values() if isinstance(v, list) for a in v if isinstance(a, dict)]
            for a in alunos:
                nome = str(a.get("name") or a.get("nome") or "").strip()
                if not nome:
                    continue
                e = atual["alunos"].setdefault(slug(nome), {"nome": nome, "aliases": [], "dados": {}})
                e["aliases"] = sorted(set(e.get("aliases") or []) | set(aliases_pessoa(nome)))
                dados = e.setdefault("dados", {})
                for k_src, k_dst in (("grade_or_series", "serie"), ("grade", "serie"), ("subjects", "disciplinas"), ("modality", "modalidade")):
                    if a.get(k_src):
                        dados.setdefault(k_dst, a[k_src])
            print("Alunos do JOS: %d" % len(alunos))
            for conta in [c.strip() for c in args.contas_classroom.split(",") if c.strip()]:
                try:
                    turmas = lista(jos.chamar("jair_os_classroom_turmas", {"conta": conta}), "turmas", "courses")
                except ErroJOS as e:
                    print("Classroom (%s): %s" % (conta, e))
                    continue
                for t in turmas:
                    nome = str(t.get("name") or t.get("nome") or "").strip()
                    cod = re.search(r"\b(\d{4})\b", nome)
                    chave = cod.group(1) if cod else slug(nome)
                    e = atual["turmas"].setdefault(chave, {"nome": nome, "aliases": [], "dados": {}})
                    e["aliases"] = sorted(set(e.get("aliases") or []) | ({chave, "turma " + chave} if cod else {nome.lower()}))
                    e.setdefault("dados", {}).update({"classroom_id": str(t.get("id") or ""), "classroom_conta": conta})
                print("Turmas do Classroom (%s): %d" % (conta, len(turmas)))
        except ErroJOS as e:
            print("JOS indisponível: %s" % e)
    else:
        print("(JOS_MCP_URL não definido: alunos e turmas não sincronizados)")

    texto = "# Léxico LOCAL do Cérebro JOS — privado, não vai para o Git.\n" + \
        yaml.safe_dump(atual, allow_unicode=True, sort_keys=True)
    if args.mostrar:
        print(texto)
        return
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(texto, encoding="utf-8")
    destino.chmod(0o600)
    print("Escrito %s (%d alunos, %d escolas, %d turmas)" % (destino, len(atual["alunos"]), len(atual["escolas"]), len(atual["turmas"])))


if __name__ == "__main__":
    main()
