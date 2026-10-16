/* Escala 5x2 Inteligente — núcleo: configuração, utilitários, roteador e camada de dados. */
(function () {
  'use strict';
  var JA = window.JA = window.JA || {};
  var C = window.__E5_CFG__ || {};
  JA.CFG = {
    url: C.url || 'https://zfbcvoaxgswjsgbavobp.supabase.co',
    anon: C.anon || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmN2b2F4Z3N3anNnYmF2b2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Njc2MDQsImV4cCI6MjA4MDE0MzYwNH0.LY1G_wIi2xgsyB8D0cyXtjCW3dSm8p0h_x20kiDc5Dc',
    webhook: 'https://zfbcvoaxgswjsgbavobp.supabase.co/functions/v1/jair-os-public/e5-kiwify'
  };

  /* ---------- Utilitários ---------- */
  JA.$ = function (s, r) { return (r || document).querySelector(s); };
  JA.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  JA.esc = function (t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  JA.num = function (v, d) { var x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : d; };
  JA.brl = function (v) { return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); };
  JA.brl2 = function (v) { return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  JA.dt = function (s) { if (!s) return '-'; var d = new Date(s); return isNaN(d) ? '-' : d.toLocaleDateString('pt-BR'); };
  JA.dtt = function (s) { if (!s) return '-'; var d = new Date(s); return isNaN(d) ? '-' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); };
  JA.validEmail = function (e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || '').trim()); };

  JA.toast = function (msg, kind) {
    var t = JA.$('#toast'); if (!t) return;
    t.textContent = msg; t.hidden = false; t.className = 'toast' + (kind ? ' ' + kind : '');
    clearTimeout(JA.toast.h); JA.toast.h = setTimeout(function () { t.hidden = true; }, kind === 'bad' ? 5200 : 2400);
  };
  JA.copy = function (texto, msg) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta); JA.toast(ok ? msg : 'Selecione o texto e copie manualmente');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(function () { JA.toast(msg); }, fallback);
    else fallback();
  };

  var ERR = [
    [/LIMIT_COMPANIES/, 'Seu plano atingiu o limite de empresas. Veja os planos para ampliar.'],
    [/LIMIT_TEAMS/, 'Seu plano atingiu o limite de equipes. Veja os planos para ampliar.'],
    [/LIMIT_PEOPLE/, 'Seu plano atingiu o limite de pessoas. Veja os planos para ampliar.'],
    [/LIMIT_SCHEDULES/, 'Seu plano atingiu o limite de escalas salvas. Apague uma antiga ou veja os planos.'],
    [/LIMIT_MEMBERS/, 'Seu plano atingiu o limite de usuários. Veja os planos para convidar mais pessoas.'],
    [/LIMIT_WORKSPACES/, 'Você já tem o número máximo de contas de empresa.'],
    [/RATE_LIMIT/, 'Muitas tentativas em pouco tempo. Tente novamente em alguns minutos.'],
    [/FORBIDDEN/, 'Você não tem permissão para esta ação.'],
    [/CONSENT_REQUIRED/, 'Marque a autorização de contato para enviar.'],
    [/INVALID_EMAIL/, 'E-mail inválido.'],
    [/INVALID_NAME/, 'Informe um nome válido.'],
    [/CANNOT_REMOVE_OWNER|CANNOT_CHANGE_OWNER/, 'O proprietário da conta não pode ser alterado.'],
    [/Invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/Email not confirmed/i, 'Confirme seu e-mail antes de entrar. Veja a caixa de entrada e o spam.'],
    [/User already registered/i, 'Este e-mail já tem cadastro. Entre ou recupere a senha.'],
    [/at least \d+ characters|weak.?password/i, 'A senha precisa ter pelo menos 8 caracteres.'],
    [/rate limit|too many requests|over_email_send_rate_limit/i, 'Limite de envios de e-mail atingido. Aguarde alguns minutos e tente de novo.'],
    [/Failed to fetch|NetworkError|network/i, 'Sem conexão com o servidor. Verifique a internet e tente de novo.'],
    [/JWT|not authenticated|AUTH_REQUIRED/i, 'Sua sessão expirou. Entre novamente.']
  ];
  JA.errMsg = function (e) {
    var m = (e && (e.message || e.error_description || e.msg)) || String(e || '');
    for (var i = 0; i < ERR.length; i++) if (ERR[i][0].test(m)) return ERR[i][1];
    return 'Algo deu errado. Tente novamente. (' + m.slice(0, 120) + ')';
  };
  JA.isLimit = function (e) { return /LIMIT_/.test((e && e.message) || ''); };

  /* ---------- Estado global ---------- */
  JA.A = { sb: null, session: null, overview: null, wsId: null, companies: [], companyId: null, plans: [], settings: {}, ready: false };

  /* ---------- Cliente Supabase ---------- */
  JA.initClient = function () {
    JA.A.sb = window.supabase.createClient(JA.CFG.url, JA.CFG.anon, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'e5.auth' }
    });
    return JA.A.sb;
  };
  /* Executa uma chamada do Supabase e lança erro legível se falhar. */
  JA.q = function (p) {
    return Promise.resolve(p).then(function (r) {
      if (r && r.error) { var e = new Error(r.error.message || 'erro'); e.code = r.error.code; throw e; }
      return r ? r.data : null;
    });
  };
  JA.rpc = function (name, args) { return JA.q(JA.A.sb.rpc(name, args || {})); };

  /* ---------- Roteador por hash ---------- */
  JA.parseRoute = function () {
    var h = location.hash || '';
    if (h.indexOf('#/') !== 0) return { parts: [], q: {} };
    var s = h.slice(2), qi = s.indexOf('?'), q = {};
    if (qi >= 0) {
      s.slice(qi + 1).split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
      s = s.slice(0, qi);
    }
    return { parts: s.split('/').filter(Boolean), q: q };
  };
  JA.go = function (path) {
    if (location.hash === '#/' + path) JA.render(); else location.hash = '#/' + path;
  };
  window.addEventListener('hashchange', function () { if (JA.render) JA.render(); });

  /* ---------- Plano do workspace atual ---------- */
  JA.ws = function () {
    var o = JA.A.overview; if (!o) return null;
    for (var i = 0; i < o.workspaces.length; i++) if (o.workspaces[i].id === JA.A.wsId) return o.workspaces[i];
    return o.workspaces[0] || null;
  };
  JA.canEdit = function () { var w = JA.ws(); return !!w && (w.role === 'owner' || w.role === 'admin' || w.role === 'editor'); };
  JA.canAdmin = function () { var w = JA.ws(); return !!w && (w.role === 'owner' || w.role === 'admin'); };
  JA.planName = function (key) {
    for (var i = 0; i < JA.A.plans.length; i++) if (JA.A.plans[i].key === key) return JA.A.plans[i].name;
    return key;
  };
  JA.contactLink = function (msg) {
    var s = JA.A.settings || {}, wa = String(s.contact_whatsapp || '').replace(/\D/g, '');
    if (wa) return 'https://wa.me/' + (wa.length <= 11 ? '55' + wa : wa) + '?text=' + encodeURIComponent(msg);
    if (s.contact_email) return 'mailto:' + s.contact_email + '?subject=' + encodeURIComponent('Escala 5x2 Inteligente') + '&body=' + encodeURIComponent(msg);
    return null;
  };
})();
