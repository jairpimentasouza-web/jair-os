// Jair OS — página de autorização e consentimento do OAuth 2.1 Server do Supabase.
// O Supabase Auth redireciona para cá com ?authorization_id=...; o usuário entra,
// revisa o pedido e aprova/nega. Quem emite código e tokens é o próprio Supabase Auth.
(() => {
  "use strict";

  const SUPABASE_URL = "https://zfbcvoaxgswjsgbavobp.supabase.co";
  const AUTH = SUPABASE_URL + "/auth/v1";
  // Chave pública (anon) do projeto: identifica o projeto, não concede acesso por si só.
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmN2b2F4Z3N3anNnYmF2b2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1Njc2MDQsImV4cCI6MjA4MDE0MzYwNH0.LY1G_wIi2xgsyB8D0cyXtjCW3dSm8p0h_x20kiDc5Dc";
  const STORE_KEY = "jos_oauth_consent_session";
  const TRUSTED = [
    { prefix: "https://chatgpt.com/connector_platform_oauth_redirect", label: "ChatGPT (OpenAI)" },
    { prefix: "https://chatgpt.com/connector/oauth/", label: "ChatGPT (OpenAI)" },
    { prefix: "https://claude.ai/api/mcp/auth_callback", label: "Claude (Anthropic)" },
  ];

  const $ = (id) => document.getElementById(id);
  const VIEWS = ["loading", "login", "consent", "done", "error"];
  const show = (name) => { for (const v of VIEWS) $("view-" + v).hidden = v !== name; };
  const fail = (text) => { $("error-text").textContent = text; show("error"); };
  const setMsg = (id, text, isError) => { const el = $(id); el.textContent = text || ""; el.classList.toggle("error", Boolean(isError)); };
  const loginMsg = (text, isError) => setMsg("login-msg", text, isError);
  const consentMsg = (text, isError) => setMsg("consent-msg", text, isError);

  // Nunca dentro de iframe (proteção contra clickjacking na tela de consentimento).
  if (window.top !== window.self) {
    document.body.textContent = "Por segurança, esta página não pode ser aberta dentro de outra página.";
    return;
  }

  const authorizationId = new URLSearchParams(location.search).get("authorization_id") || "";
  if (!/^[A-Za-z0-9._~-]{8,200}$/.test(authorizationId)) {
    fail("Pedido de autorização ausente ou inválido.");
    return;
  }

  // ---------- sessão (só nesta aba) ----------
  let session = null;
  let details = null;
  const nowS = () => Math.floor(Date.now() / 1000);
  function loadSession() {
    try { const s = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null"); if (s && s.access_token) session = s; } catch (_) { /* sem storage */ }
  }
  function saveSession(s) { session = s; try { sessionStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (_) { /* sem storage */ } }
  function clearSession() { session = null; try { sessionStorage.removeItem(STORE_KEY); } catch (_) { /* sem storage */ } }
  function fromTokenResponse(j) {
    return {
      access_token: j.access_token,
      refresh_token: j.refresh_token || "",
      expires_at: Number(j.expires_at) || nowS() + Number(j.expires_in || 3600),
      email: (j.user && j.user.email) || null,
    };
  }
  // Retorno do link mágico (fluxo implícito: tokens no fragmento da URL).
  function consumeHash() {
    if (!location.hash || location.hash.length < 2) return;
    const h = new URLSearchParams(location.hash.slice(1));
    history.replaceState(null, "", location.pathname + location.search);
    if (h.get("error")) { loginMsg("O link de acesso falhou: " + (h.get("error_description") || h.get("error")) + ". Tente de novo.", true); return; }
    const at = h.get("access_token");
    if (at) saveSession({ access_token: at, refresh_token: h.get("refresh_token") || "", expires_at: Number(h.get("expires_at")) || nowS() + Number(h.get("expires_in") || 3600), email: null });
  }

  // ---------- Supabase Auth ----------
  async function api(path, opts) {
    const o = opts || {};
    const headers = { apikey: ANON_KEY };
    if (o.body) headers["content-type"] = "application/json";
    if (o.auth && session) headers.Authorization = "Bearer " + session.access_token;
    try {
      const res = await fetch(AUTH + path, { method: o.body ? "POST" : "GET", headers, body: o.body ? JSON.stringify(o.body) : undefined });
      let data = {};
      try { data = (await res.json()) || {}; } catch (_) { /* corpo vazio */ }
      return { ok: res.ok, status: res.status, data };
    } catch (_) {
      return { ok: false, status: 0, data: { msg: "sem conexão com o Supabase" } };
    }
  }
  const errText = (r) => r.data.error_description || r.data.msg || r.data.message || r.data.error || "erro " + r.status;
  function friendly(r) {
    const t = String(errText(r));
    if (r.status === 404 || /not.?found|expired|expirad|already/i.test(t)) return "Este pedido de autorização expirou ou já foi usado.";
    if (r.status === 0) return "Sem conexão com o Supabase. Verifique a internet e tente de novo.";
    return "O Supabase Auth recusou o pedido: " + t;
  }
  async function ensureFresh() {
    if (!session) return false;
    if (Number(session.expires_at) - 60 > nowS()) return true;
    if (!session.refresh_token) { clearSession(); return false; }
    const r = await api("/token?grant_type=refresh_token", { body: { refresh_token: session.refresh_token } });
    if (!r.ok || !r.data.access_token) { clearSession(); return false; }
    saveSession(fromTokenResponse(r.data));
    return true;
  }
  async function needLogin(text) {
    clearSession();
    show("login");
    if (text) loginMsg(text, true);
    $("email").focus();
  }

  // ---------- fluxo ----------
  async function loadDetails() {
    show("loading");
    $("loading-text").textContent = "Carregando o pedido de autorização…";
    const r = await api("/oauth/authorizations/" + encodeURIComponent(authorizationId), { auth: true });
    if (r.status === 401) { await needLogin("Sua sessão expirou. Entre de novo."); return; }
    if (!r.ok) { fail(friendly(r)); return; }
    const d = r.data;
    if (d.redirect_url && !d.authorization_id) {
      // Consentimento já dado antes para este aplicativo: o Supabase devolve direto o retorno.
      go(d.redirect_url, "Acesso já autorizado", "Este aplicativo já tinha sua autorização. Voltando a ele…");
      return;
    }
    details = d;
    await renderConsent(d);
  }

  function trustOf(uri) { return TRUSTED.find((t) => typeof uri === "string" && uri.startsWith(t.prefix)) || null; }

  async function renderConsent(d) {
    const c = d.client || {};
    const name = c.name || c.client_name || "Aplicativo sem nome";
    $("client-name").textContent = name;
    const extra = [c.client_id, c.uri || c.client_uri].filter(Boolean).join(" · ");
    $("client-detail").textContent = extra ? name + " · " + extra : name;
    $("redirect-uri").textContent = d.redirect_uri || "—";
    const scopes = String(d.scope || "").trim();
    $("scopes").textContent = scopes ? scopes.split(/\s+/).join(", ") : "acesso básico à conta";
    const t = trustOf(d.redirect_uri);
    const trust = $("trust");
    if (t) {
      trust.className = "trust ok";
      trust.textContent = "Destino verificado: " + t.label + ".";
    } else {
      trust.className = "trust warn";
      trust.textContent = "Atenção: o endereço de retorno não é de um aplicativo conhecido. Só aprove se foi você quem iniciou esta conexão agora.";
    }
    let email = (d.user && d.user.email) || session.email;
    if (!email) {
      const u = await api("/user", { auth: true });
      if (u.ok && u.data.email) { email = u.data.email; session.email = email; saveSession(session); }
    }
    $("user-email").textContent = email || "—";
    consentMsg("");
    show("consent");
    $("btn-approve").focus();
  }

  function go(url, title, text) {
    let u;
    try { u = new URL(url); } catch (_) { fail("O Supabase devolveu um endereço de retorno inválido."); return; }
    const local = u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
    if (u.protocol !== "https:" && !local) { fail("Endereço de retorno não seguro: " + u.origin); return; }
    if (details && details.redirect_uri) {
      let expected = null;
      try { expected = new URL(details.redirect_uri).origin; } catch (_) { /* ignora */ }
      if (expected && expected !== u.origin) { fail("O endereço de retorno não confere com o aplicativo que pediu acesso."); return; }
    }
    $("done-title").textContent = title;
    $("done-text").textContent = text;
    show("done");
    window.location.assign(u.toString());
  }

  function setBusy(busy) { for (const id of ["btn-approve", "btn-deny", "btn-switch"]) $(id).disabled = busy; }

  async function decide(action) {
    setBusy(true);
    consentMsg(action === "approve" ? "Aprovando…" : "Negando…");
    if (!(await ensureFresh())) { setBusy(false); await needLogin("Sua sessão expirou. Entre de novo."); return; }
    const r = await api("/oauth/authorizations/" + encodeURIComponent(authorizationId) + "/consent", { auth: true, body: { action } });
    if (!r.ok || !r.data.redirect_url) { setBusy(false); consentMsg(friendly(r), true); return; }
    if (action === "approve") go(r.data.redirect_url, "Acesso aprovado", "Tudo certo. Voltando ao aplicativo…");
    else go(r.data.redirect_url, "Acesso negado", "Nada foi liberado. Voltando ao aplicativo…");
  }

  // ---------- eventos ----------
  $("login-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const email = $("email").value.trim();
    const password = $("password").value;
    if (!email || !password) { loginMsg("Informe e-mail e senha.", true); return; }
    $("btn-login").disabled = true;
    loginMsg("Entrando…");
    const r = await api("/token?grant_type=password", { body: { email, password } });
    $("password").value = "";
    $("btn-login").disabled = false;
    if (!r.ok || !r.data.access_token) {
      loginMsg(r.status === 400 ? "E-mail ou senha incorretos." : "Falha no login: " + errText(r), true);
      return;
    }
    saveSession(fromTokenResponse(r.data));
    loginMsg("");
    await loadDetails();
  });

  $("btn-magic").addEventListener("click", async () => {
    const email = $("email").value.trim();
    if (!email) { loginMsg("Digite seu e-mail acima e toque de novo.", true); $("email").focus(); return; }
    $("btn-magic").disabled = true;
    const back = location.origin + location.pathname + "?authorization_id=" + encodeURIComponent(authorizationId);
    const r = await api("/otp?redirect_to=" + encodeURIComponent(back), { body: { email, create_user: false } });
    $("btn-magic").disabled = false;
    if (r.ok) loginMsg("Se esse e-mail tiver conta, enviamos um link. Abra-o neste mesmo navegador.");
    else loginMsg("Não foi possível enviar o link: " + errText(r), true);
  });

  $("btn-approve").addEventListener("click", () => decide("approve"));
  $("btn-deny").addEventListener("click", () => decide("deny"));
  $("btn-switch").addEventListener("click", () => needLogin(""));

  // ---------- início ----------
  (async () => {
    loadSession();
    consumeHash();
    if (await ensureFresh()) await loadDetails();
    else { show("login"); $("email").focus(); }
  })();
})();
