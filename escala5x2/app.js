/* Escala 5x2 Inteligente — painel do cliente (empresas, equipes, escalas salvas, usuários, plano, conta). */
(function () {
  'use strict';
  var JA = window.JA, A = JA.A, V = JA.views, $ = JA.$, $$ = JA.$$, esc = JA.esc, brl = JA.brl;

  var CALC_TABS = ['impacto', 'dados', 'escala', 'relatorio'];
  var TAB_LABELS = [['impacto', 'Impacto'], ['dados', 'Dados da empresa'], ['escala', 'Escala'], ['relatorio', 'Relatório'], ['salvos', 'Salvos'], ['equipe', 'Equipe'], ['plano', 'Plano'], ['conta', 'Conta']];
  var ROLE = { owner: 'Proprietário', admin: 'Administrador', editor: 'Editor', viewer: 'Leitura' };

  var sync = { timer: null, inflight: false, again: false, S: null, state: 'saved', err: null, teamIds: [] };

  /* ---------- Carga de dados ---------- */
  JA.refreshOverview = function () {
    return JA.rpc('e5_my_overview').then(function (o) {
      A.overview = o;
      var ids = o.workspaces.map(function (w) { return w.id; });
      var saved = null; try { saved = localStorage.getItem('e5.ws'); } catch (e) {}
      if (!A.wsId || ids.indexOf(A.wsId) < 0) A.wsId = ids.indexOf(saved) >= 0 ? saved : (ids[0] || null);
      return o;
    });
  };
  JA.loadCompanies = function () {
    if (!A.wsId) { A.companies = []; A.companyId = null; return Promise.resolve([]); }
    return JA.q(A.sb.from('e5_companies').select('id,name,sector,updated_at').eq('workspace_id', A.wsId).order('created_at')).then(function (rows) {
      A.companies = rows || [];
      var ids = A.companies.map(function (c) { return c.id; });
      var saved = null; try { saved = localStorage.getItem('e5.co.' + A.wsId); } catch (e) {}
      if (!A.companyId || ids.indexOf(A.companyId) < 0) A.companyId = ids.indexOf(saved) >= 0 ? saved : (ids[0] || null);
      return A.companies;
    });
  };
  JA.refreshAll = function () { return JA.refreshOverview().then(JA.loadCompanies); };

  /* ---------- Sincronização com o banco ---------- */
  function setSync(state, err) {
    sync.state = state; sync.err = err || null;
    var el = $('#sync'); if (!el) return;
    var map = { saved: ['Salvo na nuvem', 'ok'], saving: ['Salvando...', 'wait'], dirty: ['Alterações pendentes...', 'wait'], error: ['Não foi possível salvar', 'bad'] };
    el.className = 'syncstat ' + map[state][1];
    el.innerHTML = esc(map[state][0]) + (state === 'error' ? ' <button class="linkbtn" id="sync-retry">Tentar de novo</button>' : '');
    var r = $('#sync-retry'); if (r) r.addEventListener('click', function () { flush(); });
    var warn = $('#syncwarn');
    if (warn) {
      if (state === 'error') {
        warn.hidden = false;
        warn.innerHTML = '<b>Algumas alterações não foram salvas.</b> ' + esc(JA.errMsg(err)) + (JA.isLimit(err) ? ' <a href="#/app/plano">Ver planos</a>' : '');
      } else warn.hidden = true;
    }
  }
  function scheduleSync(S) {
    sync.S = S; setSync('dirty');
    clearTimeout(sync.timer); sync.timer = setTimeout(flush, 900);
  }
  function flush() {
    clearTimeout(sync.timer);
    if (!sync.S || !A.companyId) return Promise.resolve();
    if (sync.inflight) { sync.again = true; return Promise.resolve(); }
    sync.inflight = true; setSync('saving');
    var S = sync.S;
    return pushCompany(S, A.companyId).then(function () {
      if (!sync.again) setSync('saved');
      JA.refreshOverview().then(updateHeader, function () {});
    }).catch(function (e) {
      setSync('error', e); if (JA.isLimit(e)) JA.toast(JA.errMsg(e), 'bad');
    }).then(function () {
      sync.inflight = false;
      if (sync.again) { sync.again = false; return flush(); }
    });
  }
  JA.flushSync = flush;
  window.addEventListener('beforeunload', function (ev) {
    if (sync.state === 'dirty' || sync.state === 'saving' || sync.state === 'error') { ev.preventDefault(); ev.returnValue = ''; }
  });

  function clampSalary(v) { v = +v || 0; return Math.max(0, Math.min(9999999, Math.round(v * 100) / 100)); }
  function pushCompany(S, companyId) {
    var keep = S.groups.filter(function (g) { return g.id; }).map(function (g) { return g.id; });
    var removed = sync.teamIds.filter(function (id) { return keep.indexOf(id) < 0; });
    var chain = Promise.resolve();
    removed.forEach(function (id) {
      chain = chain.then(function () { return JA.q(A.sb.from('e5_teams').delete().eq('id', id)); }).then(function () { sync.teamIds = sync.teamIds.filter(function (x) { return x !== id; }); });
    });
    S.groups.forEach(function (g, i) {
      var row = { name: (g.nome || '').trim() || 'Equipe', people: Math.max(0, Math.min(500, Math.round(g.n) || 0)), salary: clampSalary(g.salario),
        demand: g.r.map(function (x) { return Math.max(0, Math.min(500, Math.round(x) || 0)); }), sort: i };
      if (g.id) chain = chain.then(function () { return JA.q(A.sb.from('e5_teams').update(row).eq('id', g.id)); });
      else chain = chain.then(function () {
        row.company_id = companyId;
        return JA.q(A.sb.from('e5_teams').insert(row).select('id').single()).then(function (d) { g.id = d.id; sync.teamIds.push(d.id); });
      });
    });
    return chain.then(function () {
      var names = {}; S.groups.forEach(function (g) { if (g.id && g.names) names[g.id] = g.names; });
      var cfg = JSON.parse(JSON.stringify(S.cfg)); cfg.extra = { esc: S.esc, names: names };
      return JA.q(A.sb.from('e5_companies').update({ name: (S.empresa || '').trim() || 'Empresa', sector: (S.setor || '').trim() || null, cfg: cfg }).eq('id', companyId));
    });
  }

  function buildState(co, teams) {
    var cfg = Object.assign({}, JA.Calc.DEFAULT_CFG, co.cfg || {}), extra = cfg.extra || {}; delete cfg.extra;
    return {
      empresa: co.name, setor: co.sector || '', isExample: false, cfg: cfg,
      groups: (teams || []).map(function (t) {
        return { id: t.id, nome: t.name, n: t.people, salario: +t.salary, r: (t.demand || [1, 1, 1, 1, 1, 1, 1]).slice(), names: (extra.names || {})[t.id] || '' };
      }),
      esc: extra.esc || { g: 0, reg: 'final', weeks: 4, pessoas: null, seed: 7 }
    };
  }

  function loadCalc() {
    var host = $('#calcHost');
    if (!A.companyId) {
      host.innerHTML = '<div class="card stack"><h2>Nenhuma empresa cadastrada</h2><p class="muted">Crie a primeira empresa para começar.</p><div><button class="btn primary" id="new-co-2">Criar empresa</button></div></div>';
      $('#new-co-2').addEventListener('click', newCompany); return Promise.resolve();
    }
    host.innerHTML = '<p class="muted">Carregando...</p>';
    var id = A.companyId;
    return Promise.all([
      JA.q(A.sb.from('e5_companies').select('*').eq('id', id).single()),
      JA.q(A.sb.from('e5_teams').select('*').eq('company_id', id).order('sort').order('created_at'))
    ]).then(function (r) {
      if (id !== A.companyId) return;
      var st = buildState(r[0], r[1]);
      sync.teamIds = st.groups.map(function (g) { return g.id; }); sync.S = null; setSync('saved');
      JA.Calc.mount(host, {
        state: st, cloud: true, readOnly: !JA.canEdit(), tab: A.tab,
        onChange: scheduleSync,
        beforeAddTeam: function () {
          var w = JA.ws(), pending = JA.Calc.state().groups.filter(function (g) { return !g.id; }).length;
          if (w && w.usage.teams + pending >= w.limits.teams) { JA.toast('Seu plano permite ' + w.limits.teams + ' equipe(s). Veja os planos para ampliar.', 'bad'); return false; }
          return true;
        },
        onSave: saveSchedule,
        onGoto: function (t) { JA.go('app/' + t); }
      });
      applyTab();
    }).catch(function (e) { host.innerHTML = '<div class="alert bad">Não foi possível carregar a empresa. ' + esc(JA.errMsg(e)) + ' <button class="btn" id="retry-load">Tentar de novo</button></div>'; $('#retry-load').addEventListener('click', loadCalc); });
  }

  function saveSchedule(p) {
    return JA.q(A.sb.from('e5_schedules').insert({ company_id: A.companyId, name: p.name.slice(0, 120), params: p.params, result: p.result }).select('id').single()).then(function () {
      JA.toast('Escala salva em “Salvos”.'); JA.refreshOverview().then(updateHeader, function () {});
    }).catch(function (e) { JA.toast(JA.errMsg(e), 'bad'); throw e; });
  }

  /* ---------- Cabeçalho do painel ---------- */
  function trialInfo(w) {
    var now = Date.now(), out = '';
    if (w.paid_plan && (!w.paid_until || new Date(w.paid_until) > now)) return '';
    if (w.trial_ends_at && new Date(w.trial_ends_at) > now) {
      var d = Math.ceil((new Date(w.trial_ends_at) - now) / 86400000);
      out = '<div class="banner info no-print">Teste grátis do plano <b>Gestor</b> até <b>' + JA.dt(w.trial_ends_at) + '</b> (' + d + (d === 1 ? ' dia' : ' dias') + '). <a href="#/app/plano">Ver planos</a></div>';
    } else if (w.trial_ends_at) {
      var over = w.usage.people > w.limits.people || w.usage.teams > w.limits.teams || w.usage.companies > w.limits.companies;
      out = '<div class="banner no-print">Seu teste terminou e a conta está no plano <b>' + esc(w.limits.name) + '</b>.' + (over ? ' Seu uso passa dos limites deste plano: você continua vendo tudo, mas não pode adicionar mais.' : '') + ' <a href="#/app/plano">Ver planos</a></div>';
    }
    return out;
  }
  function updateHeader() {
    var w = JA.ws(); if (!w) return;
    var pill = $('#planpill'); if (pill) pill.innerHTML = 'Plano ' + esc(w.limits.name);
    var tb = $('#trialbox'); if (tb) tb.innerHTML = trialInfo(w);
  }
  function appHeader() {
    var o = A.overview, w = JA.ws();
    var wsSel = o.workspaces.length > 1 ? '<label class="f inline">Conta<select id="sel-ws">' + o.workspaces.map(function (x) { return '<option value="' + x.id + '"' + (x.id === w.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></label>' : '';
    var coSel = '<label class="f inline">Empresa<select id="sel-co">' + A.companies.map(function (c) { return '<option value="' + c.id + '"' + (c.id === A.companyId ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label>';
    return '<div class="appbar no-print"><div class="row" style="align-items:flex-end">' + wsSel + coSel +
      (JA.canEdit() ? '<button class="btn sm" id="new-co">+ Empresa</button>' : '') + '</div>' +
      '<div class="row" style="align-items:center"><span class="pill good" id="planpill"></span><span class="syncstat ok" id="sync">Salvo na nuvem</span></div></div>' +
      '<div id="trialbox"></div><div class="alert bad" id="syncwarn" hidden></div>';
  }

  function newCompany() {
    JA.modal({ title: 'Nova empresa', intro: 'Cada empresa tem as próprias equipes, premissas e escalas.', ok: 'Criar empresa',
      fields: [{ name: 'name', label: 'Nome da empresa', required: true }, { name: 'sector', label: 'Setor (opcional)', max: 80 }],
      onSubmit: function (v) {
        if (v.name.length < 1) throw new Error('INVALID_NAME');
        return flush().then(function () {
          return JA.q(A.sb.from('e5_companies').insert({ workspace_id: A.wsId, name: v.name, sector: v.sector || null }).select('id').single());
        }).then(function (d) {
          A.companyId = d.id; try { localStorage.setItem('e5.co.' + A.wsId, d.id); } catch (e) {}
          return JA.refreshAll();
        }).then(function () { A.shellKey = null; JA.go('app/dados'); JA.render(); });
      } });
  }

  /* ---------- Painel ---------- */
  V.app = function (tab) {
    if (!A.overview || !A.overview.workspaces.length) return V.onboarding();
    if (TAB_LABELS.map(function (t) { return t[0]; }).indexOf(tab) < 0) tab = 'impacto';
    A.tab = tab;
    var key = A.wsId + '|' + A.companyId;
    if (!$('#appShell') || A.shellKey !== key) {
      A.shellKey = key;
      $('#view').innerHTML = '<div class="wrap app" id="appShell">' + appHeader() +
        '<nav class="tabs no-print" role="tablist" aria-label="Seções">' + TAB_LABELS.map(function (t) {
          return '<a role="tab" id="tb-' + t[0] + '" href="#/app/' + t[0] + '">' + t[1] + '</a>'; }).join('') + '</nav>' +
        '<div id="calcHost"></div><div id="otherHost" class="stack" hidden></div></div>';
      updateHeader(); bindHeader();
      loadCalc();
    } else applyTab();
  };
  function applyTab() {
    var tab = A.tab, isCalc = CALC_TABS.indexOf(tab) >= 0;
    TAB_LABELS.forEach(function (t) { var b = $('#tb-' + t[0]); if (b) b.setAttribute('aria-selected', t[0] === tab ? 'true' : 'false'); });
    $('#calcHost').hidden = !isCalc; $('#otherHost').hidden = isCalc;
    if (isCalc) JA.Calc.show(tab);
    else { var el = $('#otherHost'); el.innerHTML = '<p class="muted">Carregando...</p>'; ({ salvos: renderSaved, equipe: renderTeam, plano: renderPlan, conta: renderAccount })[tab](el); }
    window.scrollTo(0, 0);
  }
  function bindHeader() {
    var s = $('#sel-ws'); if (s) s.addEventListener('change', function () {
      flush().then(function () { A.wsId = s.value; A.companyId = null; try { localStorage.setItem('e5.ws', A.wsId); } catch (e) {} return JA.loadCompanies(); }).then(function () { A.shellKey = null; JA.render(); });
    });
    var c = $('#sel-co'); if (c) c.addEventListener('change', function () {
      flush().then(function () { A.companyId = c.value; try { localStorage.setItem('e5.co.' + A.wsId, A.companyId); } catch (e) {} A.shellKey = null; JA.render(); });
    });
    var n = $('#new-co'); if (n) n.addEventListener('click', newCompany);
  }
  JA.leaveApp = function () { return flush(); };

  /* ---------- Salvos: escalas e cenários ---------- */
  function renderSaved(el) {
    Promise.all([
      JA.q(A.sb.from('e5_schedules').select('id,name,params,created_at,company_id').eq('workspace_id', A.wsId).order('created_at', { ascending: false })),
      JA.q(A.sb.from('e5_scenarios').select('id,name,data,created_at,company_id').eq('workspace_id', A.wsId).order('created_at', { ascending: false }))
    ]).then(function (r) {
      var sc = r[0] || [], cn = r[1] || [], cname = {}; A.companies.forEach(function (c) { cname[c.id] = c.name; });
      var w = JA.ws(), edit = JA.canEdit();
      var rowsS = sc.map(function (s) {
        var p = s.params || {};
        return '<tr><td>' + esc(s.name) + '</td><td>' + esc(cname[s.company_id] || '') + '</td><td>' + esc(p.team || '') + '</td><td>' + esc(p.regimeNome || '') + '</td><td class="r">' + (p.n || '') + '</td><td>' + JA.dt(s.created_at) + '</td>' +
          '<td class="r nowrap"><button class="btn sm" data-open="' + s.id + '">Abrir</button>' + (edit ? ' <button class="btn sm danger" data-delsch="' + s.id + '">Excluir</button>' : '') + '</td></tr>';
      }).join('');
      var rowsC = cn.map(function (c) {
        var d = c.data || {};
        return '<tr><td>' + esc(c.name) + '</td><td>' + esc(cname[c.company_id] || '') + '</td><td class="r">' + brl(d.mensal) + '</td><td class="r">' + brl(d.anual) + '</td><td class="r">' + (d.necessarias != null ? d.atual + ' / ' + d.necessarias : '-') + '</td><td class="r">' + (d.contratacoes != null ? d.contratacoes : '-') + '</td><td class="r">' + (d.he != null ? d.he + ' h/sem' : '-') + '</td><td>' + JA.dt(c.created_at) + '</td>' +
          '<td class="r">' + (edit ? '<button class="btn sm danger" data-delscn="' + c.id + '">Excluir</button>' : '') + '</td></tr>';
      }).join('');
      el.innerHTML = '<div class="card stack"><h2>Escalas salvas</h2><p class="muted small">Usando ' + w.usage.schedules + ' de ' + w.limits.schedules + ' escalas do plano ' + esc(w.limits.name) + '.</p>' +
        (sc.length ? '<div class="tablewrap"><table><thead><tr><th>Nome</th><th>Empresa</th><th>Equipe</th><th>Regime</th><th class="r">Pessoas</th><th>Data</th><th></th></tr></thead><tbody>' + rowsS + '</tbody></table></div>' : '<p class="muted">Nenhuma escala salva ainda. Gere uma na aba Escala e use “Salvar esta escala”.</p>') + '</div>' +
        '<div id="schView"></div>' +
        '<div class="card stack"><h2>Cenários</h2><p class="muted small">Guarde uma fotografia do diagnóstico atual (por exemplo, antes e depois de mudar encargos ou a demanda por dia) e compare os números lado a lado.</p>' +
        (edit ? '<div class="row"><label class="f" style="flex:1 1 260px">Nome do cenário<input id="scn-name" maxlength="120" placeholder="ex.: Base, Com hora extra de 4h"></label><button class="btn primary" id="scn-save">Salvar cenário atual</button></div>' : '') +
        (cn.length ? '<div class="tablewrap"><table><thead><tr><th>Cenário</th><th>Empresa</th><th class="r">Custo/mês</th><th class="r">Custo/ano</th><th class="r">Hoje / necessárias</th><th class="r">Contratações</th><th class="r">Horas extras</th><th>Data</th><th></th></tr></thead><tbody>' + rowsC + '</tbody></table></div>' : '<p class="muted">Nenhum cenário salvo.</p>') + '</div>';
      el.addEventListener('click', savedClick);
      var sb = $('#scn-save', el); if (sb) sb.addEventListener('click', saveScenario);
    }).catch(function (e) { el.innerHTML = '<div class="alert bad">' + esc(JA.errMsg(e)) + '</div>'; });
  }
  function savedClick(ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.open) {
      JA.q(A.sb.from('e5_schedules').select('*').eq('id', b.dataset.open).single()).then(function (s) {
        var p = s.params || {}, r = s.result || {}, reg = { H: r.H, w: r.w, nome: p.regimeNome };
        $('#schView').innerHTML = '<div class="card stack"><div class="row no-print" style="justify-content:space-between;align-items:center"><h2>' + esc(s.name) + '</h2><button class="btn" id="sch-print">Imprimir / PDF</button></div>' +
          '<div class="print-only"><p>' + esc(p.regimeNome || '') + ' · ' + (p.n || '') + ' pessoas · salva em ' + JA.dt(s.created_at) + '</p></div></div>' +
          JA.Calc.scheduleHTML({ weeks: r.weeks || [], alerts: r.alerts || [] }, p.names || [], r.need || [0, 0, 0, 0, 0, 0, 0], reg, p.n, r.nMin);
        $('#sch-print').addEventListener('click', function () { window.print(); });
        $('#schView').scrollIntoView({ behavior: 'smooth' });
      }).catch(function (e) { JA.toast(JA.errMsg(e), 'bad'); });
    } else if (b.dataset.delsch) {
      if (!confirm('Excluir esta escala salva?')) return;
      JA.q(A.sb.from('e5_schedules').delete().eq('id', b.dataset.delsch)).then(function () { JA.refreshOverview().then(updateHeader); renderSaved($('#otherHost')); }, function (e) { JA.toast(JA.errMsg(e), 'bad'); });
    } else if (b.dataset.delscn) {
      if (!confirm('Excluir este cenário?')) return;
      JA.q(A.sb.from('e5_scenarios').delete().eq('id', b.dataset.delscn)).then(function () { renderSaved($('#otherHost')); }, function (e) { JA.toast(JA.errMsg(e), 'bad'); });
    }
  }
  function saveScenario() {
    var name = ($('#scn-name').value || '').trim(), sm = JA.Calc.state() ? JA.Calc.summary() : null;
    if (!sm || !sm.equipes) { JA.toast('Cadastre ao menos uma equipe antes de salvar um cenário.', 'bad'); return; }
    if (!name) { JA.toast('Dê um nome ao cenário.', 'bad'); return; }
    var st = JSON.parse(JSON.stringify(JA.Calc.state()));
    JA.q(A.sb.from('e5_scenarios').insert({ company_id: A.companyId, name: name, data: { mensal: sm.mensal, anual: sm.anual, necessarias: sm.necessarias, atual: sm.atual, deficit: sm.deficit, contratacoes: sm.contratacoes, he: sm.he, cfg: st.cfg, groups: st.groups.map(function (g) { return { nome: g.nome, n: g.n, salario: g.salario, r: g.r }; }) } }))
      .then(function () { JA.toast('Cenário salvo.'); renderSaved($('#otherHost')); }, function (e) { JA.toast(JA.errMsg(e), 'bad'); });
  }

  /* ---------- Equipe (usuários da conta) ---------- */
  function renderTeam(el) {
    var w = JA.ws(), admin = JA.canAdmin(), me = A.overview.user.id;
    Promise.all([JA.rpc('e5_workspace_members', { p_ws: w.id }), admin ? JA.q(A.sb.from('e5_invites').select('*').eq('workspace_id', w.id).is('accepted_at', null)) : Promise.resolve([])]).then(function (r) {
      var mem = r[0] || [], inv = r[1] || [];
      el.innerHTML = '<div class="card stack"><h2>Usuários da conta</h2><p class="muted small">Administradores gerenciam usuários; editores alteram dados e escalas; leitores só visualizam. Seu plano permite mais usuários nos planos Gestor e Rede.</p>' +
        '<div class="tablewrap"><table><thead><tr><th>E-mail</th><th>Perfil</th><th>Desde</th><th></th></tr></thead><tbody>' + mem.map(function (m) {
          var roleCell = (admin && m.role !== 'owner') ? '<select data-role="' + m.user_id + '">' + ['admin', 'editor', 'viewer'].map(function (k) { return '<option value="' + k + '"' + (m.role === k ? ' selected' : '') + '>' + ROLE[k] + '</option>'; }).join('') + '</select>' : esc(ROLE[m.role]);
          var rm = (m.role !== 'owner' && (admin || m.user_id === me)) ? '<button class="btn sm danger" data-rm="' + m.user_id + '">' + (m.user_id === me ? 'Sair da conta' : 'Remover') + '</button>' : '';
          return '<tr><td>' + esc(m.email) + (m.user_id === me ? ' <span class="muted">(você)</span>' : '') + '</td><td>' + roleCell + '</td><td>' + JA.dt(m.since) + '</td><td class="r">' + rm + '</td></tr>';
        }).join('') + '</tbody></table></div></div>' +
        (admin ? '<div class="card stack"><h2>Convidar usuário</h2><form id="f-inv" class="row" novalidate><label class="f" style="flex:2 1 240px">E-mail<input name="email" type="email" required></label>' +
          '<label class="f" style="flex:1 1 140px">Perfil<select name="role"><option value="editor">Editor</option><option value="viewer">Leitura</option><option value="admin">Administrador</option></select></label>' +
          '<button class="btn primary" type="submit">Convidar</button></form><div class="formmsg alert bad" id="inv-msg" hidden></div>' +
          '<p class="small muted">A pessoa precisa criar uma conta com este mesmo e-mail em <b>' + esc(location.host + location.pathname) + '</b>; o convite é aplicado quando ela entrar.</p>' +
          (inv.length ? '<h3>Convites pendentes</h3><div class="tablewrap"><table><tbody>' + inv.map(function (i) { return '<tr><td>' + esc(i.email) + '</td><td>' + esc(ROLE[i.role]) + '</td><td class="r"><button class="btn sm danger" data-revoke="' + i.id + '">Cancelar</button></td></tr>'; }).join('') + '</tbody></table></div>' : '') + '</div>' : '');
      el.onclick = function (ev) {
        var b = ev.target.closest('button'); if (!b) return;
        if (b.dataset.rm) {
          if (!confirm(b.dataset.rm === me ? 'Sair desta conta?' : 'Remover este usuário?')) return;
          JA.q(A.sb.from('e5_members').delete().eq('workspace_id', w.id).eq('user_id', b.dataset.rm)).then(function () {
            if (b.dataset.rm === me) { A.wsId = null; return JA.refreshAll().then(function () { A.shellKey = null; JA.go('app'); JA.render(); }); }
            renderTeam(el);
          }, function (e) { JA.toast(JA.errMsg(e), 'bad'); });
        } else if (b.dataset.revoke) {
          JA.q(A.sb.from('e5_invites').delete().eq('id', b.dataset.revoke)).then(function () { renderTeam(el); }, function (e) { JA.toast(JA.errMsg(e), 'bad'); });
        }
      };
      el.onchange = function (ev) {
        var s = ev.target; if (!s.dataset || !s.dataset.role) return;
        JA.rpc('e5_set_member_role', { p_ws: w.id, p_user: s.dataset.role, p_role: s.value }).then(function () { JA.toast('Perfil atualizado.'); }, function (e) { JA.toast(JA.errMsg(e), 'bad'); renderTeam(el); });
      };
      var f = $('#f-inv', el); if (f) f.addEventListener('submit', function (ev) {
        ev.preventDefault(); var msg = $('#inv-msg'), em = f.email.value.trim().toLowerCase();
        if (!JA.validEmail(em)) { msg.hidden = false; msg.textContent = 'Informe um e-mail válido.'; return; }
        JA.rpc('e5_invite_member', { p_ws: w.id, p_email: em, p_role: f.role.value }).then(function () { JA.toast('Convite criado.'); renderTeam(el); }, function (e) { msg.hidden = false; msg.textContent = JA.errMsg(e); });
      });
    }).catch(function (e) { el.innerHTML = '<div class="alert bad">' + esc(JA.errMsg(e)) + '</div>'; });
  }

  /* ---------- Plano ---------- */
  function meter(label, used, max) {
    var pct = max ? Math.min(100, Math.round(used / max * 100)) : 0, cls = used > max ? 'bad' : (pct >= 90 ? 'warn' : '');
    return '<div class="meter ' + cls + '"><div class="row" style="justify-content:space-between"><span>' + label + '</span><b class="num">' + used + ' de ' + max + '</b></div><div class="track"><div class="fill" style="width:' + pct + '%"></div></div></div>';
  }
  function renderPlan(el) {
    JA.refreshOverview().then(function () {
      var w = JA.ws(), paid = w.paid_plan && (!w.paid_until || new Date(w.paid_until) > Date.now());
      var email = A.session.user.email;
      el.innerHTML = '<div class="card stack"><div class="row" style="justify-content:space-between;align-items:center"><h2>Seu plano: ' + esc(w.limits.name) + '</h2><button class="btn sm" id="pl-refresh">Atualizar status</button></div>' +
        (paid ? '<p class="muted">Assinatura ativa' + (w.paid_until ? ' com acesso garantido até <b>' + JA.dt(w.paid_until) + '</b> (renova automaticamente a cada pagamento)' : '') + '.</p>' :
          (w.trial_ends_at && new Date(w.trial_ends_at) > Date.now() ? '<p class="muted">Teste grátis do plano Gestor até <b>' + JA.dt(w.trial_ends_at) + '</b>.</p>' : '<p class="muted">Você está no plano gratuito.</p>')) +
        '<div class="grid2">' + meter('Pessoas', w.usage.people, w.limits.people) + meter('Equipes', w.usage.teams, w.limits.teams) + meter('Empresas', w.usage.companies, w.limits.companies) + meter('Escalas salvas', w.usage.schedules, w.limits.schedules) + '</div></div>' +
        '<div class="card stack"><h2>Planos</h2>' + JA.planCards({ app: true, current: w.plan }) +
        '<p class="small muted">Para liberar o plano automaticamente, use na compra o mesmo e-mail desta conta: <b>' + esc(email) + '</b>. O acesso é liberado em instantes após a confirmação do pagamento; se não aparecer, clique em “Atualizar status” ou ' +
        (JA.contactLink('Olá! Fiz o pagamento do Escala 5x2 Inteligente com o e-mail ' + email + ' e o plano ainda não foi liberado.') ? '<a href="' + esc(JA.contactLink('Olá! Fiz o pagamento do Escala 5x2 Inteligente com o e-mail ' + email + ' e o plano ainda não foi liberado.')) + '" target="_blank" rel="noopener">fale conosco</a>' : 'fale conosco') + '.</p></div>';
      $('#pl-refresh', el).addEventListener('click', function () { renderPlan(el); updateHeader(); });
    }).catch(function (e) { el.innerHTML = '<div class="alert bad">' + esc(JA.errMsg(e)) + '</div>'; });
  }

  /* ---------- Conta ---------- */
  function renderAccount(el) {
    var w = JA.ws(), admin = JA.canAdmin(), owner = w.role === 'owner', u = A.session.user;
    el.innerHTML = '<div class="card stack"><h2>Minha conta</h2><p>Entrou como <b>' + esc(u.email) + '</b> · perfil: ' + esc(ROLE[w.role]) + '</p>' +
      '<form id="f-pw" class="row" novalidate><label class="f" style="flex:1 1 240px">Nova senha (mínimo 8 caracteres)<input name="password" type="password" autocomplete="new-password" minlength="8"></label><button class="btn" type="submit">Alterar senha</button></form>' +
      '<div class="formmsg alert bad" id="pw-msg" hidden></div></div>' +
      (admin ? '<div class="card stack"><h2>Conta da empresa</h2><form id="f-ws" class="row" novalidate><label class="f" style="flex:1 1 280px">Nome da conta<input name="name" maxlength="80" value="' + esc(w.name) + '"></label><button class="btn" type="submit">Renomear</button></form></div>' : '') +
      '<div class="card stack"><h2>Outra conta de empresa</h2><p class="muted small">Cada conta tem plano, usuários e empresas separados. Limite de 5 contas por usuário.</p><div><button class="btn" id="ws-new">Criar nova conta</button></div></div>' +
      '<div class="card stack"><h2>Dados e privacidade</h2><p class="muted small">Para exportar ou excluir seus dados (LGPD), escreva para <a href="mailto:' + esc(contactMailAddr()) + '">' + esc(contactMailAddr()) + '</a>. Veja a <a href="#/privacidade">Política de privacidade</a>.</p>' +
      (owner ? '<div><button class="btn danger" id="ws-del">Excluir esta conta de empresa</button></div>' : '') + '</div>';
    $('#f-pw', el).addEventListener('submit', function (ev) {
      ev.preventDefault(); var pw = ev.target.password.value, m = $('#pw-msg');
      if (pw.length < 8) { m.hidden = false; m.className = 'formmsg alert bad'; m.textContent = 'A senha precisa ter pelo menos 8 caracteres.'; return; }
      A.sb.auth.updateUser({ password: pw }).then(function (r) { m.hidden = false; m.className = 'formmsg alert ' + (r.error ? 'bad' : 'good'); m.textContent = r.error ? JA.errMsg(r.error) : 'Senha alterada.'; ev.target.password.value = ''; });
    });
    var fw = $('#f-ws', el); if (fw) fw.addEventListener('submit', function (ev) {
      ev.preventDefault(); var nm = fw.name.value.trim(); if (nm.length < 2) return;
      JA.q(A.sb.from('e5_workspaces').update({ name: nm }).eq('id', w.id)).then(function () { return JA.refreshAll(); }).then(function () { JA.toast('Conta renomeada.'); A.shellKey = null; JA.render(); }, function (e) { JA.toast(JA.errMsg(e), 'bad'); });
    });
    $('#ws-new', el).addEventListener('click', function () {
      JA.modal({ title: 'Nova conta de empresa', ok: 'Criar conta', fields: [{ name: 'ws', label: 'Nome da conta', required: true, max: 80 }, { name: 'co', label: 'Primeira empresa (opcional)' }],
        onSubmit: function (v) {
          return flush().then(function () { return JA.rpc('e5_create_workspace', { p_name: v.ws, p_company_name: v.co || null, p_sector: null }); })
            .then(function (r) { A.wsId = r.workspace_id; A.companyId = r.company_id; try { localStorage.setItem('e5.ws', A.wsId); } catch (e) {} return JA.refreshAll(); })
            .then(function () { A.shellKey = null; JA.go('app/dados'); JA.render(); });
        } });
    });
    var d = $('#ws-del', el); if (d) d.addEventListener('click', function () {
      JA.modal({ title: 'Excluir conta de empresa', intro: 'Isto apaga empresas, equipes, escalas e usuários desta conta e não pode ser desfeito. Digite o nome da conta para confirmar: ' + w.name, ok: 'Excluir definitivamente',
        fields: [{ name: 'c', label: 'Nome da conta', required: true, max: 80 }],
        onSubmit: function (v) {
          if (v.c !== w.name) throw new Error('O nome digitado não confere.');
          return JA.q(A.sb.from('e5_workspaces').delete().eq('id', w.id)).then(function () { A.wsId = null; A.companyId = null; return JA.refreshAll(); }).then(function () { A.shellKey = null; JA.go('app'); JA.render(); });
        } });
    });
  }
  function contactMailAddr() { return (A.settings && A.settings.contact_email) || 'jairpimenta.souza@gmail.com'; }
})();
