/* Escala 5x2 Inteligente — inicialização, ciclo de autenticação e despacho de rotas. */
(function () {
  'use strict';
  var JA = window.JA, A = JA.A, V = JA.views, $ = JA.$, esc = JA.esc;

  /* Links de e-mail do Supabase chegam com #access_token=...&type=recovery|signup */
  var H0 = location.hash || '';
  A.recovery = /type=recovery/.test(H0);
  A.fromLink = /access_token=|error_description=/.test(H0);
  A.linkError = (H0.match(/error_description=([^&]+)/) || [])[1] || null;

  JA.loadPublicData = function () {
    return Promise.all([
      A.sb.from('e5_plans').select('key,name,price_month,max_people,max_teams,max_companies,max_schedules,checkout_url,features,sort,active').eq('active', true).order('sort'),
      A.sb.from('e5_settings').select('key,value')
    ]).then(function (r) {
      if (!r[0].error && r[0].data) A.plans = r[0].data;
      if (!r[1].error && r[1].data) { var s = {}; r[1].data.forEach(function (x) { s[x.key] = x.value; }); A.settings = s; }
    }).catch(function () {});
  };

  JA.afterLogin = function () {
    return JA.rpc('e5_accept_invites').catch(function () {})
      .then(function () { return JA.rpc('e5_claim_admin').catch(function () {}); })
      .then(function () { return JA.refreshAll(); });
  };

  JA.logout = function () {
    var done = function () {
      A.session = null; A.overview = null; A.wsId = null; A.companies = []; A.companyId = null; A.shellKey = null;
      JA.renderChrome(); JA.go('');
    };
    (JA.flushSync ? JA.flushSync() : Promise.resolve()).catch(function () {}).then(function () { return A.sb.auth.signOut(); }).then(done, done);
  };

  var PUBLIC = { '': 'landing', calculadora: 'calc', entrar: 'login', cadastro: 'signup', recuperar: 'recover', 'nova-senha': 'newpass', privacidade: 'privacy', termos: 'terms' };

  JA.render = function () {
    if (!A.ready) return;
    var r = JA.parseRoute(), head = r.parts[0] || '', view;
    document.title = 'Escala 5x2 Inteligente';
    if (head !== 'app' && JA.flushSync) JA.flushSync();
    if (head !== 'app' && head !== 'calculadora' && JA.Calc && JA.Calc.state()) JA.Calc.unmount();
    if (head !== 'app') A.shellKey = null;
    JA.renderChrome();
    try {
      if (head === 'app' || head === 'admin') {
        if (!A.session) { location.hash = '#/entrar?next=' + encodeURIComponent(r.parts.join('/')); return; }
        if (!A.overview) { $('#view').innerHTML = '<div class="auth"><p class="muted">Carregando...</p></div>'; JA.afterLogin().then(JA.render, function (e) { $('#view').innerHTML = '<div class="auth"><div class="alert bad">' + esc(JA.errMsg(e)) + ' <button class="btn" type="button" data-reload>Recarregar</button></div></div>'; $('[data-reload]').addEventListener('click', function () { location.reload(); }); }); return; }
        if (head === 'app') return V.app(r.parts[1] || 'impacto');
        return V.admin(r.parts[1] || 'resumo');
      }
      if (head === 'nova-senha' && !A.session) return V.recover();
      view = PUBLIC[head];
      if (!view) return V.notfound();
      V[view](r.q);
    } catch (e) {
      console.error(e);
      $('#view').innerHTML = '<div class="auth"><div class="alert bad">Ocorreu um erro ao abrir esta tela. <a href="#/">Voltar ao início</a></div></div>';
    }
  };

  function boot() {
    JA.initClient();
    var sb = A.sb;
    Promise.all([JA.loadPublicData(), sb.auth.getSession()]).then(function (r) {
      A.session = (r[1] && r[1].data && r[1].data.session) || null;
      return A.session ? JA.afterLogin().catch(function () {}) : null;
    }).then(function () {
      A.ready = true;
      if (A.session) {
        if (A.recovery) JA.go('nova-senha');
        else if (A.fromLink && !A.linkError && !JA.parseRoute().parts.length) JA.go('app');
      } else if (A.linkError) {
        JA.go('entrar');
      }
      JA.render();
      if (A.linkError) JA.toast('O link expirou ou é inválido. Peça um novo.', 'bad');
      sb.auth.onAuthStateChange(function (ev, session) {
        if (ev === 'INITIAL_SESSION') return;
        if (ev === 'TOKEN_REFRESHED' || ev === 'USER_UPDATED') { A.session = session || A.session; return; }
        if (ev === 'SIGNED_OUT') {
          if (A.session) { A.session = null; A.overview = null; setTimeout(function () { JA.renderChrome(); if (/^#\/(app|admin)/.test(location.hash)) JA.go('entrar'); }, 0); }
          return;
        }
        if (ev === 'PASSWORD_RECOVERY') { A.session = session; setTimeout(function () { JA.go('nova-senha'); }, 0); return; }
        if (ev === 'SIGNED_IN') {
          var changed = !A.session || !session || A.session.user.id !== session.user.id;
          A.session = session;
          if (!changed) return;
          /* não chamar o Supabase dentro do callback: adia para fora */
          setTimeout(function () {
            JA.afterLogin().catch(function () {}).then(function () {
              var next = A.nextAfterLogin; A.nextAfterLogin = null;
              var q = JA.parseRoute().q, route = JA.parseRoute().parts[0] || '';
              if (next) JA.go(next.replace(/^\/+/, ''));
              else if (q.next) JA.go(q.next);
              else if (['entrar', 'cadastro', ''].indexOf(route) >= 0 && route !== '') JA.go('app');
              else JA.render();
            });
          }, 0);
        }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
