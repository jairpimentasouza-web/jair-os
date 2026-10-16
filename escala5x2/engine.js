/* Motor do Escala 5x2 Inteligente: dimensionamento, custo e gerador de escala.
   Sem dependências. Roda no navegador e em Node (testes). */
var E5 = (function () {
  'use strict';

  var DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  var SEMANAS_MES = 365.25 / 7 / 12;

  function ceilTol(x, tol) { return Math.ceil(x - (tol || 0) - 1e-9); }
  function sum(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; }
  function max(a) { var m = 0; for (var i = 0; i < a.length; i++) if (a[i] > m) m = a[i]; return m; }

  /* Regimes de jornada. H = horas semanais, w = dias trabalhados por semana. */
  function regimes(cfg) {
    return {
      hoje: { key: 'hoje', nome: 'Hoje', H: cfg.H0, w: cfg.w0 },
      fase1: { key: 'fase1', nome: 'Fase 1 (42h)', H: 42, w: 7 - cfg.folgasFase1 },
      final: { key: 'final', nome: 'Regime final (40h)', H: 40, w: 5 }
    };
  }

  /* Pessoas necessárias por dia da semana em um regime.
     A demanda "r" é o número de pessoas presentes por dia com a jornada de hoje (H0/w0).
     Em outro regime cada pessoa-dia entrega H/w horas; converte-se a demanda em horas. */
  function needArray(r, cfg, reg) {
    var hojeDia = cfg.H0 / cfg.w0, h = reg.H / reg.w;
    var out = [];
    for (var d = 0; d < 7; d++) {
      var v = +r[d] || 0;
      out.push(v <= 0 ? 0 : Math.max(1, ceilTol(v * hojeDia / h, cfg.tol)));
    }
    return out;
  }

  /* Menor equipe que fecha a cobertura: precisa de pessoas-dia suficientes e de gente no dia de pico. */
  function nMin(need, w) {
    var s = sum(need);
    if (s === 0) return 0;
    return Math.max(Math.ceil(s / w - 1e-9), max(need));
  }

  /* Pessoas-dia que faltam com n pessoas trabalhando w dias por semana. */
  function shortfall(need, n, w) {
    var cap = 0;
    for (var d = 0; d < 7; d++) cap += Math.min(need[d], n);
    return sum(need) - Math.min(w * n, cap);
  }

  /* Dimensiona uma equipe em um regime e compara as formas de cobrir o que falta. */
  function analisarGrupo(g, cfg, reg) {
    var need = needArray(g.r, cfg, reg);
    var nm = nMin(need, reg.w);
    var h = reg.H / reg.w;
    var salHora = g.salario / (reg.H * 5);
    var custoContratar = g.salario * (1 + cfg.encargos) + cfg.beneficios;
    var custoHoraExtra = salHora * (1 + cfg.adicionalHE) * (1 + cfg.reflexosHE);
    var deficit = Math.max(0, nm - g.n);
    var folga = Math.max(0, g.n - nm);

    function cenario(x) {
      var n2 = g.n + x;
      var S = shortfall(need, n2, reg.w);
      var horas = S * h;
      var viavel = horas <= n2 * cfg.capHE + 1e-9;
      var custoHE = horas * SEMANAS_MES * custoHoraExtra;
      return { contratar: x, pessoasDia: S, horasSemana: horas, viavel: viavel,
               custoContratacao: x * custoContratar, custoHE: custoHE,
               custoMensal: x * custoContratar + custoHE };
    }

    var todos = [];
    for (var x = 0; x <= deficit; x++) todos.push(cenario(x));
    var soContratar = todos[deficit];
    var soHE = todos[0];
    var melhor = null;
    for (var i = 0; i < todos.length; i++) {
      if (!todos[i].viavel) continue;
      if (melhor === null || todos[i].custoMensal < melhor.custoMensal - 1e-9) melhor = todos[i];
    }
    if (melhor === null) melhor = soContratar;

    return {
      nome: g.nome, n: g.n, need: need, nMin: nm, deficit: deficit, folga: folga,
      horasPorDia: h, salarioHora: salHora, custoContratarUnit: custoContratar,
      soContratar: soContratar, soHE: soHE, recomendado: melhor
    };
  }

  /* Diagnóstico completo de todos os grupos nas três fases. */
  function diagnostico(state) {
    var cfg = state.cfg, regs = regimes(cfg), out = { fases: {} };
    ['hoje', 'fase1', 'final'].forEach(function (k) {
      var gs = state.groups.map(function (g) { return analisarGrupo(g, cfg, regs[k]); });
      var t = { reg: regs[k], grupos: gs, pessoasAtual: 0, pessoasNecessarias: 0, deficit: 0,
                contratarTudo: 0, soHE: 0, recomendado: 0, contratacoesRecomendadas: 0,
                horasExtraSemana: 0, heInviavel: false };
      gs.forEach(function (a) {
        t.pessoasAtual += a.n;
        t.pessoasNecessarias += a.nMin;
        t.deficit += a.deficit;
        t.contratarTudo += a.soContratar.custoMensal;
        t.soHE += a.soHE.custoMensal;
        if (a.deficit > 0 && !a.soHE.viavel) t.heInviavel = true;
        t.recomendado += a.recomendado.custoMensal;
        t.contratacoesRecomendadas += a.recomendado.contratar;
        t.horasExtraSemana += a.recomendado.horasSemana;
      });
      out.fases[k] = t;
    });
    var folhaMensal = 0, horasHoje = 0, horasFinal = 0;
    state.groups.forEach(function (g) { folhaMensal += g.n * g.salario; });
    out.folhaMensal = folhaMensal;
    out.custoHoraAumentoPct = (cfg.H0 / 40 - 1) * 100;
    out.anual = out.fases.final.recomendado * 12;
    return out;
  }

  /* ---------- Gerador de escala ---------- */

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function candidatos(k) {
    var c = [], a, b;
    if (k === 0) c.push({ off: [], consec: true });
    else if (k === 1) for (a = 0; a < 7; a++) c.push({ off: [a], consec: true });
    else for (a = 0; a < 7; a++) for (b = a + 1; b < 7; b++) c.push({ off: [a, b], consec: b === a + 1 });
    return c;
  }

  /* Gera a escala de n pessoas por "semanas" semanas.
     opts: need[7], n, w, weeks, maxSundayRow, seed. Retorna grade, cobertura e alertas. */
  function gerarEscala(opts) {
    var need = opts.need, n = opts.n, w = opts.w, weeks = opts.weeks || 4;
    var k = 7 - w, cands = candidatos(k), maxSun = opts.maxSundayRow > 0 ? opts.maxSundayRow : 99;
    var W_FALTA = 1000, W_SOBRA = 1, W_NAOCONSEC = 6, W_DOM3 = 800, W_DOMJUSTO = 4, W_RUN = 3000;
    var best = null;
    var restarts = opts.restarts || 6;

    function runOnce(seed) {
      var rnd = mulberry32(seed);
      var st = [];
      for (var i = 0; i < n; i++) st.push({ sunRow: 0, sunTotal: 0, tail: 0 });
      var weeksOut = [];
      var totalCost = 0;

      for (var wk = 0; wk < weeks; wk++) {
        var idx = new Array(n), count = [0, 0, 0, 0, 0, 0, 0];
        var consecIdx = [];
        cands.forEach(function (c, ci) { if (c.consec) consecIdx.push(ci); });
        for (i = 0; i < n; i++) {
          idx[i] = consecIdx[Math.floor(rnd() * consecIdx.length)];
          cands[idx[i]].off.forEach(function (d) { count[d]++; });
        }

        var pessoal = function (e, c) {
          var p = 0;
          if (!c.consec) p += W_NAOCONSEC;
          if (c.off.indexOf(6) < 0) p += (e.sunRow >= maxSun ? W_DOM3 : 0) + W_DOMJUSTO * e.sunTotal;
          var f = k > 0 ? c.off[0] : 7;
          if (e.tail + f > 6) p += W_RUN * (e.tail + f - 6);
          return p;
        };
        var grupoCusto = function () {
          var s = 0;
          for (var d = 0; d < 7; d++) {
            var cov = n - count[d];
            s += cov < need[d] ? W_FALTA * (need[d] - cov) : W_SOBRA * (cov - need[d]);
          }
          return s;
        };

        var order = [];
        for (i = 0; i < n; i++) order.push((i + wk * 3) % n);
        for (var pass = 0; pass < 60; pass++) {
          var changed = false;
          for (var oi = 0; oi < order.length; oi++) {
            var e = order[oi];
            cands[idx[e]].off.forEach(function (d) { count[d]--; });
            var bestC = idx[e], bestV = Infinity;
            for (var ci = 0; ci < cands.length; ci++) {
              cands[ci].off.forEach(function (d) { count[d]++; });
              var v = grupoCusto() + pessoal(st[e], cands[ci]);
              cands[ci].off.forEach(function (d) { count[d]--; });
              if (v < bestV - 1e-9 || (Math.abs(v - bestV) < 1e-9 && ci === idx[e])) { bestV = v; bestC = ci; }
            }
            if (bestC !== idx[e]) changed = true;
            idx[e] = bestC;
            cands[bestC].off.forEach(function (d) { count[d]++; });
          }
          if (!changed) break;
        }

        /* Segunda etapa: trocas entre duas pessoas quando ainda falta cobertura. */
        var falta = 0;
        for (var d0 = 0; d0 < 7; d0++) falta += Math.max(0, need[d0] - (n - count[d0]));
        if (falta > 0 && n <= 80) {
          var improved = true, rounds = 0;
          while (improved && rounds < 6) {
            improved = false; rounds++;
            for (var a = 0; a < n; a++) {
              for (var b = a + 1; b < n; b++) {
                cands[idx[a]].off.forEach(function (d) { count[d]--; });
                cands[idx[b]].off.forEach(function (d) { count[d]--; });
                var cur = null, curV = Infinity;
                for (var ca = 0; ca < cands.length; ca++) {
                  cands[ca].off.forEach(function (d) { count[d]++; });
                  var pa = pessoal(st[a], cands[ca]);
                  for (var cb = 0; cb < cands.length; cb++) {
                    cands[cb].off.forEach(function (d) { count[d]++; });
                    var vv = grupoCusto() + pa + pessoal(st[b], cands[cb]);
                    cands[cb].off.forEach(function (d) { count[d]--; });
                    if (vv < curV - 1e-9) { curV = vv; cur = [ca, cb]; }
                  }
                  cands[ca].off.forEach(function (d) { count[d]--; });
                }
                var before = (function () {
                  cands[idx[a]].off.forEach(function (d) { count[d]++; });
                  cands[idx[b]].off.forEach(function (d) { count[d]++; });
                  var val = grupoCusto() + pessoal(st[a], cands[idx[a]]) + pessoal(st[b], cands[idx[b]]);
                  cands[idx[a]].off.forEach(function (d) { count[d]--; });
                  cands[idx[b]].off.forEach(function (d) { count[d]--; });
                  return val;
                })();
                if (cur && curV < before - 1e-9) { idx[a] = cur[0]; idx[b] = cur[1]; improved = true; }
                cands[idx[a]].off.forEach(function (d) { count[d]++; });
                cands[idx[b]].off.forEach(function (d) { count[d]++; });
              }
            }
          }
        }

        var rows = [];
        for (i = 0; i < n; i++) {
          var offs = cands[idx[i]].off, row = [];
          for (var dd = 0; dd < 7; dd++) row.push(offs.indexOf(dd) >= 0 ? 0 : 1);
          rows.push(row);
          var s2 = st[i];
          if (row[6] === 1) { s2.sunRow++; s2.sunTotal++; } else { s2.sunRow = 0; }
          var last = k > 0 ? offs[offs.length - 1] : -1;
          s2.tail = k > 0 ? 6 - last : s2.tail + 7;
        }
        var cov = [];
        for (var d1 = 0; d1 < 7; d1++) cov.push(n - count[d1]);
        weeksOut.push({ rows: rows, cov: cov });
        totalCost += grupoCusto();
      }
      return { weeks: weeksOut, cost: totalCost };
    }

    for (var r = 0; r < restarts; r++) {
      var res = runOnce((opts.seed || 7) + r * 101);
      if (best === null || res.cost < best.cost) best = res;
      if (best.cost === 0) break;
    }

    /* Métricas e alertas */
    var alerts = [], faltaDias = 0, maxRun = 0, domTrab = [], domFolga = [];
    for (var i2 = 0; i2 < n; i2++) { domTrab.push(0); domFolga.push(0); }
    var seq = [];
    for (i2 = 0; i2 < n; i2++) seq.push([]);
    best.weeks.forEach(function (wkk, wi) {
      for (var d2 = 0; d2 < 7; d2++) {
        if (wkk.cov[d2] < need[d2]) {
          faltaDias += need[d2] - wkk.cov[d2];
          alerts.push({ tipo: 'cobertura', semana: wi + 1, dia: d2, falta: need[d2] - wkk.cov[d2] });
        }
      }
      wkk.rows.forEach(function (row, pi) {
        row.forEach(function (v) { seq[pi].push(v); });
        if (row[6] === 1) domTrab[pi]++; else domFolga[pi]++;
      });
    });
    var violRun = 0, violDom = 0;
    for (i2 = 0; i2 < n; i2++) {
      var run = 0;
      seq[i2].forEach(function (v) {
        if (v === 1) { run++; if (run > maxRun) maxRun = run; if (run === 7) violRun++; } else run = 0;
      });
      var sRow = 0, worst = 0;
      best.weeks.forEach(function (wkk) {
        if (wkk.rows[i2][6] === 1) { sRow++; if (sRow > worst) worst = sRow; } else sRow = 0;
      });
      if (worst > maxSun) violDom++;
    }
    if (violRun > 0) alerts.push({ tipo: 'sequencia', pessoas: violRun, max: maxRun });
    if (violDom > 0) alerts.push({ tipo: 'domingo', pessoas: violDom, nIdeal: Math.ceil(1.5 * need[6] - 1e-9) });
    if (n < nMin(need, w)) alerts.push({ tipo: 'equipe', faltam: nMin(need, w) - n });

    return { weeks: best.weeks, alerts: alerts, faltaPessoasDia: faltaDias, maxSequencia: maxRun,
             domingosTrabalhados: domTrab, domingosFolga: domFolga, need: need, n: n, w: w };
  }

  function fmtBRL(v) {
    return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }

  return { DIAS: DIAS, SEMANAS_MES: SEMANAS_MES, regimes: regimes, needArray: needArray, nMin: nMin,
           shortfall: shortfall, analisarGrupo: analisarGrupo, diagnostico: diagnostico,
           gerarEscala: gerarEscala, fmtBRL: fmtBRL };
})();
if (typeof module !== 'undefined') module.exports = E5;
