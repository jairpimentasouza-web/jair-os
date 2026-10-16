/* Escala 5x2 Inteligente — telas públicas, autenticação e painel do cliente. */
(function () {
  'use strict';
  var JA = window.JA, E5 = window.E5, A = JA.A, $ = JA.$, $$ = JA.$$, esc = JA.esc, brl = JA.brl;
  var V = JA.views = {};

  function view(html) { $('#view').innerHTML = html; window.scrollTo(0, 0); }
  function appUrl() { return location.origin + location.pathname; }
  function setBusy(btn, on, txt) {
    if (!btn) return;
    if (on) { btn.dataset.t = btn.textContent; btn.disabled = true; if (txt) btn.textContent = txt; }
    else { btn.disabled = false; if (btn.dataset.t) btn.textContent = btn.dataset.t; }
  }
  function formMsg(form, msg, kind) {
    var m = $('.formmsg', form); if (!m) return;
    m.className = 'formmsg alert ' + (kind || 'bad'); m.textContent = msg; m.hidden = !msg;
  }
  JA.scrollToId = function (id) { var el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  /* ---------- Modal simples ---------- */
  JA.modal = function (o) {
    var old = $('#modal'); if (old) old.remove();
    var m = document.createElement('div'); m.id = 'modal'; m.className = 'modal';
    m.innerHTML = '<div class="modal-card" role="dialog" aria-modal="true" aria-label="' + esc(o.title) + '"><h3>' + esc(o.title) + '</h3>' + (o.intro ? '<p class="muted small">' + esc(o.intro) + '</p>' : '') +
      '<form class="stack">' + (o.fields || []).map(function (f) {
        return '<label class="f">' + esc(f.label) + '<input name="' + f.name + '" type="' + (f.type || 'text') + '" value="' + esc(f.value || '') + '"' + (f.required ? ' required' : '') + ' maxlength="' + (f.max || 120) + '"></label>';
      }).join('') + '<div class="formmsg alert bad" hidden></div><div class="row"><button class="btn primary" type="submit">' + esc(o.ok || 'Confirmar') + '</button><button class="btn" type="button" data-x>Cancelar</button></div></form></div>';
    document.body.appendChild(m);
    var form = $('form', m), first = $('input', m); if (first) first.focus();
    function onKey(ev) { if (ev.key === 'Escape') close(); }
    function close() { document.removeEventListener('keydown', onKey); m.remove(); }
    m.addEventListener('click', function (ev) { if (ev.target === m || ev.target.hasAttribute('data-x')) close(); });
    document.addEventListener('keydown', onKey);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var vals = {}; (o.fields || []).forEach(function (f) { vals[f.name] = form.elements[f.name].value.trim(); });
      var btn = $('button[type=submit]', form); setBusy(btn, true);
      Promise.resolve(o.onSubmit(vals)).then(function () { close(); }, function (e) { setBusy(btn, false); formMsg(form, JA.errMsg(e)); });
    });
  };

  /* ---------- Barra superior e rodapé ---------- */
  JA.renderChrome = function () {
    var o = A.overview, logged = !!A.session;
    var nav = '<a href="#/calculadora">Calculadora</a><a href="#/" data-scroll="planos">Planos</a><a href="#/" data-scroll="contato">Diagnóstico</a>';
    if (logged) {
      nav = '<a href="#/app">Meu painel</a>' + (o && o.is_admin ? '<a href="#/admin">Admin</a>' : '') + '<a href="#/calculadora">Calculadora</a>' +
        '<button class="linkbtn" id="btn-logout">Sair</button>';
    } else nav += '<a href="#/entrar">Entrar</a><a class="btn primary sm" href="#/cadastro">Testar grátis</a>';
    $('#topbar').innerHTML = '<div class="topbar-in"><a class="brand" href="#/"><span class="logo">5x2</span><span>Escala 5x2 <b>Inteligente</b></span></a><nav class="topnav">' + nav + '</nav></div>';
    var lo = $('#btn-logout'); if (lo) lo.addEventListener('click', JA.logout);
    var contact = (A.settings && A.settings.contact_email) || '';
    $('#foot').innerHTML = '<div class="foot-in"><div><b>Escala 5x2 Inteligente</b><p class="small muted">Ferramenta de planejamento operacional. Não substitui assessoria jurídica, contábil ou trabalhista, nem o cálculo da folha. Confirme regras de convenção coletiva, intervalos e descansos antes de publicar uma escala.</p></div>' +
      '<div class="small"><a href="#/privacidade">Privacidade</a> · <a href="#/termos">Termos de uso</a>' + (contact ? ' · <a href="mailto:' + esc(contact) + '">' + esc(contact) + '</a>' : '') + '</div></div>';
  };
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[data-scroll]');
    if (!a) return;
    ev.preventDefault();
    var id = a.dataset.scroll, r = JA.parseRoute();
    if (r.parts.length) { JA.go(''); setTimeout(function () { JA.scrollToId(id); }, 60); } else JA.scrollToId(id);
  });

  /* ---------- Planos ---------- */
  var FALLBACK_PLANS = [
    { key: 'gratuito', name: 'Gratuito', price_month: 0, max_people: 10, max_teams: 2, max_companies: 1, max_schedules: 3, features: [] },
    { key: 'essencial', name: 'Essencial', price_month: 149, max_people: 15, max_teams: 3, max_companies: 1, max_schedules: 50, features: [] },
    { key: 'gestor', name: 'Gestor', price_month: 299, max_people: 50, max_teams: 10, max_companies: 3, max_schedules: 500, features: [] },
    { key: 'rede', name: 'Rede', price_month: 499, max_people: 150, max_teams: 40, max_companies: 20, max_schedules: 5000, features: [] }
  ];
  function planList() { return (A.plans && A.plans.length ? A.plans : FALLBACK_PLANS); }
  function checkoutUrl(p) {
    if (!p.checkout_url) return null;
    var u = p.checkout_url, em = A.session && A.session.user && A.session.user.email;
    if (em) u += (u.indexOf('?') >= 0 ? '&' : '?') + 'email=' + encodeURIComponent(em);
    return u;
  }
  function planCards(ctx) {
    var cur = ctx && ctx.current;
    return '<div class="pricing">' + planList().map(function (p) {
      var feats = (Array.isArray(p.features) ? p.features : []).slice();
      if (!feats.length) feats = ['Até ' + p.max_people + ' pessoas', p.max_teams + ' equipes', p.max_companies + ' empresa(s)', p.max_schedules + ' escalas salvas'];
      var cta;
      if (ctx && ctx.app) {
        if (p.key === cur) cta = '<span class="pill good">Seu plano atual</span>';
        else if (p.key === 'gratuito') cta = '<span class="muted small">Plano de entrada</span>';
        else {
          var u = checkoutUrl(p);
          cta = u ? '<a class="btn primary" href="' + esc(u) + '" target="_blank" rel="noopener">Assinar ' + esc(p.name) + '</a>' :
            '<a class="btn" href="' + esc(JA.contactLink('Olá! Quero assinar o plano ' + p.name + ' do Escala 5x2 Inteligente.') || '#/') + '" target="_blank" rel="noopener">Falar para assinar</a>';
        }
      } else cta = '<a class="btn ' + (p.key === 'gestor' ? 'primary' : '') + '" href="#/cadastro">' + (p.key === 'gratuito' ? 'Começar grátis' : 'Testar 14 dias grátis') + '</a>';
      return '<div class="plan' + (p.key === 'gestor' ? ' hl' : '') + (p.key === cur ? ' cur' : '') + '">' + (p.key === 'gestor' ? '<span class="tag">Mais escolhido</span>' : '') +
        '<h3>' + esc(p.name) + '</h3><div class="price">' + (p.price_month > 0 ? '<b>' + brl(p.price_month) + '</b><small>/mês</small>' : '<b>Grátis</b>') + '</div>' +
        '<ul>' + feats.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul><div class="plan-cta">' + cta + '</div></div>';
    }).join('') + '</div>';
  }

  /* ---------- Landing ---------- */
  V.landing = function () {
    var ex = JA.Calc.exemplo(), d = E5.diagnostico(ex), f = d.fases.final;
    view(
      '<section class="land-hero"><div class="land-hero-in"><div class="stack" style="gap:16px">' +
      '<span class="eyebrow">Fim da escala 6x1 · PEC em tramitação no Senado</span>' +
      '<h1>Descubra o que a jornada de 40h vai custar na sua empresa — e receba a escala pronta.</h1>' +
      '<p class="lead">Informe suas equipes e quantas pessoas cada dia exige. O Escala 5x2 Inteligente calcula quantas contratações ou horas extras fecham a conta pelo menor custo e gera a escala de folgas, sem ninguém passar de 6 dias seguidos.</p>' +
      '<div class="row"><a class="btn primary lg" href="#/cadastro">Testar grátis por 14 dias</a><a class="btn lg" href="#/calculadora">Calcular sem cadastro</a></div>' +
      '<p class="small muted">Sem cartão para começar. Plano gratuito continua disponível depois do teste.</p></div>' +
      '<div class="card sample"><span class="example">Exemplo: padaria com 12 pessoas</span><div class="small muted" style="margin-top:8px">Impacto mensal estimado no regime de 40h/5x2</div>' +
      '<div class="big">' + brl(f.recomendado) + ' <small>por mês</small></div>' +
      '<div class="kpis"><div class="kpi"><span class="muted">Pessoas hoje / necessárias</span><b>' + f.pessoasAtual + ' / ' + f.pessoasNecessarias + '</b></div>' +
      '<div class="kpi"><span class="muted">Contratações sugeridas</span><b>' + f.contratacoesRecomendadas + '</b></div>' +
      '<div class="kpi"><span class="muted">Se só contratasse</span><b>' + brl(f.contratarTudo) + '</b></div></div>' +
      '<p class="small muted">Cálculo real do motor da ferramenta, com premissas de exemplo.</p></div></div></section>' +

      '<section class="land-sec"><div class="land-in"><h2>Três respostas que o dono da operação precisa</h2><div class="grid3">' +
      '<div class="card"><h3>Quanto vai custar?</h3><p class="muted">Custo mensal e anual da transição por equipe, comparando só contratar, só hora extra e o mix mais barato que ainda respeita o limite de horas extras.</p></div>' +
      '<div class="card"><h3>Quantas pessoas faltam?</h3><p class="muted">Dimensionamento por dia da semana, não por média. Domingo e sábado costumam definir o tamanho da equipe, e a ferramenta mostra isso.</p></div>' +
      '<div class="card"><h3>Como fica a escala?</h3><p class="muted">Escala de até 6 semanas com folgas seguidas quando possível, rodízio de domingos e alerta de cobertura. Copie para a planilha ou imprima.</p></div></div></div></section>' +

      '<section class="land-sec alt"><div class="land-in"><h2>Como funciona</h2><div class="grid3 steps">' +
      '<div><span class="stepn">1</span><h3>Cadastre as equipes</h3><p class="muted">Pessoas hoje, salário médio e quantas pessoas cada dia precisa ter presentes.</p></div>' +
      '<div><span class="stepn">2</span><h3>Veja o impacto</h3><p class="muted">Hoje, 42h e 40h lado a lado, com os custos e as premissas editáveis (encargos, hora extra, benefícios).</p></div>' +
      '<div><span class="stepn">3</span><h3>Gere e salve a escala</h3><p class="muted">Ajuste nomes, gere variações, salve na conta e imprima em PDF para o time.</p></div></div></div></section>' +

      '<section class="land-sec"><div class="land-in"><h2>Onde está a PEC</h2><p class="muted" style="max-width:70ch">Aprovada na Câmara em 27/05/2026 e na CCJ do Senado em 02/09/2026, a PEC que acaba com a escala 6x1 aguarda votação em plenário, prevista para depois do segundo turno das eleições (25/10). O texto aprovado prevê 42h dois meses após a promulgação e 40h com 2 dias de descanso após 14 meses, sem corte de salário. Esses prazos são premissas editáveis na ferramenta: confira a redação final quando for promulgada. <a href="https://tribunadosertao.com.br/financas/2026/10/06/991443-fim-da-escala-6x1-chega-ao-plenario-do-senado" target="_blank" rel="noopener">Fonte (06/10/2026)</a>.</p></div></section>' +

      '<section class="land-sec alt" id="planos"><div class="land-in"><h2>Planos</h2><p class="muted">Comece com 14 dias do plano Gestor. Depois do teste, a conta segue no plano gratuito ou no plano que você assinar.</p>' + planCards({}) +
      '<p class="small muted">Pagamento seguro pela Kiwify, assinatura mensal. Cancele quando quiser; o acesso pago vale até o fim do período pago.</p></div></section>' +

      '<section class="land-sec" id="contato"><div class="land-in contact"><div class="stack"><h2>Prefere que a gente faça o diagnóstico por você?</h2>' +
      '<p class="muted">O Diagnóstico 5x2 Express entrega o relatório com as regras da sua convenção coletiva, a escala de 4 semanas pronta para publicar e o plano de contratação ou horas extras, em até 2 dias úteis. Deixe seus dados e retornamos com uma proposta.</p></div>' +
      '<form class="card stack" id="leadform" novalidate><div class="grid2"><label class="f">Seu nome<input name="name" required maxlength="120" autocomplete="name"></label>' +
      '<label class="f">E-mail<input name="email" type="email" required maxlength="200" autocomplete="email"></label>' +
      '<label class="f">WhatsApp (opcional)<input name="whatsapp" maxlength="40" autocomplete="tel"></label>' +
      '<label class="f">Empresa<input name="company" maxlength="120" autocomplete="organization"></label>' +
      '<label class="f">Setor<input name="sector" maxlength="80"></label>' +
      '<label class="f">Nº de funcionários<input name="employees" type="number" min="1" max="100000"></label></div>' +
      '<label class="f">Conte rapidamente sua situação (opcional)<textarea name="message" maxlength="1000" style="font-family:var(--f-body)"></textarea></label>' +
      '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<label class="chk"><input type="checkbox" name="consent"><span>Autorizo o contato sobre este pedido pelos dados informados. <a href="#/privacidade">Política de privacidade</a>.</span></label>' +
      '<div class="formmsg alert bad" hidden></div><div><button class="btn primary" type="submit">Quero receber uma proposta</button></div></form></div></section>' +

      '<section class="land-sec alt"><div class="land-in"><h2>Perguntas frequentes</h2><div class="faq">' +
      '<details><summary>Meus dados ficam seguros?</summary><p>Cada empresa só enxerga os próprios dados: o banco aplica isolamento por conta em todas as tabelas. A calculadora pública funciona sem cadastro e guarda tudo apenas no seu navegador.</p></details>' +
      '<details><summary>A ferramenta substitui contador ou advogado?</summary><p>Não. É uma ferramenta de planejamento operacional: estima custo e monta escalas. Encargos, convenção coletiva, intervalos e descansos devem ser confirmados com a sua assessoria.</p></details>' +
      '<details><summary>E se a PEC mudar?</summary><p>Jornada, prazos e folgas da transição são premissas editáveis. Se a redação final mudar, você ajusta os números e recalcula.</p></details>' +
      '<details><summary>Como funciona o teste de 14 dias?</summary><p>Ao criar a conta da empresa você ganha 14 dias com os limites do plano Gestor. Ao final, a conta volta ao plano gratuito, sem perder o que já foi salvo (acima do limite gratuito apenas não será possível adicionar mais).</p></details>' +
      '<details><summary>Como pago e cancelo?</summary><p>A assinatura é mensal pela Kiwify. Para liberar o plano automaticamente, use na compra o mesmo e-mail do seu cadastro. Cancelando, o acesso permanece até o fim do período já pago.</p></details>' +
      '</div></div></section>');
    $('#leadform').addEventListener('submit', submitLead);
  };

  function submitLead(ev) {
    ev.preventDefault();
    var form = ev.target, fd = new FormData(form), p = {};
    fd.forEach(function (v, k) { p[k] = typeof v === 'string' ? v.trim() : v; });
    p.consent = !!form.elements.consent.checked;
    if (p.name.length < 2) return formMsg(form, 'Informe seu nome.');
    if (!JA.validEmail(p.email)) return formMsg(form, 'Informe um e-mail válido.');
    if (!p.consent) return formMsg(form, 'Marque a autorização de contato para enviar.');
    p.employees = p.employees ? parseInt(p.employees, 10) : null; p.source = 'landing';
    var btn = $('button[type=submit]', form); setBusy(btn, true, 'Enviando...');
    JA.rpc('e5_submit_lead', { p_payload: p }).then(function () {
      form.innerHTML = '<div class="alert good"><b>Recebido!</b> Entraremos em contato pelo e-mail ou WhatsApp informado em até 1 dia útil.</div>';
    }, function (e) { setBusy(btn, false); formMsg(form, JA.errMsg(e)); });
  }

  /* ---------- Calculadora pública (demonstração) ---------- */
  V.calc = function () {
    view('<div class="wrap"><header class="top"><span class="eyebrow">Planejamento de jornada · 44h para 40h</span><h1>Calculadora 5x2</h1>' +
      '<p class="muted">Modo demonstração: seus dados ficam só neste navegador. ' + (A.session ? '<a href="#/app">Abrir meu painel</a>' : '<a href="#/cadastro">Crie uma conta</a> para salvar na nuvem, guardar escalas e compartilhar com o time.') + '</p></header>' +
      '<nav class="tabs" role="tablist" id="tabs-demo"></nav><div id="calcHost"></div></div>');
    var KEY = 'escala5x2.v1', st = null;
    try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); if (o && o.groups && o.cfg) st = o; } } catch (e) {}
    var tabs = [['impacto', 'Impacto'], ['dados', 'Dados da empresa'], ['escala', 'Escala'], ['relatorio', 'Relatório']];
    function drawTabs(cur) {
      $('#tabs-demo').innerHTML = tabs.map(function (t) { return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (t[0] === cur) + '">' + t[1] + '</button>'; }).join('');
    }
    var cur = 'impacto'; drawTabs(cur);
    JA.Calc.mount($('#calcHost'), { state: st || JA.Calc.exemplo(), persistKey: KEY, cloud: false, tab: cur,
      onNeedAccount: function () { JA.toast('Crie uma conta gratuita para salvar escalas.'); JA.go('cadastro'); },
      onGoto: function (t) { cur = t; drawTabs(t); JA.Calc.show(t); } });
    $('#tabs-demo').addEventListener('click', function (ev) { var b = ev.target.closest('button[data-tab]'); if (b) { cur = b.dataset.tab; drawTabs(cur); JA.Calc.show(cur); } });
  };

  /* ---------- Autenticação ---------- */
  function authShell(title, sub, body) {
    view('<div class="auth"><div class="card stack"><h1 class="h2">' + title + '</h1>' + (sub ? '<p class="muted">' + sub + '</p>' : '') + body + '</div></div>');
  }
  V.login = function (q) {
    if (A.session) return JA.go('app');
    authShell('Entrar', 'Acesse o painel da sua empresa.',
      '<form class="stack" id="f-login" novalidate><label class="f">E-mail<input name="email" type="email" autocomplete="username" required></label>' +
      '<label class="f">Senha<input name="password" type="password" autocomplete="current-password" required></label>' +
      '<div class="formmsg alert bad" hidden></div><button class="btn primary" type="submit">Entrar</button></form>' +
      '<p class="small"><a href="#/recuperar">Esqueci minha senha</a> · <a href="#/cadastro">Criar conta grátis</a></p>');
    $('#f-login').addEventListener('submit', function (ev) {
      ev.preventDefault(); var f = ev.target, em = f.email.value.trim().toLowerCase(), pw = f.password.value;
      if (!JA.validEmail(em) || !pw) return formMsg(f, 'Informe e-mail e senha.');
      var btn = $('button[type=submit]', f); setBusy(btn, true, 'Entrando...');
      A.sb.auth.signInWithPassword({ email: em, password: pw }).then(function (r) {
        if (r.error) { setBusy(btn, false); formMsg(f, JA.errMsg(r.error)); return; }
        /* o onAuthStateChange conclui o fluxo */
        A.nextAfterLogin = (q && q.next) || 'app';
      }, function (e) { setBusy(btn, false); formMsg(f, JA.errMsg(e)); });
    });
  };
  V.signup = function (q) {
    if (A.session) return JA.go('app');
    authShell('Criar conta grátis', 'Teste o plano Gestor por 14 dias. Sem cartão.',
      '<form class="stack" id="f-signup" novalidate><label class="f">Seu nome<input name="name" autocomplete="name" required maxlength="80"></label>' +
      '<label class="f">E-mail<input name="email" type="email" autocomplete="username" required></label>' +
      '<label class="f">Senha (mínimo 8 caracteres)<input name="password" type="password" autocomplete="new-password" required minlength="8"></label>' +
      '<label class="chk"><input type="checkbox" name="terms"><span>Li e aceito os <a href="#/termos">Termos de uso</a> e a <a href="#/privacidade">Política de privacidade</a>.</span></label>' +
      '<div class="formmsg alert bad" hidden></div><button class="btn primary" type="submit">Criar conta</button></form>' +
      '<p class="small">Já tem conta? <a href="#/entrar">Entrar</a></p>');
    $('#f-signup').addEventListener('submit', function (ev) {
      ev.preventDefault(); var f = ev.target, em = f.email.value.trim().toLowerCase(), pw = f.password.value, nm = f.name.value.trim();
      if (nm.length < 2) return formMsg(f, 'Informe seu nome.');
      if (!JA.validEmail(em)) return formMsg(f, 'Informe um e-mail válido.');
      if (pw.length < 8) return formMsg(f, 'A senha precisa ter pelo menos 8 caracteres.');
      if (!f.terms.checked) return formMsg(f, 'Aceite os termos para continuar.');
      var btn = $('button[type=submit]', f); setBusy(btn, true, 'Criando...');
      A.sb.auth.signUp({ email: em, password: pw, options: { data: { app: 'escala5x2', name: nm }, emailRedirectTo: appUrl() } }).then(function (r) {
        if (r.error) { setBusy(btn, false); formMsg(f, JA.errMsg(r.error)); return; }
        var u = r.data && r.data.user;
        if (u && u.identities && u.identities.length === 0) { setBusy(btn, false); formMsg(f, 'Este e-mail já tem cadastro. Entre ou recupere a senha.'); return; }
        if (r.data && r.data.session) { A.nextAfterLogin = 'app'; return; }
        authShell('Confirme seu e-mail', 'Enviamos um link de confirmação para <b>' + esc(em) + '</b>. Abra o e-mail (veja também o spam) e clique no link para ativar a conta.',
          '<div class="row"><button class="btn" id="resend">Reenviar e-mail</button><a class="btn" href="#/entrar">Já confirmei</a></div><div class="formmsg alert good" hidden></div>');
        $('#resend').addEventListener('click', function () {
          var b = this; setBusy(b, true);
          A.sb.auth.resend({ type: 'signup', email: em, options: { emailRedirectTo: appUrl() } }).then(function (rr) {
            setBusy(b, false); var m = $('.formmsg'); m.hidden = false; m.className = 'formmsg alert ' + (rr.error ? 'bad' : 'good'); m.textContent = rr.error ? JA.errMsg(rr.error) : 'E-mail reenviado.';
          });
        });
      }, function (e) { setBusy(btn, false); formMsg(f, JA.errMsg(e)); });
    });
  };
  V.recover = function () {
    authShell('Recuperar senha', 'Enviaremos um link para você criar uma nova senha.',
      '<form class="stack" id="f-rec" novalidate><label class="f">E-mail<input name="email" type="email" autocomplete="username" required></label>' +
      '<div class="formmsg alert bad" hidden></div><button class="btn primary" type="submit">Enviar link</button></form><p class="small"><a href="#/entrar">Voltar</a></p>');
    $('#f-rec').addEventListener('submit', function (ev) {
      ev.preventDefault(); var f = ev.target, em = f.email.value.trim().toLowerCase();
      if (!JA.validEmail(em)) return formMsg(f, 'Informe um e-mail válido.');
      var btn = $('button[type=submit]', f); setBusy(btn, true, 'Enviando...');
      A.sb.auth.resetPasswordForEmail(em, { redirectTo: appUrl() }).then(function (r) {
        setBusy(btn, false);
        if (r.error) return formMsg(f, JA.errMsg(r.error));
        formMsg(f, 'Se o e-mail estiver cadastrado, o link chegará em instantes. Veja também o spam.', 'good');
      }, function (e) { setBusy(btn, false); formMsg(f, JA.errMsg(e)); });
    });
  };
  V.newpass = function () {
    authShell('Nova senha', 'Defina uma nova senha para a sua conta.',
      '<form class="stack" id="f-np" novalidate><label class="f">Nova senha (mínimo 8 caracteres)<input name="password" type="password" autocomplete="new-password" required minlength="8"></label>' +
      '<div class="formmsg alert bad" hidden></div><button class="btn primary" type="submit">Salvar nova senha</button></form>');
    $('#f-np').addEventListener('submit', function (ev) {
      ev.preventDefault(); var f = ev.target, pw = f.password.value;
      if (pw.length < 8) return formMsg(f, 'A senha precisa ter pelo menos 8 caracteres.');
      var btn = $('button[type=submit]', f); setBusy(btn, true);
      A.sb.auth.updateUser({ password: pw }).then(function (r) {
        if (r.error) { setBusy(btn, false); return formMsg(f, JA.errMsg(r.error)); }
        JA.toast('Senha atualizada'); JA.go('app');
      }, function (e) { setBusy(btn, false); formMsg(f, JA.errMsg(e)); });
    });
  };

  /* ---------- Onboarding: cria a conta da empresa ---------- */
  V.onboarding = function () {
    var email = (A.session && A.session.user && A.session.user.email) || '';
    view('<div class="auth"><div class="card stack"><h1 class="h2">Vamos criar a conta da sua empresa</h1>' +
      '<p class="muted">Você começa com <b>14 dias do plano Gestor</b>. Depois, a conta segue gratuita ou no plano que assinar.</p>' +
      '<form class="stack" id="f-onb" novalidate><label class="f">Nome da conta (sua empresa ou escritório)<input name="ws" required maxlength="80"></label>' +
      '<label class="f">Primeira empresa a analisar<input name="co" maxlength="120" placeholder="igual ao nome da conta, se for a mesma"></label>' +
      '<label class="f">Setor (opcional)<input name="sector" maxlength="80" placeholder="ex.: varejo, restaurante, indústria"></label>' +
      '<div class="formmsg alert bad" hidden></div><button class="btn primary" type="submit">Criar e abrir o painel</button></form>' +
      '<p class="small muted">Conectado como ' + esc(email) + '</p></div></div>');
    $('#f-onb').addEventListener('submit', function (ev) {
      ev.preventDefault(); var f = ev.target, ws = f.ws.value.trim();
      if (ws.length < 2) return formMsg(f, 'Informe o nome da conta.');
      var btn = $('button[type=submit]', f); setBusy(btn, true, 'Criando...');
      JA.rpc('e5_create_workspace', { p_name: ws, p_company_name: f.co.value.trim() || null, p_sector: f.sector.value.trim() || null }).then(function (r) {
        A.wsId = r.workspace_id; A.companyId = r.company_id;
        return JA.refreshAll().then(function () { JA.toast(r.trial ? 'Conta criada. Teste de 14 dias ativado.' : 'Conta criada.'); JA.go('app/dados'); });
      }).catch(function (e) { setBusy(btn, false); formMsg(f, JA.errMsg(e)); });
    });
  };

  /* ---------- Páginas legais ---------- */
  function contactMail() { return (A.settings && A.settings.contact_email) || 'jairpimenta.souza@gmail.com'; }
  V.privacy = function () {
    view('<div class="legal"><h1>Política de privacidade</h1><p class="muted small">Versão de 09/10/2026. Modelo de uso geral: revise com assessoria jurídica antes de campanhas em larga escala.</p>' +
      '<h2>Quem somos</h2><p>O Escala 5x2 Inteligente é operado por Jair Pimenta de Souza (“controlador”). Contato para privacidade: <a href="mailto:' + esc(contactMail()) + '">' + esc(contactMail()) + '</a>.</p>' +
      '<h2>Dados que tratamos</h2><ul><li><b>Cadastro:</b> nome, e-mail e senha (armazenada com hash, nunca em texto).</li><li><b>Dados que você informa na ferramenta:</b> nomes de empresas, equipes, quantidades de pessoas, salários médios, escalas e, se quiser, nomes de colaboradores.</li><li><b>Pedidos de contato (leads):</b> nome, e-mail, telefone, empresa e mensagem que você enviar pelo formulário, com o seu consentimento.</li><li><b>Pagamento:</b> a cobrança é feita pela Kiwify; recebemos apenas e-mail, produto e status da assinatura, sem dados de cartão.</li><li><b>Técnicos:</b> registro pseudonimizado do endereço de rede (hash) apenas para limitar abusos no formulário.</li></ul>' +
      '<h2>Para que usamos</h2><p>Prestar o serviço contratado, salvar seus cálculos e escalas, liberar o plano pago, responder pedidos de contato e proteger a plataforma. Não vendemos dados.</p>' +
      '<h2>Base legal</h2><p>Execução de contrato (conta e planos), consentimento (formulário de contato) e legítimo interesse (segurança e prevenção a fraudes), nos termos da LGPD (Lei 13.709/2018).</p>' +
      '<h2>Compartilhamento</h2><p>Usamos provedores de infraestrutura (banco de dados e autenticação Supabase, hospedagem GitHub Pages) e de pagamento (Kiwify) como operadores, somente para prestar o serviço.</p>' +
      '<h2>Seus direitos</h2><p>Você pode pedir acesso, correção, portabilidade, anonimização ou exclusão dos seus dados, e revogar consentimentos, escrevendo para o e-mail acima. A calculadora pública não envia dados ao servidor: eles ficam no seu navegador.</p>' +
      '<h2>Retenção</h2><p>Mantemos os dados enquanto a conta existir. Após pedido de exclusão, removemos os dados da conta, salvo o que a lei exigir guardar.</p></div>');
  };
  V.terms = function () {
    view('<div class="legal"><h1>Termos de uso</h1><p class="muted small">Versão de 09/10/2026. Modelo de uso geral: revise com assessoria jurídica.</p>' +
      '<h2>O serviço</h2><p>O Escala 5x2 Inteligente é uma ferramenta online de planejamento operacional que estima custos de transição de jornada e gera escalas de trabalho a partir dos dados informados pelo usuário.</p>' +
      '<h2>Natureza das estimativas</h2><p>Os resultados são estimativas para planejamento. Não constituem aconselhamento jurídico, contábil ou trabalhista, nem cálculo de folha de pagamento. Encargos, convenções coletivas, intervalos, descansos e a redação final da PEC devem ser verificados pelo usuário com seus assessores antes de qualquer decisão ou publicação de escala.</p>' +
      '<h2>Conta e planos</h2><p>O teste de 14 dias do plano Gestor é concedido uma vez por e-mail. As assinaturas pagas são mensais, processadas pela Kiwify, e podem ser canceladas a qualquer momento; o acesso permanece até o fim do período pago. Limites de cada plano estão descritos na página de planos e podem ser atualizados com aviso prévio.</p>' +
      '<h2>Responsabilidades do usuário</h2><p>Manter a confidencialidade da senha, informar dados verdadeiros e usar a ferramenta de forma lícita. Ao incluir nomes de colaboradores, o usuário declara ter base legal para tratar esses dados.</p>' +
      '<h2>Limitação de responsabilidade</h2><p>Na extensão permitida em lei, o operador não responde por decisões tomadas com base nas estimativas, nem por indisponibilidades temporárias. O serviço é fornecido no estado em que se encontra.</p>' +
      '<h2>Contato</h2><p><a href="mailto:' + esc(contactMail()) + '">' + esc(contactMail()) + '</a></p></div>');
  };

  V.notfound = function () { view('<div class="auth"><div class="card stack"><h1 class="h2">Página não encontrada</h1><a class="btn primary" href="#/">Voltar ao início</a></div></div>'); };

  JA.planCards = planCards;
})();
