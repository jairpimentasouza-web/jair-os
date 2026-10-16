/* Escala 5x2 Inteligente — componente da calculadora (impacto, dados, escala, relatório).
   Funciona sem login (modo demonstração, dados no navegador) e na nuvem (opts.cloud). */
(function () {
  'use strict';
  var JA = window.JA, E5 = window.E5, $ = JA.$, esc = JA.esc, num = JA.num, fmt = JA.brl, DIAS = E5.DIAS;

  var DEFAULT_CFG = { H0: 44, w0: 6, encargos: 0.70, beneficios: 500, adicionalHE: 0.5, reflexosHE: 0.35, capHE: 6, folgasFase1: 1, tol: 0.3, maxSundayRow: 2, domingoRegra: true };

  function exemplo() {
    return {
      empresa: 'Padaria Esquina', setor: 'Padaria e lanchonete', isExample: true,
      cfg: Object.assign({}, DEFAULT_CFG),
      groups: [
        { nome: 'Balcão da manhã', n: 5, salario: 2000, r: [4, 4, 4, 4, 4, 5, 5], names: '' },
        { nome: 'Atendimento da tarde', n: 4, salario: 2000, r: [3, 3, 3, 3, 3, 4, 3], names: '' },
        { nome: 'Produção', n: 3, salario: 2400, r: [2, 2, 2, 2, 2, 3, 0], names: '' }
      ],
      esc: { g: 0, reg: 'final', weeks: 4, pessoas: null, seed: 7 }
    };
  }
  function vazio(nome, setor) {
    return { empresa: nome || '', setor: setor || '', isExample: false, cfg: Object.assign({}, DEFAULT_CFG), groups: [], esc: { g: 0, reg: 'final', weeks: 4, pessoas: null, seed: 7 } };
  }

  var S = null, D = null, ULT = null, TXT = '', host = null, O = {}, tmr = null, curTab = 'impacto';
  var TABS = ['impacto', 'dados', 'escala', 'relatorio'];

  /* ---------- Montagem ---------- */
  function mount(el, opts) {
    el.innerHTML = ''; host = document.createElement('div'); el.appendChild(host);
    O = opts || {}; S = O.state || exemplo();
    if (!S.cfg) S.cfg = Object.assign({}, DEFAULT_CFG);
    S.cfg = Object.assign({}, DEFAULT_CFG, S.cfg);
    if (!S.esc) S.esc = { g: 0, reg: 'final', weeks: 4, pessoas: null, seed: 7 };
    host.innerHTML =
      '<div class="banner" id="banner"><b>PEC do fim da escala 6x1: em tramitação no Senado.</b> Aprovada na Câmara em 27/05/2026 e na CCJ do Senado em 02/09/2026; a votação em plenário está prevista para depois do segundo turno das eleições (25/10). O texto aprovado prevê 42h dois meses após a promulgação e 40h após 14 meses, sem corte de salário. Esses prazos são premissas editáveis: confira a redação final quando for promulgada. ' +
      '<a href="https://tribunadosertao.com.br/financas/2026/10/06/991443-fim-da-escala-6x1-chega-ao-plenario-do-senado" target="_blank" rel="noopener">Fonte (06/10/2026)</a></div>' +
      '<section class="panel stack" id="p-impacto"></section>' +
      '<section class="panel stack" id="p-dados" hidden>' +
        '<div class="card stack"><div class="row" style="justify-content:space-between;align-items:center"><h2>Empresa</h2><span class="example" id="exLabel">Exemplo carregado</span></div>' +
        '<div class="grid2"><label class="f">Nome da empresa<input id="in-empresa" data-path="empresa" data-type="text" maxlength="120"></label>' +
        '<label class="f">Setor<input id="in-setor" data-path="setor" data-type="text" maxlength="80"></label></div>' +
        '<details class="prem"><summary>Premissas de custo e de jornada (editáveis)</summary><div class="grid3" style="margin-top:12px" id="prem"></div>' +
        '<p class="small muted" style="margin-top:10px">Encargos e reflexos variam por regime tributário e convenção coletiva. Os valores iniciais são estimativas de planejamento, não cálculo de folha.</p></details></div>' +
        '<div class="card stack"><h2>Equipes e turnos</h2>' +
        '<p class="muted small">Uma equipe é um grupo que cobre o mesmo posto (por exemplo, balcão da manhã). Informe quantas pessoas precisam estar presentes em cada dia, com a jornada de hoje.</p>' +
        '<div class="stack" id="teams"></div>' +
        '<div class="row"><button class="btn primary" id="addTeam">Adicionar equipe</button><button class="btn" id="resetEx">Carregar exemplo</button></div></div>' +
      '</section>' +
      '<section class="panel stack" id="p-escala" hidden>' +
        '<div class="card stack no-print"><h2>Gerador de escala</h2><div class="grid3">' +
        '<label class="f">Equipe<select id="es-g"></select></label>' +
        '<label class="f">Regime<select id="es-reg"><option value="final">Regime final (40h, 5x2)</option><option value="fase1">Fase 1 (42h)</option><option value="hoje">Hoje</option></select></label>' +
        '<label class="f">Semanas<select id="es-weeks"><option>1</option><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option></select></label>' +
        '<label class="f">Pessoas na escala<input id="es-n" type="number" min="1" max="200" step="1"></label>' +
        '<label class="f" style="justify-content:flex-end"><span class="row" style="gap:8px;align-items:center;flex-wrap:nowrap"><input id="es-dom" type="checkbox" style="width:auto"> Domingo de folga ao menos 1 vez a cada 3 semanas</span></label></div>' +
        '<details><summary>Nomes dos colaboradores (um por linha)</summary><textarea id="es-names" placeholder="Ana&#10;Bruno&#10;Carla"></textarea></details>' +
        '<div class="row"><button class="btn primary" id="es-regen">Gerar outra variação</button><button class="btn" id="es-auto">Usar equipe sugerida</button>' +
        '<button class="btn" id="es-copy">Copiar para planilha</button><button class="btn" id="es-print">Imprimir / PDF</button></div>' +
        '<div class="row" style="border-top:1px solid var(--line);padding-top:12px"><label class="f" style="flex:1 1 260px">Nome para salvar<input id="es-save-name" maxlength="120"></label><button class="btn primary" id="es-save">Salvar esta escala</button></div></div>' +
        '<div id="es-out" class="stack"></div>' +
      '</section>' +
      '<section class="panel stack" id="p-relatorio" hidden></section>';
    bind();
    initForm(); recalc(false);
    show(O.tab || curTab);
  }

  function unmount() { clearTimeout(tmr); if (host) host.innerHTML = ''; host = null; S = null; D = null; }

  function show(name) {
    if (TABS.indexOf(name) < 0) name = 'impacto';
    curTab = name;
    TABS.forEach(function (t) { var p = $('#p-' + t, host); if (p) p.hidden = t !== name; });
  }

  /* ---------- Formulário ---------- */
  var PREM = [
    ['cfg.H0', 'Jornada semanal hoje (h)', 'num'],
    ['cfg.w0', 'Dias trabalhados por semana hoje', 'num'],
    ['cfg.encargos', 'Encargos e provisões sobre o salário (%)', 'pct'],
    ['cfg.beneficios', 'Benefícios por contratado, por mês (R$)', 'num'],
    ['cfg.adicionalHE', 'Adicional de hora extra (%)', 'pct'],
    ['cfg.reflexosHE', 'Reflexos da hora extra em DSR, 13º e férias (%)', 'pct'],
    ['cfg.capHE', 'Limite de hora extra por pessoa, por semana (h)', 'num'],
    ['cfg.tol', 'Tolerância de arredondamento (pessoa fracionada)', 'num']
  ];
  function getPath(path) { return path.split('.').reduce(function (o, k) { return o[k]; }, S); }
  function setPath(path, val) {
    var ks = path.split('.'), o = S;
    for (var i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = val;
  }
  function renderPrem() {
    var h = PREM.map(function (p) {
      var v = getPath(p[0]); if (p[2] === 'pct') v = Math.round(v * 100);
      return '<label class="f">' + p[1] + '<input type="number" step="any" data-path="' + p[0] + '" data-type="' + p[2] + '" value="' + v + '"></label>';
    }).join('');
    h += '<label class="f">Dias de folga na fase de 42h<select data-path="cfg.folgasFase1" data-type="num">' +
      '<option value="1"' + (S.cfg.folgasFase1 === 1 ? ' selected' : '') + '>1 folga (6x1 com 42h)</option>' +
      '<option value="2"' + (S.cfg.folgasFase1 === 2 ? ' selected' : '') + '>2 folgas já na fase de 42h</option></select></label>';
    $('#prem', host).innerHTML = h;
  }
  function renderTeams() {
    $('#teams', host).innerHTML = S.groups.map(function (g, i) {
      var days = DIAS.map(function (d, k) {
        return '<label class="f">' + d + '<input type="number" min="0" max="500" step="1" data-path="groups.' + i + '.r.' + k + '" data-type="num" value="' + g.r[k] + '"></label>';
      }).join('');
      return '<div class="team"><div class="row" style="align-items:flex-end">' +
        '<label class="f" style="flex:2 1 200px">Nome da equipe<input data-path="groups.' + i + '.nome" data-type="text" data-rerender="esc" maxlength="120" value="' + esc(g.nome) + '"></label>' +
        '<label class="f" style="flex:1 1 110px">Pessoas hoje<input type="number" min="0" max="500" step="1" data-path="groups.' + i + '.n" data-type="num" value="' + g.n + '"></label>' +
        '<label class="f" style="flex:1 1 140px">Salário médio (R$/mês)<input type="number" min="0" step="any" data-path="groups.' + i + '.salario" data-type="num" value="' + g.salario + '"></label>' +
        '<button class="btn danger" data-del="' + i + '">Remover</button></div>' +
        '<div><div class="small muted" style="margin-bottom:6px">Pessoas presentes por dia, com a jornada de hoje</div><div class="days">' + days + '</div></div></div>';
    }).join('') || '<p class="muted">Nenhuma equipe. Adicione uma para começar' + (O.cloud ? '.' : ' ou carregue o exemplo.') + '</p>';
    applyReadOnly();
  }
  function applyReadOnly() {
    if (!O.readOnly) return;
    ['#p-dados'].forEach(function (s) {
      JA.$$(s + ' input,' + s + ' select,' + s + ' button', host).forEach(function (el) { el.disabled = true; });
    });
    JA.$$('#p-escala #es-save,#p-escala #es-save-name', host).forEach(function (el) { el.disabled = true; });
  }
  function dirty() {
    S.isExample = false;
    var l = $('#exLabel', host); if (l) l.hidden = true;
  }
  function changed() { dirty(); recalcSoon(true); }

  function bind() {
    host.addEventListener('input', function (ev) {
      var el = ev.target; if (!el.dataset || !el.dataset.path || O.readOnly) return;
      var v;
      if (el.dataset.type === 'text') v = el.value;
      else {
        v = num(el.value, 0);
        if (el.dataset.type === 'pct') v = v / 100;
        if (el.dataset.type === 'num') { if (v < 0) v = 0; if (/\.(n|r\.\d)$/.test(el.dataset.path)) v = Math.min(500, Math.round(v)); }
      }
      if (el.tagName === 'SELECT') v = num(el.value, 1);
      setPath(el.dataset.path, v);
      if (el.dataset.rerender === 'esc') renderEscalaControls();
      changed();
    });
    host.addEventListener('change', function (ev) {
      var el = ev.target;
      if (el.tagName === 'SELECT' && el.dataset && el.dataset.path && !O.readOnly) { setPath(el.dataset.path, num(el.value, 1)); changed(); }
    });
    host.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b || O.readOnly) return;
      if (b.dataset.del != null && b.closest('#teams')) {
        S.groups.splice(+b.dataset.del, 1); S.esc.g = 0; S.esc.pessoas = null;
        renderTeams(); renderEscalaControls(); dirty(); recalc(true);
      }
    });
    $('#addTeam', host).addEventListener('click', function () {
      if (O.readOnly) return;
      if (O.beforeAddTeam && O.beforeAddTeam(S.groups.length) === false) return;
      S.groups.push({ nome: 'Nova equipe', n: 3, salario: 2000, r: [2, 2, 2, 2, 2, 2, 2], names: '' });
      dirty(); renderTeams(); renderEscalaControls(); recalc(true);
    });
    $('#resetEx', host).addEventListener('click', function () {
      if (O.readOnly) return;
      if (O.cloud && S.groups.length && !confirm('Substituir as equipes atuais pelo exemplo?')) return;
      var ex = exemplo(); S.groups = ex.groups; S.cfg = ex.cfg; S.empresa = O.cloud ? S.empresa : ex.empresa; S.setor = O.cloud ? S.setor : ex.setor;
      S.isExample = !O.cloud; S.esc = ex.esc;
      initForm(); recalc(true); JA.toast('Exemplo carregado');
    });

    $('#es-g', host).addEventListener('change', function () { S.esc.g = +this.value; S.esc.pessoas = null; renderEscalaControls(); recalc(!O.readOnly); });
    $('#es-reg', host).addEventListener('change', function () { S.esc.reg = this.value; S.esc.pessoas = null; recalc(!O.readOnly); });
    $('#es-weeks', host).addEventListener('change', function () { S.esc.weeks = +this.value; recalc(!O.readOnly); });
    $('#es-n', host).addEventListener('input', function () { var v = Math.round(num(this.value, 0)); S.esc.pessoas = v > 0 ? Math.min(v, 200) : null; recalcSoon(!O.readOnly); });
    $('#es-dom', host).addEventListener('change', function () { S.cfg.domingoRegra = this.checked; recalc(!O.readOnly); });
    $('#es-names', host).addEventListener('input', function () { var g = S.groups[S.esc.g]; if (g) g.names = this.value; recalcSoon(!O.readOnly); });
    $('#es-regen', host).addEventListener('click', function () { S.esc.seed = (S.esc.seed * 31 + 17) % 100000; recalc(!O.readOnly); JA.toast('Nova variação gerada'); });
    $('#es-auto', host).addEventListener('click', function () { S.esc.pessoas = null; recalc(!O.readOnly); });
    $('#es-print', host).addEventListener('click', function () { window.print(); });
    $('#es-copy', host).addEventListener('click', function () {
      if (!ULT) return;
      var linhas = [], cab = ['Pessoa'];
      ULT.res.weeks.forEach(function (wk, wi) { DIAS.forEach(function (d) { cab.push('S' + (wi + 1) + ' ' + d); }); });
      linhas.push(cab.join('\t'));
      ULT.nm.forEach(function (nome, pi) {
        var l = [nome];
        ULT.res.weeks.forEach(function (wk) { wk.rows[pi].forEach(function (v) { l.push(v ? 'T' : 'F'); }); });
        linhas.push(l.join('\t'));
      });
      JA.copy(linhas.join('\n'), 'Escala copiada. Cole em uma planilha.');
    });
    $('#es-save', host).addEventListener('click', function () {
      if (!ULT) { JA.toast('Adicione uma equipe antes de salvar.'); return; }
      if (!O.cloud) { if (O.onNeedAccount) O.onNeedAccount(); return; }
      var name = ($('#es-save-name', host).value || '').trim();
      if (!name) { JA.toast('Dê um nome para a escala.'); return; }
      var btn = this; btn.disabled = true;
      Promise.resolve(O.onSave && O.onSave(savePayload(name))).then(function () { btn.disabled = false; }, function () { btn.disabled = false; });
    });
  }

  function savePayload(name) {
    return {
      name: name,
      params: { team: ULT.g.nome, regime: S.esc.reg, regimeNome: ULT.reg.nome, weeks: S.esc.weeks, n: ULT.n, seed: S.esc.seed, domingoRegra: !!S.cfg.domingoRegra, names: ULT.nm },
      result: { need: ULT.need, w: ULT.reg.w, H: ULT.reg.H, weeks: ULT.res.weeks.map(function (w) { return { rows: w.rows, cov: w.cov }; }), alerts: ULT.res.alerts, nMin: E5.nMin(ULT.need, ULT.reg.w) }
    };
  }

  /* ---------- Impacto ---------- */
  function frasePorEquipe(a) {
    var r = a.recomendado, partes = [];
    if (r.contratar > 0) partes.push('contratar ' + r.contratar + (r.contratar > 1 ? ' pessoas' : ' pessoa'));
    if (r.horasSemana > 0.01) partes.push('cobrir ' + Math.round(r.horasSemana * 10) / 10 + 'h por semana com horas extras');
    return partes.length ? partes.join(' e ') : 'nenhuma ação';
  }
  function kpi(a, b) { return '<div class="kpi"><span class="muted">' + a + '</span><b>' + b + '</b></div>'; }

  function renderImpacto() {
    var f = D.fases.final, h = D.fases.hoje, f1 = D.fases.fase1, el = $('#p-impacto', host);
    if (!S.groups.length) {
      el.innerHTML = '<div class="card stack"><h2>Comece pelas suas equipes</h2><p class="muted">Cadastre as equipes e quantas pessoas precisam estar presentes em cada dia, em “Dados da empresa”. O impacto da redução de jornada aparece aqui na hora.</p><div class="row"><button class="btn primary" data-goto="dados">Cadastrar equipes</button></div></div>';
      return;
    }
    var leitura;
    if (f.deficit === 0) {
      leitura = 'Sua equipe atual comporta o regime de 40h/5x2 sem novas contratações: são ' + f.pessoasNecessarias + ' pessoas necessárias para ' + f.pessoasAtual + ' disponíveis.';
    } else {
      var acoes = f.grupos.filter(function (a) { return a.deficit > 0; }).map(function (a) { return a.nome + ': ' + frasePorEquipe(a); });
      leitura = 'Para manter a mesma operação em 40h/5x2 você precisa de ' + f.pessoasNecessarias + ' pessoas e tem ' + f.pessoasAtual + ' (faltam ' + f.deficit + '). O caminho mais barato é ' + acoes.join('; ') + '. Custo estimado de ' + fmt(f.recomendado) + ' por mês' +
        (f.contratarTudo > f.recomendado + 1 ? ', contra ' + fmt(f.contratarTudo) + ' se a escolha fosse só contratar.' : '.');
    }
    var topo = '<div class="card hero"><div class="stack" style="gap:8px"><span class="eyebrow">Impacto no regime final (40h, 5x2)</span>' +
      '<div class="big">' + fmt(f.recomendado) + ' <small>por mês</small></div><p>' + esc(leitura) + '</p>' +
      (S.isExample ? '<span class="example">Exemplo: edite em “Dados da empresa”</span>' : '') +
      '</div><div class="kpis">' +
      kpi('Impacto anual', fmt(D.anual)) + kpi('Pessoas hoje / necessárias', f.pessoasAtual + ' / ' + f.pessoasNecessarias) +
      kpi('Contratações sugeridas', String(f.contratacoesRecomendadas)) + kpi('Horas extras sugeridas', Math.round(f.horasExtraSemana * 10) / 10 + ' h/semana') +
      kpi('Custo de cada hora trabalhada', '+' + (Math.round(D.custoHoraAumentoPct * 10) / 10) + '%') + '</div></div>';

    var fases = '<div class="card stack"><h2>Do hoje ao regime final</h2><div class="phases">' +
      [['Hoje', 'Jornada atual', h, 'cur'], ['Fase 1', '42h a partir de 2 meses após a promulgação', f1, ''], ['Regime final', '40h a partir de 14 meses após a promulgação', f, '']]
        .map(function (p) {
          var t = p[2], st = t.deficit === 0 ? '<span class="pill good">Equipe comporta</span>' : '<span class="pill warn">Faltam ' + t.deficit + '</span>';
          return '<div class="phase ' + p[3] + '"><div class="row" style="justify-content:space-between;align-items:center"><h3>' + p[0] + '</h3>' + st + '</div>' +
            '<div class="small muted">' + p[1] + '</div><div class="num"><b>' + t.pessoasNecessarias + '</b> necessárias · <b>' + t.pessoasAtual + '</b> hoje</div>' +
            '<div class="num">' + (t.recomendado > 0 ? '<b>' + fmt(t.recomendado) + '</b> por mês' : 'Sem custo adicional') + '</div></div>';
        }).join('') + '</div></div>';

    var maxC = Math.max(f.contratarTudo, f.soHE, f.recomendado, 1);
    function barra(nome, val, cls, extra) {
      return '<div class="bar ' + cls + '"><div>' + nome + (extra || '') + '</div><div class="track"><div class="fill" style="width:' + Math.max(2, Math.round(val / maxC * 100)) + '%"></div></div><div class="num" style="text-align:right"><b>' + fmt(val) + '</b></div></div>';
    }
    var cen = '<div class="card stack"><h2>Quanto custa cada caminho</h2>' +
      (f.deficit === 0 ? '<p class="muted">Sem déficit de equipe, não há custo a comparar.</p>' :
        '<div class="bars">' + barra('Só contratar', f.contratarTudo, '') +
        barra('Só horas extras', f.soHE, f.heInviavel ? 'inv' : '', f.heInviavel ? ' <span class="pill bad">passa do limite</span>' : '') +
        barra('Mix recomendado', f.recomendado, 'rec', ' <span class="pill good">menor custo viável</span>') +
        '</div><p class="small muted">Valores mensais. Horas extras com adicional de ' + Math.round(S.cfg.adicionalHE * 100) + '% e reflexos de ' + Math.round(S.cfg.reflexosHE * 100) + '%; contratação com encargos de ' + Math.round(S.cfg.encargos * 100) + '% mais benefícios. “Passa do limite” indica que as horas extras necessárias superam ' + S.cfg.capHE + 'h por pessoa por semana.</p>') + '</div>';

    var linhas = f.grupos.map(function (a) {
      var r = a.recomendado;
      return '<tr><td>' + esc(a.nome) + '</td><td class="r">' + a.n + '</td><td class="r">' + a.nMin + '</td><td class="r">' +
        (a.deficit > 0 ? '<span class="cov-bad">' + a.deficit + '</span>' : '<span class="cov-ok">0</span>') + '</td><td>' + esc(frasePorEquipe(a)) +
        '</td><td class="r">' + fmt(r.custoMensal) + '</td><td class="mono">' + a.need.join(' ') + '</td></tr>';
    }).join('');
    var tab = '<div class="card stack"><h2>Por equipe, no regime final</h2><div class="tablewrap"><table><thead><tr><th>Equipe</th><th class="r">Hoje</th><th class="r">Necessárias</th><th class="r">Déficit</th><th>Ação sugerida</th><th class="r">Custo/mês</th><th>Pessoas por dia (Seg a Dom)</th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
      '<p class="small muted">As pessoas por dia no regime final já consideram que cada pessoa entrega 8h por dia trabalhado, em vez das ' + (Math.round(S.cfg.H0 / S.cfg.w0 * 100) / 100) + 'h de hoje.</p></div>';
    el.innerHTML = topo + fases + cen + tab;
  }

  /* ---------- Escala ---------- */
  function renderEscalaControls() {
    var sel = $('#es-g', host);
    sel.innerHTML = S.groups.map(function (g, i) { return '<option value="' + i + '"' + (i === S.esc.g ? ' selected' : '') + '>' + esc(g.nome) + '</option>'; }).join('');
    $('#es-reg', host).value = S.esc.reg;
    $('#es-weeks', host).value = String(S.esc.weeks);
    $('#es-dom', host).checked = !!S.cfg.domingoRegra;
    var g = S.groups[S.esc.g];
    $('#es-names', host).value = g ? g.names || '' : '';
  }
  function equipeSugerida(gi, reg) {
    var g = S.groups[gi]; if (!g) return 1;
    var a = E5.analisarGrupo(g, S.cfg, E5.regimes(S.cfg)[reg]);
    return Math.max(1, g.n + a.recomendado.contratar);
  }
  function nomes(g, n) {
    var l = (g.names || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean), out = [];
    for (var i = 0; i < n; i++) out.push(l[i] || 'Colaborador ' + (i + 1));
    return out;
  }

  /* HTML da escala (alertas + semanas). Reaproveitado para escalas salvas. */
  function scheduleHTML(res, nm, need, reg, n, nMinVal) {
    var html = '', alerts = [];
    var cobAl = res.alerts.filter(function (a) { return a.tipo === 'cobertura'; });
    if (cobAl.length) {
      var tot = cobAl.reduce(function (s, a) { return s + a.falta; }, 0);
      alerts.push('<div class="alert bad"><b>Cobertura incompleta:</b> faltam ' + tot + ' posições-dia em ' + cobAl.length + ' dias da escala. Com ' + n + ' pessoas não fecha; a equipe mínima neste regime é ' + nMinVal + '.</div>');
    }
    res.alerts.forEach(function (a) {
      if (a.tipo === 'sequencia') alerts.push('<div class="alert bad"><b>Mais de 6 dias seguidos:</b> ' + a.pessoas + ' pessoa(s) ficariam 7 dias ou mais sem folga.</div>');
      if (a.tipo === 'domingo') alerts.push('<div class="alert warn"><b>Domingos:</b> ' + a.pessoas + ' pessoa(s) trabalham mais de 2 domingos seguidos. Para dar folga de domingo a cada 3 semanas seriam necessárias cerca de ' + a.nIdeal + ' pessoas nesta equipe. Verifique a convenção coletiva do seu setor.</div>');
    });
    if (!alerts.length) alerts.push('<div class="alert good"><b>Escala válida:</b> cobertura completa em todas as semanas, nenhuma pessoa com mais de 6 dias seguidos, ' + reg.H + 'h semanais por pessoa.</div>');
    html += '<div class="card alerts no-print">' + alerts.join('') + '</div>';
    res.weeks.forEach(function (wk, wi) {
      var head = '<tr><th>Semana ' + (wi + 1) + '</th>' + DIAS.map(function (d, k) { return '<th class="' + (k === 6 ? 'dom' : '') + '">' + d + '</th>'; }).join('') + '<th class="r">Dias</th></tr>';
      var rows = wk.rows.map(function (r, pi) {
        return '<tr><td class="name">' + esc(nm[pi]) + '</td>' + r.map(function (v, k) {
          return '<td class="' + (k === 6 ? 'dom' : '') + '"><span class="cell ' + (v ? 't' : 'f') + '">' + (v ? 'T' : 'F') + '</span></td>';
        }).join('') + '<td class="r">' + reg.w + '</td></tr>';
      }).join('');
      var cov = '<tr><td class="name"><b>Presentes / necessários</b></td>' + wk.cov.map(function (c, k) {
        var cls = c < need[k] ? 'cov-bad' : (c > need[k] ? 'cov-up' : 'cov-ok');
        return '<td class="' + (k === 6 ? 'dom' : '') + '"><span class="' + cls + '">' + c + '/' + need[k] + '</span></td>';
      }).join('') + '<td></td></tr>';
      html += '<div class="card stack"><div class="tablewrap"><table class="grid"><thead>' + head + '</thead><tbody>' + rows + cov + '</tbody></table></div></div>';
    });
    html += '<p class="small muted">T = trabalha, F = folga. Cada pessoa trabalha ' + reg.w + ' dias por semana, com folgas seguidas sempre que a cobertura permite, e o rodízio distribui os domingos. Amarelo indica sobra de pessoas no dia.</p>';
    return html;
  }

  function renderEscala() {
    var out = $('#es-out', host), gi = S.esc.g, g = S.groups[gi];
    if (!g) { out.innerHTML = '<div class="card"><p class="muted">Adicione uma equipe para gerar a escala.</p></div>'; ULT = null; return; }
    var reg = E5.regimes(S.cfg)[S.esc.reg];
    var need = E5.needArray(g.r, S.cfg, reg);
    var n = S.esc.pessoas || equipeSugerida(gi, S.esc.reg);
    $('#es-n', host).value = n;
    var res = E5.gerarEscala({ need: need, n: n, w: reg.w, weeks: S.esc.weeks, maxSundayRow: S.cfg.domingoRegra ? 2 : 0, seed: S.esc.seed });
    var nm = nomes(g, n);
    ULT = { res: res, nm: nm, g: g, reg: reg, need: need, n: n };
    var sv = $('#es-save-name', host);
    if (sv && !sv.dataset.touched) sv.value = g.nome + ' · ' + reg.nome + ' · ' + new Date().toLocaleDateString('pt-BR');
    out.innerHTML = '<div class="print-only"><h2>' + esc(S.empresa || 'Empresa') + ' — escala de ' + esc(g.nome) + '</h2><p>' + esc(reg.nome) + ' · ' + n + ' pessoas · gerada em ' + new Date().toLocaleDateString('pt-BR') + '</p></div>' +
      scheduleHTML(res, nm, need, reg, n, E5.nMin(need, reg.w));
  }

  /* ---------- Relatório ---------- */
  function gerarTexto() {
    var f = D.fases.final, h = D.fases.hoje, f1 = D.fases.fase1, L = [];
    var dt = new Date().toLocaleDateString('pt-BR');
    L.push('DIAGNÓSTICO 5x2 · ' + (S.empresa || 'Empresa'));
    L.push('Setor: ' + (S.setor || '-') + ' · Data: ' + dt + (S.isExample ? ' · DADOS DE EXEMPLO' : ''));
    L.push('');
    L.push('1. RESUMO');
    if (f.deficit === 0) L.push('A equipe atual (' + f.pessoasAtual + ' pessoas) comporta o regime de 40h/5x2 sem novas contratações.');
    else {
      L.push('Hoje: ' + h.pessoasAtual + ' pessoas. Necessárias em 40h/5x2: ' + f.pessoasNecessarias + '. Déficit: ' + f.deficit + '.');
      L.push('Impacto mensal estimado: ' + fmt(f.recomendado) + ' (' + fmt(D.anual) + ' por ano).');
      L.push('Cada hora trabalhada passa a custar cerca de ' + (Math.round(D.custoHoraAumentoPct * 10) / 10) + '% a mais, porque o salário se mantém e a jornada cai.');
    }
    L.push('');
    L.push('2. CAMINHO RECOMENDADO POR EQUIPE');
    f.grupos.forEach(function (a) {
      L.push('- ' + a.nome + ': ' + a.n + ' hoje, ' + a.nMin + ' necessárias. ' + (a.deficit > 0 ? 'Ação: ' + frasePorEquipe(a) + ' (' + fmt(a.recomendado.custoMensal) + '/mês).' : 'Sem ação necessária.'));
    });
    L.push('');
    L.push('3. COMPARAÇÃO DE CAMINHOS (por mês)');
    L.push('- Só contratar: ' + fmt(f.contratarTudo));
    L.push('- Só horas extras: ' + fmt(f.soHE) + (f.heInviavel ? ' (passa do limite de ' + S.cfg.capHE + 'h/pessoa/semana)' : ''));
    L.push('- Mix recomendado: ' + fmt(f.recomendado));
    L.push('');
    L.push('4. LINHA DO TEMPO (texto aprovado na Câmara, PEC em tramitação no Senado)');
    L.push('- Hoje: ' + h.pessoasNecessarias + ' necessárias / ' + h.pessoasAtual + ' disponíveis.');
    L.push('- Fase 1 (42h, 2 meses após a promulgação): ' + f1.pessoasNecessarias + ' necessárias; custo ' + fmt(f1.recomendado) + '/mês.');
    L.push('- Regime final (40h, 14 meses após a promulgação): ' + f.pessoasNecessarias + ' necessárias; custo ' + fmt(f.recomendado) + '/mês.');
    L.push('');
    L.push('5. PREMISSAS');
    L.push('Encargos ' + Math.round(S.cfg.encargos * 100) + '% · benefícios ' + fmt(S.cfg.beneficios) + ' por contratado · hora extra +' + Math.round(S.cfg.adicionalHE * 100) + '% com reflexos de ' + Math.round(S.cfg.reflexosHE * 100) + '% · limite de ' + S.cfg.capHE + 'h extras por pessoa/semana.');
    L.push('');
    L.push('Aviso: estimativa de planejamento operacional. Não substitui assessoria jurídica, contábil ou trabalhista, nem a convenção coletiva da categoria.');
    return L.join('\n');
  }
  function renderRelatorio() {
    TXT = D && S.groups.length ? gerarTexto() : '';
    var f = D.fases.final;
    var msg = 'Olá, Jair! Usei o Escala 5x2 Inteligente para a ' + (S.empresa || 'minha empresa') + ' e o impacto estimado foi de ' + fmt(f.recomendado) + ' por mês. Quero o Diagnóstico 5x2 Express completo.';
    var link = JA.contactLink(msg);
    $('#p-relatorio', host).innerHTML =
      '<div class="card stack"><div class="row no-print" style="justify-content:space-between;align-items:center"><h2>Relatório do diagnóstico</h2><div class="row"><button class="btn" id="rp-print">Imprimir / PDF</button><button class="btn primary" id="rp-copy">Copiar relatório</button></div></div>' +
      '<pre class="report" id="rp-txt">' + esc(TXT || 'Adicione uma equipe para gerar o relatório.') + '</pre></div>' +
      '<div class="cta no-print"><h3>Quer o diagnóstico completo e a escala validada?</h3>' +
      '<p>O Diagnóstico 5x2 Express entrega o relatório com as regras da sua convenção coletiva, a escala de 4 semanas pronta para publicar e o plano de contratação ou horas extras, em até 2 dias úteis.</p>' +
      '<div class="row">' + (link ? '<a class="btn primary" id="rp-link" href="' + esc(link) + '" target="_blank" rel="noopener">Falar com o Jair</a>' : '') +
      '<button class="btn" id="rp-msg">Copiar mensagem</button></div><p class="small muted">' + esc(msg) + '</p></div>';
    $('#rp-copy', host).addEventListener('click', function () { JA.copy(TXT, 'Relatório copiado'); });
    $('#rp-print', host).addEventListener('click', function () { window.print(); });
    $('#rp-msg', host).addEventListener('click', function () { JA.copy(msg, 'Mensagem copiada'); });
  }

  /* ---------- Orquestração ---------- */
  function recalc(notify) {
    if (!host) return;
    D = E5.diagnostico(S);
    renderImpacto(); renderEscala(); renderRelatorio();
    if (!O.cloud && O.persistKey) { try { localStorage.setItem(O.persistKey, JSON.stringify(S)); } catch (e) {} }
    if (notify && !O.readOnly && O.onChange) O.onChange(S);
  }
  function recalcSoon(notify) { clearTimeout(tmr); tmr = setTimeout(function () { recalc(notify); }, 140); }
  function initForm() {
    $('#in-empresa', host).value = S.empresa || ''; $('#in-setor', host).value = S.setor || '';
    $('#exLabel', host).hidden = !S.isExample;
    renderPrem(); renderTeams(); renderEscalaControls();
  }
  /* "Cadastrar equipes" no estado vazio */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('button[data-goto]');
    if (b && host && host.contains(b)) { if (O.onGoto) O.onGoto(b.dataset.goto); else show(b.dataset.goto); }
  });
  document.addEventListener('input', function (ev) { if (ev.target && ev.target.id === 'es-save-name') ev.target.dataset.touched = '1'; });

  function summary() {
    if (!S) return null;
    var d = E5.diagnostico(S), f = d.fases.final;
    return { empresa: S.empresa, mensal: f.recomendado, anual: d.anual, necessarias: f.pessoasNecessarias, atual: f.pessoasAtual, deficit: f.deficit,
      contratacoes: f.contratacoesRecomendadas, he: Math.round(f.horasExtraSemana * 10) / 10, somenteContratar: f.contratarTudo, somenteHE: f.soHE, equipes: S.groups.length };
  }

  JA.Calc = { mount: mount, unmount: unmount, show: show, state: function () { return S; }, summary: summary, exemplo: exemplo, vazio: vazio,
    scheduleHTML: scheduleHTML, DEFAULT_CFG: DEFAULT_CFG, refresh: function () { if (host) { initForm(); recalc(false); } } };
})();
