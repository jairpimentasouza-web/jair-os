"use strict";
var CejaMotor = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/lib/notas/motor.ts
  var motor_exports = {};
  __export(motor_exports, {
    REGRA_PADRAO_CEJA: () => REGRA_PADRAO_CEJA,
    calcularMedia: () => calcularMedia,
    formatarNota: () => formatarNota,
    paraRacional: () => paraRacional,
    validarNota: () => validarNota,
    validarRegra: () => validarRegra
  });
  var mdc = (a, b) => {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b) [a, b] = [b, a % b];
    return a || 1n;
  };
  var q = (n, d = 1n) => {
    if (d === 0n) throw new Error("divis\xE3o por zero");
    if (d < 0n) [n, d] = [-n, -d];
    const g = mdc(n, d);
    return { n: n / g, d: d / g };
  };
  var soma = (a, b) => q(a.n * b.d + b.n * a.d, a.d * b.d);
  var mult = (a, b) => q(a.n * b.n, a.d * b.d);
  var div = (a, b) => q(a.n * b.d, a.d * b.n);
  var maior = (a, b) => a.n * b.d > b.n * a.d;
  function paraRacional(v) {
    const s = String(v).trim().replace(",", ".");
    if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error(`valor num\xE9rico inv\xE1lido: ${v}`);
    const [int, frac = ""] = s.replace("-", "").split(".");
    const escala = 10n ** BigInt(frac.length);
    const n = BigInt(int) * escala + BigInt(frac || "0");
    return q(s.startsWith("-") ? -n : n, escala);
  }
  var paraNumero = (x, casas = 4) => Number(arredondar(x, "meio_para_cima", casas).toFixed(casas));
  function arredondarRacional(x, modo, casas, multiplo) {
    if (modo === "multiplo_meio_para_cima") {
      const m = paraRacional(multiplo ?? 0.5);
      const k = div(x, m);
      const inteiro2 = k.n / k.d;
      const resto = k.n % k.d;
      const r = 2n * resto >= k.d ? inteiro2 + 1n : inteiro2;
      return mult(q(r), m);
    }
    const escala = 10n ** BigInt(casas);
    const escalado = x.n * escala;
    let inteiro = escalado / x.d;
    if (modo === "meio_para_cima") {
      const resto = escalado % x.d;
      if (2n * resto >= x.d) inteiro += 1n;
    }
    return q(inteiro, escala);
  }
  function arredondar(x, modo, casas, multiplo) {
    const r = arredondarRacional(x, modo, casas, multiplo);
    return Number(r.n) / Number(r.d);
  }
  function validarNota(entrada, notaMaxima, casas) {
    const s = String(entrada).trim().replace(",", ".");
    if (s === "") return { ok: false, erro: "Nota vazia." };
    if (!/^\d+(\.\d+)?$/.test(s)) return { ok: false, erro: "Use apenas n\xFAmeros, por exemplo 7,5." };
    const frac = s.split(".")[1] ?? "";
    if (frac.length > casas) return { ok: false, erro: `Use no m\xE1ximo ${casas} casa(s) decimal(is).` };
    const v = paraRacional(s);
    const max = paraRacional(notaMaxima);
    if (v.n < 0n) return { ok: false, erro: "A nota n\xE3o pode ser negativa." };
    if (maior(v, max)) return { ok: false, erro: `A nota m\xE1xima \xE9 ${String(notaMaxima).replace(".", ",")}.` };
    return { ok: true, valor: Number(s) };
  }
  function validarRegra(r) {
    const erros = [];
    if (!(r.nota_maxima > 0 && r.nota_maxima <= 10)) erros.push("nota_maxima deve estar entre 0 e 10");
    if (!Number.isInteger(r.casas_decimais_lancamento) || r.casas_decimais_lancamento < 0 || r.casas_decimais_lancamento > 2)
      erros.push("casas_decimais_lancamento deve ser 0, 1 ou 2");
    if (!Array.isArray(r.componentes) || r.componentes.length === 0) erros.push("a regra precisa de ao menos um componente");
    const codigos = /* @__PURE__ */ new Set();
    for (const c of r.componentes ?? []) {
      if (!/^[A-Z_]{2,30}$/.test(c.codigo)) erros.push(`c\xF3digo de componente inv\xE1lido: ${c.codigo}`);
      if (codigos.has(c.codigo)) erros.push(`componente duplicado: ${c.codigo}`);
      codigos.add(c.codigo);
      if (!(c.peso > 0)) erros.push(`peso inv\xE1lido em ${c.codigo}`);
      if (!["media_aritmetica", "unica", "soma_pontos"].includes(c.composicao)) erros.push(`composi\xE7\xE3o inv\xE1lida em ${c.codigo}`);
    }
    const a = r.arredondamento;
    if (!a || !["meio_para_cima", "truncar", "multiplo_meio_para_cima"].includes(a.modo)) erros.push("modo de arredondamento inv\xE1lido");
    else if (a.modo !== "multiplo_meio_para_cima" && !(Number.isInteger(a.casas) && a.casas >= 0 && a.casas <= 2))
      erros.push("arredondamento: casas deve ser 0, 1 ou 2");
    else if (a.modo === "multiplo_meio_para_cima" && !(a.multiplo && a.multiplo > 0 && a.multiplo <= 1))
      erros.push("arredondamento: m\xFAltiplo deve estar entre 0 e 1");
    if (!r.recuperacao || !["nenhuma", "substitui_se_maior"].includes(r.recuperacao.modo)) erros.push("modo de recupera\xE7\xE3o inv\xE1lido");
    return erros;
  }
  function calcularMedia(regra, instrumentos) {
    const pendencias = [];
    const naoComputados = [];
    const escala = paraRacional(regra.nota_maxima);
    const componentesRegra = new Set(regra.componentes.map((c) => c.codigo));
    for (const i of instrumentos) {
      if (i.tipo === "especial" || i.tipo === "regular" && !componentesRegra.has(i.componente))
        naoComputados.push(i.nome);
    }
    const segundasChamadas = instrumentos.filter((i) => i.tipo === "segunda_chamada");
    const resultados = regra.componentes.map((comp) => {
      const regulares = instrumentos.filter((i) => i.tipo === "regular" && i.componente === comp.codigo);
      const considerados = [];
      const pendentes = [];
      const valores = [];
      const maximos = [];
      const somaPontos = comp.composicao === "soma_pontos";
      if (regulares.length === 0) pendentes.push(`Nenhuma avalia\xE7\xE3o do componente ${comp.nome} cadastrada`);
      if (comp.composicao === "unica" && regulares.length > 1)
        pendentes.push(`Componente ${comp.nome} admite uma \xFAnica avalia\xE7\xE3o (configura\xE7\xE3o)`);
      for (const ins of regulares) {
        if (!somaPontos && paraRacional(ins.notaMaxima).n * escala.d !== escala.n * paraRacional(ins.notaMaxima).d) {
          pendentes.push(`${ins.nome}: pontua\xE7\xE3o m\xE1xima difere da escala da regra (configura\xE7\xE3o)`);
          continue;
        }
        if (ins.situacao === "dispensado") {
          considerados.push(`${ins.nome} (dispensado)`);
          continue;
        }
        if (ins.situacao === "lancada" && ins.valor !== null) {
          valores.push(paraRacional(ins.valor));
          maximos.push(paraRacional(ins.notaMaxima));
          considerados.push(ins.nome);
          continue;
        }
        if (ins.situacao === "falta") {
          const sc = segundasChamadas.find((s) => s.substituiId === ins.avaliacaoId && s.situacao === "lancada" && s.valor !== null);
          if (sc) {
            valores.push(paraRacional(sc.valor));
            maximos.push(paraRacional(sc.notaMaxima));
            considerados.push(`${sc.nome} (2\xAA chamada de ${ins.nome})`);
          } else {
            pendentes.push(`${ins.nome}: falta \u2014 aguardando segunda chamada`);
          }
          continue;
        }
        pendentes.push(`${ins.nome}: nota n\xE3o lan\xE7ada`);
      }
      const completo = pendentes.length === 0 && valores.length > 0;
      let valorExato = null;
      if (completo) {
        valorExato = valores.reduce((acc, v) => soma(acc, v), q(0n));
        valorExato = somaPontos ? div(mult(escala, valorExato), maximos.reduce((acc, v) => soma(acc, v), q(0n))) : div(valorExato, q(BigInt(valores.length)));
      }
      pendencias.push(...pendentes);
      return {
        codigo: comp.codigo,
        nome: comp.nome,
        peso: comp.peso,
        valor: valorExato ? paraNumero(valorExato) : null,
        completo,
        considerados,
        pendentes,
        _exato: valorExato
      };
    });
    const completa = resultados.every((r) => r.completo);
    let media = null;
    let recuperacaoAplicada = false;
    if (completa) {
      let num = q(0n);
      let den = q(0n);
      for (const r of resultados) {
        const p = paraRacional(r.peso);
        num = soma(num, mult(p, r._exato));
        den = soma(den, p);
      }
      let exata = div(num, den);
      if (regra.recuperacao?.modo === "substitui_se_maior") {
        const rec = instrumentos.find((i) => i.tipo === "recuperacao" && i.situacao === "lancada" && i.valor !== null);
        if (rec) {
          const v = paraRacional(rec.valor);
          if (maior(v, exata)) {
            exata = v;
            recuperacaoAplicada = true;
          }
        }
      }
      const a = regra.arredondamento;
      media = arredondar(exata, a.modo, a.casas, a.multiplo);
    }
    for (const r of resultados) delete r._exato;
    return { componentes: resultados, media, completa, pendencias, naoComputados, recuperacaoAplicada };
  }
  function formatarNota(v, minCasas = 1) {
    if (v === null || v === void 0 || Number.isNaN(v)) return "\u2014";
    const s = v.toFixed(2).replace(/0+$/, "");
    const [i, f = ""] = s.split(".");
    return `${i},${f.padEnd(minCasas, "0")}`;
  }
  var REGRA_PADRAO_CEJA = {
    nota_maxima: 10,
    casas_decimais_lancamento: 2,
    componentes: [
      { codigo: "TESTE", nome: "Teste", peso: 1, composicao: "media_aritmetica" },
      { codigo: "AVALIACAO", nome: "Avalia\xE7\xE3o", peso: 1, composicao: "media_aritmetica" }
    ],
    arredondamento: { modo: "meio_para_cima", casas: 2 },
    recuperacao: { modo: "nenhuma" },
    media_referencia: 6,
    pendencias_institucionais: [
      "Confirmar a regra de arredondamento: a vers\xE3o 1 apenas limita a m\xE9dia a 2 casas (meio para cima); com notas de 1 casa decimal, (T + A) / 2 nunca \xE9 alterada.",
      "Aprovar formalmente a composi\xE7\xE3o de m\xFAltiplos testes por m\xE9dia aritm\xE9tica dos testes v\xE1lidos (padr\xE3o proposto).",
      "Confirmar a m\xE9dia de refer\xEAncia institucional (6,0 usada apenas para alertas pedag\xF3gicos, n\xE3o para aprova\xE7\xE3o).",
      "Definir recupera\xE7\xE3o, aprova\xE7\xE3o anual e fechamento conforme o regimento escolar antes da implanta\xE7\xE3o."
    ]
  };
  return __toCommonJS(motor_exports);
})();
