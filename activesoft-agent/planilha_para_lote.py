#!/usr/bin/env python3
"""Converte a planilha de notas (padrão Jair OS / Legacy) em um lote JSON
para o agente ActiveSoft.

Formato esperado de cada aba (uma aba por turma, nome da aba = código da turma):
  - uma linha de cabeçalho contendo "Nome no diário" e "Nota da AV1" (ou AV2/EO)
  - opcionalmente a coluna "Conferência do nome"
  - uma linha com "Nnº bimestre de AAAA" em qualquer célula acima do cabeçalho

Uso:
  python3 -I planilha_para_lote.py planilha.xlsx --turma-id 2101=102 --turma-id 2301=110 \
      --disciplina-id 11 --periodo 8 > lote.json

O lote NÃO deve ser commitado: contém nomes e notas de alunos.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata

import openpyxl

CONFERIDO = {"conferido", "confirmado"}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().lower()


def ler_aba(ws):
    linhas = [list(r) for r in ws.iter_rows(values_only=True)]
    bimestre = ano = None
    avaliacao = None
    cab_idx = None
    cols = {}
    for i, row in enumerate(linhas):
        for v in row:
            if isinstance(v, str):
                m = re.search(r"(\d)\s*º\s*bimestre\s+de\s+(\d{4})", v, re.I)
                if m:
                    bimestre, ano = int(m.group(1)), int(m.group(2))
        textos = [norm(v) if isinstance(v, str) else "" for v in row]
        if "nome no diario" in textos:
            cab_idx = i
            for j, t in enumerate(textos):
                if t == "nome no diario":
                    cols["nome"] = j
                elif t.startswith("nota da "):
                    cols["nota"] = j
                    avaliacao = t.replace("nota da ", "").upper()
                elif t == "nome informado":
                    cols["informado"] = j
                elif t.startswith("conferencia"):
                    cols["conferencia"] = j
            break
    if cab_idx is None or "nome" not in cols or "nota" not in cols:
        raise SystemExit(f"Aba {ws.title!r}: cabeçalho 'Nome no diário'/'Nota da ...' não encontrado")

    notas, observacoes = [], []
    for row in linhas[cab_idx + 1:]:
        nome = row[cols["nome"]] if cols["nome"] < len(row) else None
        nota = row[cols["nota"]] if cols["nota"] < len(row) else None
        if isinstance(nome, str) and nota is None:
            if nome.strip():
                observacoes.append(nome.strip())
            continue
        if not isinstance(nome, str) or not nome.strip():
            continue
        if not isinstance(nota, (int, float)):
            raise SystemExit(f"Aba {ws.title!r}: nota não numérica para {nome!r}: {nota!r}")
        conf = row[cols["conferencia"]] if "conferencia" in cols else "Conferido"
        conf = (conf or "").strip()
        notas.append({
            "nome": nome.strip(),
            "nome_informado": (row[cols["informado"]] or "").strip() if "informado" in cols else None,
            "nota": round(float(nota), 2),
            "conferencia": conf,
            "vinculo": "confirmado" if norm(conf) in CONFERIDO else "pendente",
        })
    return {"bimestre": bimestre, "ano": ano, "avaliacao": avaliacao,
            "notas": notas, "observacoes": observacoes}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("planilha")
    ap.add_argument("--turma-id", action="append", default=[], metavar="CODIGO=ID",
                    help="mapeia código da turma (nome da aba) para o turma_id do ActiveSoft")
    ap.add_argument("--disciplina-id", type=int, required=True)
    ap.add_argument("--disciplina", default=None)
    ap.add_argument("--periodo", type=int, default=None, help="periodo (ano letivo) no ActiveSoft")
    ap.add_argument("--campo", default=None, help="rótulo da coluna no ActiveSoft (padrão: avaliação da planilha, ex. AV1)")
    ap.add_argument("--valor-maximo", type=float, default=None)
    a = ap.parse_args(argv)

    ids = {}
    for par in a.turma_id:
        k, _, v = par.partition("=")
        ids[k.strip()] = int(v)

    wb = openpyxl.load_workbook(a.planilha, data_only=False)
    turmas, meta = [], {}
    for ws in wb.worksheets:
        aba = ler_aba(ws)
        for k in ("bimestre", "ano", "avaliacao"):
            if aba[k] is not None:
                if meta.get(k) not in (None, aba[k]):
                    raise SystemExit(f"Abas com {k} diferentes: {meta[k]} x {aba[k]}")
                meta[k] = aba[k]
        if ws.title not in ids:
            raise SystemExit(f"Informe --turma-id {ws.title}=<id ActiveSoft>")
        turmas.append({"turma": ws.title, "turma_id": ids[ws.title],
                       "notas": aba["notas"], "observacoes": aba["observacoes"]})

    lote = {
        "versao": 1,
        "origem": a.planilha.rsplit("/", 1)[-1],
        "ano": meta.get("ano"),
        "bimestre": meta.get("bimestre"),
        "avaliacao": meta.get("avaliacao"),
        "campo": a.campo or meta.get("avaliacao"),
        "valor_maximo": a.valor_maximo,
        "disciplina": a.disciplina,
        "disciplina_id": a.disciplina_id,
        "periodo": a.periodo,
        "turmas": turmas,
    }
    if a.valor_maximo is not None:
        for t in turmas:
            for n in t["notas"]:
                if not 0 <= n["nota"] <= a.valor_maximo:
                    raise SystemExit(f"{t['turma']}: nota {n['nota']} de {n['nome']} fora de 0..{a.valor_maximo}")
    json.dump(lote, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
