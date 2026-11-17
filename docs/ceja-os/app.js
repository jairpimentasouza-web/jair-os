(function() {
  "use strict";
  if (window.top !== window.self) {
    document.getElementById("app").textContent = "Por segurança, o CEJA OS só abre diretamente no navegador, não dentro de outra página.";
    try {
      window.top.location.replace(window.location.href);
    } catch {
    }
    throw new Error("CEJA OS embutido em outra página: execução interrompida");
  }
  const CFG = window.CEJA_CONFIG || {};
  const Motor = window.CejaMotor;
  const app = document.getElementById("app");
  const LOGO = CFG.logo || "marca/ceja-logo.png";
  const CHAVE_LEMBRAR = "ceja-os:lembrar";
  const CHAVE_ULTIMA_ESCOLA = "ceja-os:ultima-escola";
  function lerLocal(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  }
  function gravarLocal(k, v) {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
    }
  }
  const lembrar = () => lerLocal(CHAVE_LEMBRAR) === "1";
  const armazenamentoSessao = {
    getItem(k) {
      try {
        return (lembrar() ? window.localStorage : window.sessionStorage).getItem(k);
      } catch {
        return null;
      }
    },
    setItem(k, v) {
      try {
        (lembrar() ? window.localStorage : window.sessionStorage).setItem(k, v);
      } catch {
      }
    },
    removeItem(k) {
      try {
        window.localStorage.removeItem(k);
        window.sessionStorage.removeItem(k);
      } catch {
      }
    }
  };
  const sb = window.supabase.createClient(CFG.url, CFG.chavePublica, {
    auth: { storage: armazenamentoSessao, storageKey: "ceja-os-sessao", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    global: { headers: { "x-client-info": "ceja-os-web" } }
  });
  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  const DIAS = ["", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"];
  const DIAS_CURTOS = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const ehData = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
  const ehHora = (s) => /^\d{2}:\d{2}$/.test(s || "");
  function fmtData(d) {
    if (!d) return "—";
    const [a, m, dia] = String(d).slice(0, 10).split("-");
    return `${dia}/${m}/${a}`;
  }
  function fmtDataHora(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  const fmtHora = (h) => h ? String(h).slice(0, 5) : "";
  function diaSemana(d) {
    const [a, m, dia] = d.split("-").map(Number);
    const w = new Date(Date.UTC(a, m - 1, dia)).getUTCDay();
    return w === 0 ? 7 : w;
  }
  function somarDias(d, n) {
    const [a, m, dia] = d.split("-").map(Number);
    const x = new Date(Date.UTC(a, m - 1, dia + n));
    return x.toISOString().slice(0, 10);
  }
  const fmtLonga = (d) => `${DIAS[diaSemana(d)]}, ${fmtData(d)}`;
  function fmtNota(v) {
    if (v === null || v === void 0 || v === "") return "";
    const n = Number(v);
    if (!Number.isFinite(n)) return "";
    return n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  }
  const fmtPct = (v) => v === null || v === void 0 ? "—" : `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  const NOMES_PAPEL = { professor: "Professor(a)", coordenador: "Coordenação", diretor: "Direção" };
  const ROTULO_FREQ = { P: "Presente", F: "Falta", A: "Atraso", J: "Falta justificada" };
  const SEGMENTOS = { EI: "Educação Infantil", EF1: "Ensino Fundamental I", EF2: "Ensino Fundamental II", EM: "Ensino Médio", EJA: "EJA", TEC: "Técnico" };
  const TURNOS = { manha: "Manhã", tarde: "Tarde", noite: "Noite", integral: "Integral" };
  const porId = (lista, id) => lista.find((x) => x.id === id);
  const agrupar = (lista, f) => lista.reduce((m, x) => (m.get(f(x)) ? m.get(f(x)).push(x) : m.set(f(x), [x]), m), /* @__PURE__ */ new Map());
  const ordenarPor = (lista, f) => [...lista].sort((a, b) => String(f(a)).localeCompare(String(f(b)), "pt-BR", { numeric: true }));
  class ErroUsuario extends Error {
    constructor(mensagem, codigo, detalhe) {
      super(mensagem);
      this.codigo = codigo;
      this.detalhe = detalhe;
    }
  }
  function traduzirErro(e) {
    if (!e) return new ErroUsuario("Erro desconhecido.");
    if (e instanceof ErroUsuario) return e;
    const msg = String(e.message || e.error_description || e.msg || e);
    const m = msg.match(/^([A-Z_]{4,}):\s*(.*)$/s);
    if (m) return new ErroUsuario(m[2] || m[1], m[1], e.details);
    if (/permission denied|row-level security/i.test(msg)) return new ErroUsuario("Você não tem permissão para esta ação.", "SEM_PERMISSAO");
    if (/JWT|session|token/i.test(msg)) return new ErroUsuario("Sua sessão terminou. Entre novamente.", "SESSAO");
    if (/Failed to fetch|NetworkError|network/i.test(msg)) return new ErroUsuario("Sem conexão com o servidor. Verifique a internet e tente de novo.", "REDE");
    if (/duplicate key/i.test(msg)) return new ErroUsuario("Já existe um registro com estes dados.", "DUPLICADO");
    if (/violates check constraint|invalid input/i.test(msg)) return new ErroUsuario("Dados fora do formato permitido.", "DADOS_INVALIDOS");
    if (/foreign key/i.test(msg)) return new ErroUsuario("Este registro está em uso e não pode ser removido.", "EM_USO");
    return new ErroUsuario(msg.slice(0, 300));
  }
  async function q(promessa) {
    const { data, error, count } = await promessa;
    if (error) throw traduzirErro(error);
    return count !== void 0 && count !== null && data === null ? count : data;
  }
  const rpc = (fn, args) => q(sb.rpc(fn, args || {}));
  async function acessos(acao, dados2) {
    const { data } = await sb.auth.getSession();
    let r;
    try {
      r = await fetch(`${CFG.url}/functions/v1/acessos`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: CFG.chavePublica, ...data.session ? { authorization: `Bearer ${data.session.access_token}` } : {} },
        body: JSON.stringify({ acao, ...dados2 || {} })
      });
    } catch {
      throw new ErroUsuario("Sem conexão com o servidor. Verifique a internet e tente de novo.", "REDE");
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new ErroUsuario(j.mensagem || "Não foi possível concluir a operação.", j.codigo);
    return j;
  }
  const S = {
    ctx: null,
    // meu_contexto
    base: null,
    // períodos, segmentos, disciplinas, calendário (por escola)
    tds: null,
    // vínculos visíveis
    aviso: null
  };
  const papeis = () => S.ctx && S.ctx.papeis || [];
  const tem = (...p) => p.some((x) => papeis().includes(x));
  const gestor = () => tem("coordenador", "diretor");
  const hoje = () => S.ctx && S.ctx.hoje || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  function invalidar(...chaves) {
    for (const k of chaves.length ? chaves : ["base", "tds"]) S[k] = null;
  }
  async function base() {
    if (S.base) return S.base;
    const [periodos, segmentos, disciplinas, calendario] = await Promise.all([
      q(sb.from("periodos").select("*").order("ano").order("ordem")),
      q(sb.from("segmentos").select("*").order("ordem")),
      q(sb.from("disciplinas").select("*").order("nome")),
      q(sb.from("calendario").select("data, tipo, descricao").order("data"))
    ]);
    S.base = { periodos, segmentos, disciplinas, calendario, semAula: new Set(calendario.filter((c) => c.tipo !== "evento").map((c) => c.data)) };
    return S.base;
  }
  async function tds() {
    if (S.tds) return S.tds;
    const r = await q(sb.from("turma_disciplinas").select("id, turma_id, disciplina_id, professor_id, ativo, turmas(id, codigo, serie, segmento, ano, turno), disciplinas(id, nome, sigla), perfis(nome)"));
    S.tds = ordenarPor(r, (x) => `${x.turmas?.codigo} ${x.disciplinas?.nome}`);
    return S.tds;
  }
  const leciona = (td) => td && td.professor_id === S.ctx.usuario_id && tem("professor");
  const rotuloTd = (td) => td ? `${td.turmas?.codigo ?? "?"} · ${td.disciplinas?.nome ?? "?"}` : "—";
  function periodoDaData(b, d) {
    return b.periodos.find((p) => p.inicio <= d && d <= p.fim) || null;
  }
  function periodoAtual(b) {
    const h = hoje();
    return periodoDaData(b, h) || [...b.periodos].reverse().find((p) => p.inicio <= h) || b.periodos[0] || null;
  }
  function regraVigente(regras, segmento, data) {
    const ok = regras.filter((r) => r.status === "aprovada" && (r.segmento === null || r.segmento === segmento) && r.vigencia_inicio <= data && (!r.vigencia_fim || r.vigencia_fim >= data));
    ok.sort((a, b) => (a.segmento === null) - (b.segmento === null) || b.versao - a.versao);
    return ok[0] || null;
  }
  const vigenteNa = (m, d) => m.status !== "cancelada" && m.inicio <= d && (!m.fim || m.fim >= d);
  function rota() {
    const h = location.hash.replace(/^#/, "") || "/";
    const [caminho, busca] = h.split("?");
    return { partes: caminho.split("/").filter(Boolean), q: new URLSearchParams(busca || "") };
  }
  function ir(h) {
    if (location.hash === h) render();
    else location.hash = h;
  }
  function marca(t = 46, cls = "") {
    return `<img src="${LOGO}" width="${t}" height="${t}" alt="Logomarca do Centro de Ensino de Jacarepaguá (CEJA)" class="logo ${cls}">`;
  }
  const etq = (cor, t) => `<span class="etiqueta ${cor}">${esc(t)}</span>`;
  const aviso = (tipo, html) => `<div class="aviso ${tipo}" role="${tipo === "erro" ? "alert" : "status"}">${html}</div>`;
  const opcoes = (lista, sel) => lista.map(([v, r]) => `<option value="${esc(v)}" ${String(v) === String(sel ?? "") ? "selected" : ""}>${esc(r)}</option>`).join("");
  const carregando = (t = "Carregando…") => `<p class="muted carregando" role="status">${esc(t)}</p>`;
  function itensMenu() {
    const it = [];
    const add = (h, r) => !it.some((x) => x[0] === h) && it.push([h, r]);
    if (S.ctx.plataforma) {
      add("plataforma", "Escolas");
      add("conta", "Minha conta");
      return it;
    }
    if (tem("diretor")) add("painel", "Painel da direção");
    else if (tem("coordenador")) add("painel", "Painel da coordenação");
    if (tem("professor")) add("professor", "Minhas aulas");
    if (gestor()) {
      add("turmas", "Turmas e diários");
      add("avaliacoes", "Avaliações");
      add("estudantes", "Estudantes");
      add("periodos", "Períodos");
      add("regras", "Regras de avaliação");
    }
    add("provas", "Provas");
    add("retificacoes", "Retificações");
    if (tem("diretor")) {
      add("equipe", "Equipe e acessos");
      add("seguranca", "Backup e segurança");
      add("auditoria", "Auditoria");
    }
    add("conta", "Minha conta");
    return it;
  }
  function nomeEscola() {
    return S.ctx?.escola?.nome || (S.ctx?.plataforma ? "Administração da plataforma" : "");
  }
  function faixa() {
    if (!S.ctx?.escola?.demonstracao) return "";
    return `<div class="faixa-ambiente" role="note">Escola de demonstração — dados 100% fictícios — data de referência ${esc(fmtData(S.ctx.hoje))}</div>`;
  }
  function shell(conteudo, ativo) {
    const pap = S.ctx.plataforma ? "Plataforma" : papeis().map((p) => NOMES_PAPEL[p]).join(" · ");
    return `${faixa()}<a href="#conteudo" class="pular-conteudo">Pular para o conteúdo</a>
<header class="topo"><div class="topo-interno">
  <a href="#/" class="marca-link" aria-label="CEJA OS — início">${marca(46, "marca-img")}
    <span class="titulo-app"><strong>CEJA OS — Gestão Acadêmica</strong><span>${esc(nomeEscola())}</span></span></a>
  <div class="usuario"><div><span class="nome-usuario">${esc(S.ctx.nome)}</span><small>${esc(pap)}</small></div>
  <button type="button" class="btn pequeno btn-sair" data-acao="sair">Sair</button></div>
</div></header>
<nav class="navegacao" aria-label="Menu principal"><ul>${itensMenu().map(([h, r]) => `<li><a href="#/${h}" ${ativo === h ? 'aria-current="page"' : ""}>${esc(r)}</a></li>`).join("")}</ul></nav>
<main class="conteudo" id="conteudo">${S.aviso ? aviso(S.aviso.tipo, esc(S.aviso.texto)) : ""}${conteudo}</main>
<footer class="rodape">CEJA OS · ${esc(nomeEscola())} · Dados pessoais protegidos conforme a LGPD · Acesso registrado em auditoria</footer>`;
  }
  function caixaAcesso(titulo, sub, corpo, largo) {
    return `<main class="pagina-acesso"><div class="caixa-acesso ${largo ? "largo" : ""}">
  <div class="marca">${marca(96)}<div><h1>CEJA OS — Gestão Acadêmica</h1><p class="sub">Diário eletrônico, frequência e notas</p></div></div>
  <h2 class="titulo-acesso">${esc(titulo)}</h2>${sub ? `<p class="muted pequeno">${sub}</p>` : ""}${corpo}</div></main>`;
  }
  function cabecalho(titulo, sub, acoes2 = "") {
    return `<div class="cabecalho-pagina"><div><h1>${esc(titulo)}</h1>${sub ? `<p class="sub">${sub}</p>` : ""}</div>${acoes2 ? `<div class="acoes">${acoes2}</div>` : ""}</div>`;
  }
  function seletorPeriodo(b, atual, base2) {
    return `<label class="linha seletor-periodo"><span class="rotulo-campo">Período</span><select data-ir-param="${esc(base2)}" data-param="periodo">${opcoes(
      b.periodos.map((p) => [p.id, `${p.nome} ${p.ano} (${p.status})`]),
      atual && atual.id
    )}</select></label>`;
  }
  function cartaoCredencial(c, titulo = "Acesso criado") {
    const site = location.protocol === "file:" || !location.origin || location.origin === "null" ? "arquivo CEJA-OS.html (abrir no navegador)" : location.origin + location.pathname;
    return `<section class="cartao credencial" aria-live="polite"><h2>${esc(titulo)}</h2>
  <p class="pequeno">Entregue estes dados <strong>somente à própria pessoa</strong>. A senha é provisória: no primeiro acesso o sistema exige uma senha pessoal${c.precisaMfa ? " e a configuração do aplicativo autenticador" : ""}.</p>
  <dl class="dados-credencial"><dt>Endereço</dt><dd>${esc(site)}</dd><dt>Código da escola</dt><dd><code>${esc(c.codigo_escola)}</code></dd>
  <dt>Usuário</dt><dd><code>${esc(c.usuario)}</code></dd><dt>Senha provisória</dt><dd><code class="codigo-segredo">${esc(c.senha_provisoria)}</code></dd>${c.nome ? `<dt>Nome</dt><dd>${esc(c.nome)}</dd>` : ""}</dl>
  <div class="linha nao-imprimir"><button type="button" class="btn secundario" data-acao="imprimir-credencial">Imprimir</button>
  <button type="button" class="btn fantasma" data-acao="copiar-credencial" data-texto="${esc(`Endereço: ${site}
Código da escola: ${c.codigo_escola}
Usuário: ${c.usuario}
Senha provisória: ${c.senha_provisoria}`)}">Copiar</button></div>
  <p class="pequeno muted">Esta senha não fica gravada em lugar nenhum e não será mostrada de novo. Se perder, gere uma nova.</p></section>`;
  }
  const emailLogin = (codigo, usuario) => `${codigo}.${usuario}@${CFG.dominioLogin}`;
  let senhaRecente = null;
  let mfaPendente = null;
  function telaLogin(msg) {
    const ultima = lerLocal(CHAVE_ULTIMA_ESCOLA) || "";
    return caixaAcesso(
      "Entrar",
      "",
      `<form data-form="login" novalidate>
      ${msg ? aviso(msg.tipo, esc(msg.texto)) : ""}<div id="msg-login"></div>
      <div class="campo"><label for="f-codigo">Código da escola</label><input id="f-codigo" name="codigo" type="text" autocomplete="organization" autocapitalize="none" spellcheck="false" required value="${esc(ultima)}" placeholder="ex.: ceja-jpa"></div>
      <div class="campo"><label for="f-usuario">Usuário</label><input id="f-usuario" name="usuario" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required placeholder="nome.sobrenome"></div>
      <div class="campo"><label for="f-senha">Senha</label><input id="f-senha" name="senha" type="password" autocomplete="current-password" required></div>
      <label class="checks"><input type="checkbox" name="lembrar" value="1" ${lerLocal(CHAVE_LEMBRAR) === "1" ? "checked" : ""}> Manter conectado neste dispositivo <span class="muted">(não use em computadores compartilhados)</span></label>
      <button class="btn grande largura-total" type="submit">Entrar</button></form>
    <p class="pequeno muted centro-texto mt-2">Acesso individual e intransferível; todas as operações são registradas. Esqueceu a senha? A <strong>direção da escola</strong> gera uma nova senha provisória para você.</p>
    <p class="pequeno centro-texto"><a href="#/recuperar">Administração da plataforma: configuração inicial ou recuperação</a></p>`
    );
  }
  async function enviarLogin(f) {
    const d = Object.fromEntries(new FormData(f).entries());
    const codigo = String(d.codigo || "").trim().toLowerCase();
    const usuario = String(d.usuario || "").trim().toLowerCase();
    const alvo = f.querySelector("#msg-login");
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(codigo) || !/^[a-z0-9]+([._-][a-z0-9]+)*$/.test(usuario) || !d.senha) {
      alvo.innerHTML = aviso("erro", "Preencha o código da escola, o usuário e a senha (sem espaços nem acentos).");
      return;
    }
    gravarLocal(CHAVE_LEMBRAR, d.lembrar ? "1" : null);
    const botao = f.querySelector("button[type=submit]");
    botao.disabled = true;
    botao.textContent = "Entrando…";
    const { error } = await sb.auth.signInWithPassword({ email: emailLogin(codigo, usuario), password: d.senha });
    botao.disabled = false;
    botao.textContent = "Entrar";
    if (error) {
      const m = String(error.message || "");
      alvo.innerHTML = aviso("erro", /banned/i.test(m) ? "Conta desativada. Procure a direção da escola." : /rate|too many/i.test(m) ? "Muitas tentativas. Aguarde alguns minutos e tente novamente." : /fetch|network/i.test(m) ? "Sem conexão com o servidor." : "Código da escola, usuário ou senha incorretos.");
      f.querySelector("#f-senha").value = "";
      return;
    }
    gravarLocal(CHAVE_ULTIMA_ESCOLA, codigo);
    senhaRecente = d.senha;
    S.aviso = null;
    invalidar();
    if (await iniciarSessao()) render();
  }
  async function iniciarSessao() {
    const { data } = await sb.auth.getSession();
    if (!data.session) {
      S.ctx = null;
      app.innerHTML = telaLogin(S.aviso);
      S.aviso = null;
      return false;
    }
    let ctx;
    try {
      ctx = await rpc("meu_contexto");
    } catch (e) {
      app.innerHTML = telaLogin({ tipo: "erro", texto: traduzirErro(e).message });
      return false;
    }
    if (!ctx || ctx.sessao_valida === false) {
      await sb.auth.signOut({ scope: "local" });
      app.innerHTML = telaLogin({ tipo: "alerta", texto: "Sua sessão foi encerrada (senha redefinida, conta alterada ou saída em outro local). Entre novamente." });
      return false;
    }
    if (ctx.sem_perfil) {
      await sb.auth.signOut({ scope: "local" });
      app.innerHTML = telaLogin({ tipo: "erro", texto: "Esta conta não possui perfil de acesso em nenhuma escola." });
      return false;
    }
    if (ctx.ativo === false) {
      await sb.auth.signOut({ scope: "local" });
      app.innerHTML = telaLogin({ tipo: "erro", texto: "Conta desativada. Procure a direção da escola." });
      return false;
    }
    if (ctx.escola && ctx.escola.status !== "ativa") {
      await sb.auth.signOut({ scope: "local" });
      app.innerHTML = telaLogin({ tipo: "erro", texto: "O acesso desta escola está suspenso. Procure a administração da plataforma." });
      return false;
    }
    S.ctx = ctx;
    if (ctx.deve_trocar_senha) {
      app.innerHTML = telaTrocarSenha();
      return false;
    }
    if (ctx.precisa_mfa && ctx.aal !== "aal2") {
      app.innerHTML = await telaMfa();
      return false;
    }
    senhaRecente = null;
    return true;
  }
  function regrasSenha() {
    return "Mínimo de 10 caracteres, com letras e números; não use o seu usuário nem sequências óbvias.";
  }
  function telaTrocarSenha() {
    return caixaAcesso(
      "Defina sua senha pessoal",
      `Olá, <strong>${esc(S.ctx.nome)}</strong>. Você entrou com uma senha provisória. ${regrasSenha()}`,
      `<form data-form="trocar-senha"><div id="msg-trocar"></div>
      ${senhaRecente ? "" : '<div class="campo"><label for="t-atual">Senha provisória (atual)</label><input id="t-atual" name="atual" type="password" autocomplete="current-password" required></div>'}
      <div class="campo"><label for="t-nova">Nova senha</label><input id="t-nova" name="nova" type="password" autocomplete="new-password" minlength="10" maxlength="72" required></div>
      <div class="campo"><label for="t-conf">Repita a nova senha</label><input id="t-conf" name="confirma" type="password" autocomplete="new-password" required></div>
      <button class="btn grande largura-total" type="submit">Salvar senha</button></form>
      <p class="pequeno centro-texto mt-2"><button type="button" class="btn fantasma pequeno" data-acao="sair">Sair</button></p>`
    );
  }
  function validarSenhaLocal(nova, confirma) {
    if (nova !== confirma) return "As senhas digitadas não conferem.";
    if (nova.length < 10) return "A senha deve ter pelo menos 10 caracteres.";
    if (!/[A-Za-zÀ-ÿ]/.test(nova) || !/[0-9]/.test(nova)) return "Use letras e números na senha.";
    return null;
  }
  async function enviarTrocaSenha(f, alvoId = "msg-trocar", depois) {
    const d = Object.fromEntries(new FormData(f).entries());
    const alvo = document.getElementById(alvoId);
    const atual = d.atual || senhaRecente;
    const erro = validarSenhaLocal(d.nova || "", d.confirma || "");
    if (erro) return alvo.innerHTML = aviso("erro", esc(erro));
    if (!atual) return alvo.innerHTML = aviso("erro", "Informe a senha atual.");
    const email = (await sb.auth.getSession()).data.session?.user?.email;
    try {
      await acessos("minha_senha", { atual, nova: d.nova });
    } catch (e) {
      alvo.innerHTML = aviso("erro", esc(e.message));
      return;
    }
    senhaRecente = null;
    f.reset();
    const novo = email ? await sb.auth.signInWithPassword({ email, password: d.nova }) : { error: true };
    S.ctx = null;
    invalidar();
    if (novo.error) {
      S.aviso = { tipo: "sucesso", texto: "Senha alterada. Entre novamente com a nova senha." };
      return iniciarSessao();
    }
    if (depois) return depois();
    S.aviso = { tipo: "sucesso", texto: "Senha pessoal definida com sucesso." };
    if (await iniciarSessao()) render();
  }
  function qrSeguro(u) {
    const i = String(u || "").indexOf(",");
    if (i < 0) return "";
    const corpo = u.slice(i + 1);
    return corpo.includes("<") ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(corpo)}` : u;
  }
  let mfaEmAndamento = null;
  function telaMfa() {
    if (!mfaEmAndamento) mfaEmAndamento = montarTelaMfa().finally(() => mfaEmAndamento = null);
    return mfaEmAndamento;
  }
  async function montarTelaMfa() {
    const { data, error } = await sb.auth.mfa.listFactors();
    if (error) return caixaAcesso("Segundo fator", "", aviso("erro", esc(traduzirErro(error).message)));
    const verificado = (data.totp || []).find((x) => x.status === "verified");
    if (verificado) {
      return caixaAcesso(
        "Confirme o segundo fator",
        "Abra o aplicativo autenticador (Google Authenticator, Microsoft Authenticator, Authy…) e digite o código de 6 dígitos do CEJA OS.",
        `<form data-form="mfa-verificar" data-fator="${esc(verificado.id)}"><div id="msg-mfa"></div>
        <div class="campo"><label for="m-codigo">Código de 6 dígitos</label><input id="m-codigo" name="codigo" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required class="codigo-otp"></div>
        <button class="btn grande largura-total" type="submit">Confirmar</button></form>
        <p class="pequeno muted centro-texto mt-2">Perdeu o celular? Peça à ${S.ctx.plataforma ? "pessoa responsável pela plataforma (chave mestra)" : "direção ou à plataforma"} para redefinir o seu segundo fator.</p>
        <p class="pequeno centro-texto"><button type="button" class="btn fantasma pequeno" data-acao="sair">Sair</button></p>`
      );
    }
    const pendente = mfaPendente && (data.all || []).some((f) => f.id === mfaPendente.factorId && f.status !== "verified");
    if (!pendente) {
      for (const f of data.all || []) if (f.status !== "verified") await sb.auth.mfa.unenroll({ factorId: f.id });
      const e = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `CEJA OS ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 16)}` });
      if (e.error) return caixaAcesso("Segundo fator", "", aviso("erro", esc(traduzirErro(e.error).message)));
      mfaPendente = { factorId: e.data.id, qr: qrSeguro(e.data.totp.qr_code), secret: e.data.totp.secret };
    }
    return caixaAcesso(
      "Configure o segundo fator (obrigatório)",
      "Para proteger os dados dos estudantes, contas de gestão usam um segundo fator. Instale um aplicativo autenticador no celular e leia o QR Code abaixo.",
      `<form data-form="mfa-ativar"><div id="msg-mfa"></div>
      <div class="qr"><img src="${esc(mfaPendente.qr)}" width="200" height="200" alt="QR Code para o aplicativo autenticador"></div>
      <p class="pequeno">Não consegue ler? Digite esta chave no aplicativo: <code class="codigo-segredo">${esc(mfaPendente.secret)}</code></p>
      <div class="campo"><label for="m-codigo">Código de 6 dígitos mostrado no aplicativo</label><input id="m-codigo" name="codigo" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required class="codigo-otp"></div>
      <button class="btn grande largura-total" type="submit">Ativar e continuar</button></form>
      <p class="pequeno centro-texto mt-2"><button type="button" class="btn fantasma pequeno" data-acao="sair">Sair</button></p>`,
      true
    );
  }
  async function verificarMfa(fatorId, codigo, alvo) {
    if (!/^\d{6}$/.test(codigo || "")) return alvo.innerHTML = aviso("erro", "Digite os 6 números do aplicativo.");
    let { error } = await sb.auth.mfa.challengeAndVerify({ factorId: fatorId, code: codigo });
    for (let i = 0; i < 2 && error && error.code === "mfa_ip_address_mismatch"; i++) {
      ({ error } = await sb.auth.mfa.challengeAndVerify({ factorId: fatorId, code: codigo }));
    }
    if (error && error.code === "mfa_ip_address_mismatch") return alvo.innerHTML = aviso("erro", "Sua conexão mudou de endereço durante a confirmação. Tente novamente.");
    if (error) return alvo.innerHTML = aviso("erro", "Código incorreto ou expirado. Confira o horário do celular e tente o código atual.");
    mfaPendente = null;
    invalidar();
    if (await iniciarSessao()) render();
  }
  async function telaConta() {
    const { data } = await sb.auth.mfa.listFactors();
    const fator = (data?.totp || []).find((x) => x.status === "verified");
    const esc_ = S.ctx.escola;
    return shell(
      `${cabecalho("Minha conta", esc(S.ctx.nome))}
    <div class="grade grade-2">
    <section class="cartao"><h2>Dados de acesso</h2><dl class="dados-credencial">
      <dt>Código da escola</dt><dd><code>${esc(esc_ ? esc_.codigo : "plataforma")}</code></dd><dt>Usuário</dt><dd><code>${esc(S.ctx.usuario)}</code></dd>
      <dt>Perfil</dt><dd>${esc(S.ctx.plataforma ? "Administração da plataforma" : papeis().map((p) => NOMES_PAPEL[p]).join(", "))}${S.ctx.escopos?.length ? ` (${esc(S.ctx.escopos.map((s) => SEGMENTOS[s] || s).join(", "))})` : ""}</dd>
      <dt>Escola</dt><dd>${esc(nomeEscola())}</dd></dl></section>
    <section class="cartao"><h2>Segundo fator</h2>
      ${fator ? `<p>${etq("verde", "Ativo")} aplicativo autenticador configurado.</p>` : `<p>${etq("cinza", "Não configurado")}</p>`}
      ${S.ctx.precisa_mfa ? '<p class="pequeno muted">Obrigatório para o seu perfil.</p>' : ""}
      ${!fator ? '<button type="button" class="btn" data-acao="configurar-mfa">Configurar aplicativo autenticador</button>' : ""}
      ${fator && !S.ctx.precisa_mfa ? `<button type="button" class="btn secundario" data-acao="remover-mfa" data-fator="${esc(fator.id)}">Remover segundo fator</button>` : ""}
    </section>
    <section class="cartao"><h2>Trocar senha</h2><p class="pequeno muted">${regrasSenha()}</p>
      <form data-form="minha-senha"><div id="msg-conta"></div>
      <div class="campo"><label for="c-atual">Senha atual</label><input id="c-atual" name="atual" type="password" autocomplete="current-password" required></div>
      <div class="campo"><label for="c-nova">Nova senha</label><input id="c-nova" name="nova" type="password" autocomplete="new-password" minlength="10" maxlength="72" required></div>
      <div class="campo"><label for="c-conf">Repita a nova senha</label><input id="c-conf" name="confirma" type="password" autocomplete="new-password" required></div>
      <button class="btn" type="submit">Alterar senha</button></form></section>
    <section class="cartao"><h2>Sessões</h2><p class="pequeno">Saia de todos os dispositivos onde a sua conta estiver aberta (por exemplo, se esqueceu a sessão aberta em outro computador).</p>
      <button type="button" class="btn secundario" data-acao="sair-todos">Sair de todos os dispositivos</button></section>
    </div>`,
      "conta"
    );
  }
  function telaRecuperar(resultado) {
    return caixaAcesso(
      "Administração da plataforma",
      "Uso exclusivo da pessoa responsável pelo CEJA OS. Exige a <strong>chave mestra</strong> entregue na implantação (guardada fora do sistema).",
      `${resultado || ""}<form data-form="recuperar"><div id="msg-recuperar"></div>
      <div class="campo"><label for="r-chave">Chave mestra</label><input id="r-chave" name="chave" type="password" autocomplete="off" required></div>
      <div class="campo"><label for="r-usuario">Usuário do administrador</label><input id="r-usuario" name="usuario" type="text" value="admin" autocapitalize="none" required></div>
      <div class="linha"><button class="btn" type="submit" name="modo" value="recuperar_admin">Recuperar acesso (nova senha e novo segundo fator)</button>
      <button class="btn secundario" type="submit" name="modo" value="inicializar">Configuração inicial (primeiro administrador)</button></div></form>
      <p class="pequeno mt-2"><a href="#/">← Voltar ao login</a></p>`,
      true
    );
  }
  async function enviarRecuperar(f, ev) {
    const d = Object.fromEntries(new FormData(f).entries());
    const modo = ev.submitter && ev.submitter.value === "inicializar" ? "inicializar" : "recuperar_admin";
    const alvo = f.querySelector("#msg-recuperar");
    try {
      const r = await acessos(modo, { chave: d.chave, usuario: String(d.usuario || "").trim().toLowerCase() });
      app.innerHTML = telaRecuperar(cartaoCredencial({ ...r, precisaMfa: true }, modo === "inicializar" ? "Administrador criado" : "Acesso recuperado"));
    } catch (e) {
      alvo.innerHTML = aviso("erro", esc(e.message));
    }
  }
  async function sair(todos) {
    await sb.auth.signOut({ scope: todos ? "global" : "local" }).catch(() => {
    });
    S.ctx = null;
    invalidar();
    location.hash = "#/";
    app.innerHTML = telaLogin(todos ? { tipo: "sucesso", texto: "Você saiu de todos os dispositivos." } : null);
  }
  let ultimaAtividade = Date.now();
  ["click", "keydown", "touchstart"].forEach((t) => document.addEventListener(t, () => ultimaAtividade = Date.now(), { passive: true }));
  setInterval(async () => {
    const limite = (Number(CFG.inatividadeMinutos) || 30) * 6e4;
    if (S.ctx && Date.now() - ultimaAtividade > limite) {
      await sb.auth.signOut({ scope: "local" }).catch(() => {
      });
      S.ctx = null;
      invalidar();
      app.innerHTML = telaLogin({ tipo: "alerta", texto: "Sessão encerrada por inatividade. Entre novamente." });
    }
  }, 6e4);
  async function todas(montar) {
    const saida = [];
    for (let i = 0; ; i += 1e3) {
      const parte = await q(montar().range(i, i + 999));
      saida.push(...parte);
      if (parte.length < 1e3) return saida;
    }
  }
  async function carregarTd(id) {
    const td = porId(await tds(), id);
    if (!td) throw new ErroUsuario("Turma/disciplina não encontrada ou fora do seu acesso.", "NAO_ENCONTRADO");
    return td;
  }
  async function matriculasDaTurma(turmaId) {
    const r = await todas(() => sb.from("matriculas").select("id, numero, inicio, fim, status, aluno_id, alunos(nome, matricula)").eq("turma_id", turmaId));
    return ordenarPor(r, (m) => `${String(m.numero ?? 999).padStart(4, "0")} ${m.alunos?.nome}`);
  }
  const nomeAluno = (m) => m.alunos?.nome ?? "—";
  const E = { chamada: null, notas: null, aula: null };
  function slotsPrevistos(horarios, inicio, fim, semAula) {
    const s = [];
    for (let d = inicio; d <= fim; d = somarDias(d, 1)) {
      if (semAula.has(d)) continue;
      const ds = diaSemana(d);
      for (const h of horarios) if (h.dia === ds) s.push({ td_id: h.td_id, data: d, hora: fmtHora(h.inicio), tempos: h.tempos, fim: fmtHora(h.fim) });
    }
    return s;
  }
  async function telaProfessor() {
    const b = await base();
    const meus = (await tds()).filter(leciona);
    const ref = hoje();
    const p = periodoDaData(b, ref);
    if (!meus.length) {
      return shell(`${cabecalho("Minhas aulas", esc(fmtLonga(ref)))}${aviso("info", "Você ainda não tem turmas vinculadas. A coordenação cadastra os vínculos (turma, disciplina e horário).")}`, "professor");
    }
    const ids = meus.map((t) => t.id);
    const [hor, aulas, mats] = await Promise.all([
      q(sb.from("horarios").select("*").in("td_id", ids)),
      p ? todas(() => sb.from("aulas").select("id, td_id, data, hora, tempos, chamada_em, registrada_em, campos").in("td_id", ids).eq("periodo_id", p.id)) : [],
      todas(() => sb.from("matriculas").select("id, turma_id, inicio, fim, status").in("turma_id", [...new Set(meus.map((t) => t.turma_id))]))
    ]);
    const chaveAula = (td, d, h) => `${td}|${d}|${fmtHora(h)}`;
    const mapaAulas = new Map(aulas.map((a) => [chaveAula(a.td_id, a.data, a.hora), a]));
    const ontem = somarDias(ref, -1);
    const previstos = p && p.status === "aberto" ? slotsPrevistos(hor, p.inicio, ontem < p.fim ? ontem : p.fim, b.semAula) : [];
    const semChamada = previstos.filter((s) => !mapaAulas.get(chaveAula(s.td_id, s.data, s.hora))?.chamada_em);
    const semConteudo = aulas.filter((a) => a.chamada_em && !a.registrada_em && a.data <= ref);
    const ds = diaSemana(ref);
    const deHoje = b.semAula.has(ref) ? [] : ordenarPor(hor.filter((h) => h.dia === ds), (h) => h.inicio);
    const ultima = (tdId) => ordenarPor(aulas.filter((a) => a.td_id === tdId && a.registrada_em), (a) => `${a.data} ${a.hora}`).pop();
    const nAlunos = (turma) => mats.filter((m) => m.turma_id === turma && m.status === "ativa" && vigenteNa(m, ref)).length;
    const prim = deHoje[0] ? deHoje[0].td_id : meus[0].id;
    const cartoes = deHoje.map((h) => {
      const td = porId(meus, h.td_id);
      const a = mapaAulas.get(chaveAula(h.td_id, ref, h.inicio));
      const u = ultima(h.td_id);
      return `<article class="cartao cartao-turma"><div class="linha"><span class="turma-codigo">${esc(td.turmas.codigo)}</span><span class="espaco"></span>${a?.chamada_em ? etq("verde", "Chamada feita") : etq("amarela", "Chamada pendente")}</div>
      <div><strong>${esc(td.disciplinas.nome)}</strong> · ${esc(td.turmas.serie)}</div><div class="horario">${fmtHora(h.inicio)}–${fmtHora(h.fim)} · ${h.tempos} tempo(s)</div>
      <dl><dt>Estudantes</dt><dd>${nAlunos(td.turma_id)}</dd><dt>Última aula</dt><dd>${u ? `${fmtData(u.data)} — ${esc(u.campos?.conteudo || "")}` : "—"}</dd></dl>
      <div class="acoes"><a class="btn" href="#/td/${td.id}/chamada?data=${ref}&hora=${fmtHora(h.inicio)}">Fazer chamada</a><a class="btn secundario" href="#/td/${td.id}/aula?data=${ref}&hora=${fmtHora(h.inicio)}">Registrar aula</a></div></article>`;
    });
    const cont = (lista, id) => lista.filter((x) => x.td_id === id).length;
    return shell(
      `${cabecalho("Minhas aulas", `${esc(fmtLonga(ref))}${p ? ` · ${esc(p.nome)} (${esc(p.status)})` : ""}`)}
    <nav aria-label="Ações principais" class="acoes-principais">
      <a class="acao-principal" href="#/td/${prim}/chamada"><span class="icone" aria-hidden="true">✓</span> FAZER CHAMADA</a>
      <a class="acao-principal" href="#/td/${prim}/aula"><span class="icone" aria-hidden="true">✎</span> REGISTRAR AULA</a>
      <a class="acao-principal" href="#/td/${prim}/notas"><span class="icone" aria-hidden="true">№</span> LANÇAR NOTAS</a>
      <a class="acao-principal secundaria" href="#/td/${prim}/diario"><span class="icone" aria-hidden="true">▤</span> CONSULTAR DIÁRIO</a></nav>
    ${semChamada.length + semConteudo.length ? aviso("alerta", `<strong>Pendências:</strong> ${semChamada.length} chamada(s) não realizada(s) · ${semConteudo.length} aula(s) sem conteúdo registrado.`) : ""}
    <section class="pilha"><h2>Aulas de hoje</h2>${cartoes.length ? `<div class="grade grade-3">${cartoes.join("")}</div>` : `<p class="muted">${b.semAula.has(ref) ? "Hoje é dia sem aula no calendário escolar." : "Nenhuma aula na sua grade para hoje."}</p>`}</section>
    <section class="pilha mt-3"><h2>Todas as minhas turmas</h2><div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Turma</th><th>Disciplina</th><th class="num">Estudantes</th><th class="num">Chamadas pendentes</th><th class="num">Sem conteúdo</th><th>Ações</th></tr></thead><tbody>
    ${meus.map((td) => `<tr><td><strong>${esc(td.turmas.codigo)}</strong> <span class="muted pequeno">${esc(td.turmas.serie)}</span></td><td>${esc(td.disciplinas.nome)}</td><td class="num">${nAlunos(td.turma_id)}</td>
      <td class="num">${cont(semChamada, td.id) ? etq("amarela", cont(semChamada, td.id)) : 0}</td><td class="num">${cont(semConteudo, td.id) ? etq("amarela", cont(semConteudo, td.id)) : 0}</td>
      <td><div class="linha"><a class="btn pequeno" href="#/td/${td.id}/chamada">Chamada</a><a class="btn pequeno secundario" href="#/td/${td.id}/aula">Aula</a><a class="btn pequeno secundario" href="#/td/${td.id}/notas">Notas</a><a class="btn pequeno fantasma" href="#/td/${td.id}/diario">Diário</a></div></td></tr>`).join("")}
    </tbody></table></div>
    ${semChamada.length ? `<details class="cartao"><summary><strong>Chamadas pendentes (${semChamada.length})</strong></summary><ul class="pequeno">${semChamada.map((s) => `<li><a href="#/td/${s.td_id}/chamada?data=${s.data}&hora=${s.hora}">${esc(rotuloTd(porId(meus, s.td_id)))} · ${fmtData(s.data)} às ${s.hora}</a></li>`).join("")}</ul></details>` : ""}
    ${semConteudo.length ? `<details class="cartao"><summary><strong>Aulas sem conteúdo registrado (${semConteudo.length})</strong></summary><ul class="pequeno">${semConteudo.map((a) => `<li><a href="#/td/${a.td_id}/aula?data=${a.data}&hora=${fmtHora(a.hora)}">${esc(rotuloTd(porId(meus, a.td_id)))} · ${fmtData(a.data)} às ${fmtHora(a.hora)}</a></li>`).join("")}</ul></details>` : ""}
    </section>`,
      "professor"
    );
  }
  function cabecalhoTd(td, titulo, ativo) {
    return `<div class="trilha"><a href="#/">← Início</a></div>
  ${cabecalho(`${titulo} — Turma ${td.turmas.codigo}`, `${esc(td.disciplinas.nome)} · ${esc(td.turmas.serie)} · ${esc(SEGMENTOS[td.turmas.segmento] || td.turmas.segmento)}${!leciona(td) ? ` · Professor(a): ${esc(td.perfis?.nome || "—")}` : ""}`)}
  <nav aria-label="Seções da turma" class="linha mb-2">${[["chamada", "Chamada"], ["aula", "Registro de aula"], ["notas", "Notas"], ["diario", "Diário"]].map(([k, r]) => `<a href="#/td/${td.id}/${k}" class="btn pequeno ${k === ativo ? "" : "secundario"}" ${k === ativo ? 'aria-current="page"' : ""}>${r}</a>`).join("")}</nav>`;
  }
  function seletorDataHora(td, data, horaSel, secao, hs) {
    return `<div class="cartao mb-2"><div class="linha">
    <a class="btn pequeno secundario" href="#/td/${td.id}/${secao}?data=${somarDias(data, -1)}" aria-label="Dia anterior">◀</a>
    <label class="linha"><span class="rotulo-campo">Data</span><input type="date" value="${data}" data-ir-data="#/td/${td.id}/${secao}" class="campo-data"></label>
    <a class="btn pequeno secundario" href="#/td/${td.id}/${secao}?data=${somarDias(data, 1)}" aria-label="Próximo dia">▶</a>
    <span class="muted pequeno">${esc(fmtLonga(data))}</span></div>
    <div class="linha mt-1"><span class="rotulo-campo">Horário:</span>${hs.length ? "" : '<span class="muted pequeno">Sem aula desta turma na grade neste dia.</span>'}
    ${hs.map((h) => `<a href="#/td/${td.id}/${secao}?data=${data}&hora=${fmtHora(h.inicio)}" class="btn pequeno ${fmtHora(h.inicio) === horaSel ? "" : "secundario"}">${fmtHora(h.inicio)}–${fmtHora(h.fim)} (${h.tempos}t)</a>`).join("")}</div></div>`;
  }
  async function contextoAula(td, rq) {
    const b = await base();
    const ref = hoje();
    const data = ehData(rq.get("data")) ? rq.get("data") : ref;
    const hor = ordenarPor(await q(sb.from("horarios").select("*").eq("td_id", td.id)), (h) => h.inicio);
    const hs = hor.filter((h) => h.dia === diaSemana(data));
    const hora = ehHora(rq.get("hora")) ? rq.get("hora") : hs[0] ? fmtHora(hs[0].inicio) : null;
    const aula = hora ? (await q(sb.from("aulas").select("*").eq("td_id", td.id).eq("data", data).eq("hora", hora)))[0] || null : null;
    const p = periodoDaData(b, data);
    return { b, ref, data, hs, hora, aula, p, horario: hs.find((h) => fmtHora(h.inicio) === hora) || null, semAula: b.semAula.has(data) };
  }
  async function telaChamada(td, rq) {
    const c = await contextoAula(td, rq);
    const { data, hora, aula, p } = c;
    const freq = aula ? await q(sb.from("frequencias").select("matricula_id, status, justificativa").eq("aula_id", aula.id)) : [];
    const alunos = (await matriculasDaTurma(td.turma_id)).filter((m) => vigenteNa(m, data));
    const podeEditar = leciona(td) && p && p.status === "aberto" && data <= c.ref && !c.semAula && !!hora;
    const chave = `${td.id}|${data}|${hora}`;
    if (!E.chamada || E.chamada.chave !== chave) {
      const salvo = new Map(freq.map((f) => [f.matricula_id, f]));
      E.chamada = { chave, td: td.id, data, hora, tempos: aula ? aula.tempos : c.horario ? c.horario.tempos : 1, marcas: {}, alunos: alunos.map((m) => m.id) };
      for (const m of alunos) E.chamada.marcas[m.id] = { s: salvo.get(m.id)?.status || null, j: salvo.get(m.id)?.justificativa || "" };
    }
    const st = E.chamada;
    const podeRetificar = leciona(td) && aula?.chamada_em && p && p.status !== "aberto";
    S.apos = atualizarContagemChamada;
    const corpo = !hora ? '<p class="muted">Escolha uma data com aula desta turma na grade horária.</p>' : !alunos.length ? '<p class="muted">Nenhum estudante com matrícula vigente nesta data.</p>' : `${podeEditar ? `<div class="linha mb-2"><button type="button" class="btn grande" data-acao="todos-presentes">MARCAR TODOS COMO PRESENTES</button>
        <label class="linha"><span class="rotulo-campo">Tempos de aula</span><select data-campo-chamada="tempos" class="campo-curto">${opcoes([1, 2, 3, 4, 5, 6].map((n) => [n, n]), st.tempos)}</select></label></div>` : ""}
      <p class="pequeno muted">${podeEditar ? "Dica: com o foco em um estudante, use as teclas P (presente), F (falta), A (atraso) ou J (falta justificada)." : "Visualização somente leitura."}</p>
      <ul class="lista-chamada cartao sem-recuo">${alunos.map((m) => linhaChamada(m, st.marcas[m.id], podeEditar)).join("")}</ul>
      ${podeEditar ? `<div class="barra-fixa"><span id="contagem-chamada"></span><span class="espaco"></span><span id="status-chamada" class="status-salvamento" role="status"></span>
      <button type="button" class="btn grande" data-acao="salvar-chamada">${aula?.chamada_em ? "Salvar alterações" : "Salvar chamada"}</button></div>` : ""}
      ${podeRetificar ? formRetificacaoFreq(aula, alunos) : ""}`;
    return shell(
      `${cabecalhoTd(td, "Chamada", "chamada")}${seletorDataHora(td, data, hora, "chamada", c.hs)}
    ${c.semAula ? aviso("alerta", "Esta data está marcada no calendário escolar como dia sem aula.") : ""}
    ${!p ? aviso("alerta", "A data não pertence a nenhum período letivo cadastrado.") : ""}
    ${data > c.ref ? aviso("info", "Não é possível registrar chamada de data futura.") : ""}
    ${aula?.chamada_em ? aviso("sucesso", `Chamada registrada em ${esc(fmtDataHora(aula.chamada_em))}. Alterações ficam registradas na auditoria.`) : ""}
    ${leciona(td) && p && p.status !== "aberto" ? aviso("info", `O período está ${esc(p.status)}. Correções somente por solicitação de retificação (aprovada pela coordenação).`) : ""}
    ${!leciona(td) ? aviso("info", "Visualização da gestão. O registro é feito pelo professor responsável.") : ""}
    ${corpo}
    ${aula?.chamada_em && leciona(td) ? `<p class="mt-2"><a class="btn secundario" href="#/td/${td.id}/aula?data=${data}&hora=${hora}">Registrar o conteúdo desta aula →</a></p>` : ""}`,
      leciona(td) ? "professor" : "turmas"
    );
  }
  function linhaChamada(m, mk, podeEditar) {
    const cls = { F: "ausente", A: "atraso", J: "justificada" }[mk.s] || "";
    return `<li class="${cls}" data-mat="${m.id}" tabindex="-1"><span class="numero">${m.numero ?? "—"}</span>
  <div><span class="aluno-nome">${esc(nomeAluno(m))}</span>
  ${mk.s === "J" ? `<input type="text" data-just="${m.id}" value="${esc(mk.j)}" placeholder="Justificativa (ex.: atestado médico)" aria-label="Justificativa da falta de ${esc(nomeAluno(m))}" ${podeEditar ? "" : "disabled"} class="campo-justificativa" maxlength="300">` : ""}</div>
  <div class="seletor-presenca" role="group" aria-label="Frequência de ${esc(nomeAluno(m))}">
  ${["P", "F", "A", "J"].map((s) => `<button type="button" class="${s}" aria-pressed="${mk.s === s}" title="${ROTULO_FREQ[s]}" aria-label="${ROTULO_FREQ[s]} — ${esc(nomeAluno(m))}" ${podeEditar ? "" : "disabled"} data-acao="marcar" data-mat="${m.id}" data-s="${s}">${s}</button>`).join("")}</div></li>`;
  }
  function atualizarContagemChamada() {
    const el = document.getElementById("contagem-chamada");
    if (!el || !E.chamada) return;
    const v = Object.values(E.chamada.marcas);
    const pres = v.filter((x) => x.s === "P" || x.s === "A").length;
    const aus = v.filter((x) => x.s === "F" || x.s === "J").length;
    const sem = v.filter((x) => !x.s).length;
    el.innerHTML = `<strong>${pres}</strong> presentes · <strong>${aus}</strong> ausentes${sem ? ` · <strong>${sem}</strong> sem marcação` : ""}`;
    const bt = document.querySelector('[data-acao="salvar-chamada"]');
    if (bt) bt.disabled = sem > 0;
  }
  function marcarFrequencia(matId, s) {
    const st = E.chamada;
    if (!st || !st.marcas[matId]) return;
    const antes = st.marcas[matId].s;
    st.marcas[matId].s = s;
    const li = document.querySelector(`li[data-mat="${matId}"]`);
    if (!li) return;
    li.className = { F: "ausente", A: "atraso", J: "justificada" }[s] || "";
    li.querySelectorAll(".seletor-presenca button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.s === s)));
    const div = li.children[1];
    const inp = div.querySelector("input[data-just]");
    if (s === "J" && !inp) {
      div.insertAdjacentHTML("beforeend", `<input type="text" data-just="${matId}" value="${esc(st.marcas[matId].j)}" placeholder="Justificativa (ex.: atestado médico)" aria-label="Justificativa" class="campo-justificativa" maxlength="300">`);
      if (antes !== "J") div.querySelector("input[data-just]").focus();
    } else if (s !== "J" && inp) inp.remove();
    const status = document.getElementById("status-chamada");
    if (status) {
      status.className = "status-salvamento pendente";
      status.textContent = "Alterações não salvas";
    }
    atualizarContagemChamada();
  }
  async function salvarChamada() {
    const st = E.chamada;
    const status = document.getElementById("status-chamada");
    const sem = Object.values(st.marcas).filter((x) => !x.s).length;
    if (sem) return;
    const faltaJust = Object.entries(st.marcas).find(([, x]) => x.s === "J" && !x.j.trim());
    if (faltaJust) {
      status.className = "status-salvamento erro";
      status.textContent = "Informe a justificativa das faltas justificadas.";
      return;
    }
    status.className = "status-salvamento pendente";
    status.textContent = "Salvando…";
    try {
      const r = await rpc("salvar_chamada", {
        p_td: st.td,
        p_data: st.data,
        p_hora: st.hora,
        p_tempos: Number(st.tempos),
        p_registros: Object.entries(st.marcas).map(([id, x]) => ({ matricula_id: id, status: x.s, justificativa: x.s === "J" ? x.j.trim() : null }))
      });
      S.aviso = { tipo: "sucesso", texto: `Chamada salva: ${r.presentes} presentes e ${r.faltas} ausentes.` };
      E.chamada = null;
      render();
    } catch (e) {
      status.className = "status-salvamento erro";
      status.textContent = traduzirErro(e).message;
    }
  }
  function formRetificacaoFreq(aula, alunos) {
    return `<details class="cartao mt-2"><summary><strong>Solicitar correção de frequência (retificação)</strong></summary>
  <form data-form="retificar-freq" data-aula="${aula.id}"><div id="msg-retif"></div><div class="form-linha">
    <div class="campo"><label for="rf-aluno">Estudante</label><select id="rf-aluno" name="matricula_id" required>${opcoes(alunos.map((m) => [m.id, `${m.numero ?? ""} ${nomeAluno(m)}`]))}</select></div>
    <div class="campo"><label for="rf-status">Situação correta</label><select id="rf-status" name="status">${opcoes(Object.entries(ROTULO_FREQ))}</select></div>
    <div class="campo"><label for="rf-jf">Justificativa da falta (se J)</label><input id="rf-jf" name="justificativa_falta" maxlength="300"></div></div>
    <div class="campo"><label for="rf-motivo">Motivo da correção (obrigatório)</label><textarea id="rf-motivo" name="justificativa" minlength="10" maxlength="1000" required></textarea></div>
    <button class="btn secundario" type="submit">Enviar à coordenação</button></form></details>`;
  }
  const CAMPOS_AULA = [["conteudo", "Conteúdo da aula"]];
  async function telaAula(td, rq) {
    const c = await contextoAula(td, rq);
    const { data, hora, aula, p } = c;
    const podeEditar = leciona(td) && p && p.status === "aberto" && !!hora;
    const recentes = await q(sb.from("aulas").select("data, hora, campos").eq("td_id", td.id).not("registrada_em", "is", null).lt("data", data).order("data", { ascending: false }).limit(3));
    E.aula = { td: td.id, data, hora, tempos: aula ? aula.tempos : c.horario?.tempos || 1 };
    return shell(
      `${cabecalhoTd(td, "Registro de aula", "aula")}${seletorDataHora(td, data, hora, "aula", c.hs)}
    ${aula?.registrada_em ? aviso("sucesso", `Aula registrada em ${esc(fmtDataHora(aula.registrada_em))}. Você pode corrigir o texto e salvar de novo.`) : ""}
    ${p && p.status !== "aberto" ? aviso("info", `Período ${esc(p.status)}: registro somente leitura.`) : ""}
    ${!hora ? '<p class="muted">Escolha uma data com aula desta turma na grade horária.</p>' : `
    <form data-form="aula" class="cartao aula-simples"><div id="msg-aula"></div>
      <label for="a-conteudo" class="rotulo-grande">O que foi trabalhado nesta aula</label>
      <textarea id="a-conteudo" name="conteudo" class="conteudo-aula" maxlength="5000" rows="12" placeholder="Ex.: Leis de Newton — 2ª lei (F = m·a). Exercícios 1 a 8 da página 112. Correção no quadro." ${podeEditar ? "autofocus" : "disabled"}>${esc(aula?.campos?.conteudo || "")}</textarea>
      ${podeEditar ? `<div class="linha mt-1"><button type="submit" class="btn grande">Salvar aula</button>
        <label class="linha"><span class="rotulo-campo">Tempos</span><select name="tempos" class="campo-curto">${opcoes([1, 2, 3, 4, 5, 6].map((n) => [n, n]), E.aula.tempos)}</select></label></div>` : ""}
    </form>`}
    ${recentes.length ? `<section class="cartao mt-2"><h2>Aulas anteriores</h2><ul class="pequeno">${recentes.map((a) => `<li>${fmtData(a.data)} — ${esc(a.campos?.conteudo || "")}</li>`).join("")}</ul></section>` : ""}`,
      leciona(td) ? "professor" : "turmas"
    );
  }
  async function salvarAula(f) {
    const d = Object.fromEntries(new FormData(f).entries());
    const alvo = document.getElementById("msg-aula");
    const conteudo = String(d.conteudo || "").trim();
    if (!conteudo) return alvo.innerHTML = aviso("erro", "Escreva o conteúdo da aula antes de salvar.");
    if (E.aula.data > hoje()) return alvo.innerHTML = aviso("erro", "Não é possível registrar aula de data futura.");
    try {
      await rpc("salvar_aula", { p_td: E.aula.td, p_data: E.aula.data, p_hora: E.aula.hora, p_tempos: Number(d.tempos || E.aula.tempos), p_campos: { conteudo }, p_confirmar: true });
      S.aviso = { tipo: "sucesso", texto: "Aula salva." };
      render();
    } catch (e) {
      alvo.innerHTML = aviso("erro", esc(traduzirErro(e).message));
    }
  }
  const ORDEM_TIPO = { regular: 0, segunda_chamada: 1, recuperacao: 2, especial: 3 };
  function textoNota(n) {
    if (!n) return "";
    if (n.situacao === "falta") return "F";
    if (n.situacao === "dispensado") return "D";
    return fmtNota(n.valor);
  }
  async function telaNotas(td, rq) {
    const b = await base();
    const p = porId(b.periodos, rq.get("periodo")) || periodoAtual(b);
    if (!p) return shell(`${cabecalhoTd(td, "Notas", "notas")}${aviso("alerta", "Nenhum período letivo cadastrado.")}`);
    const [avals, mats, regras, medias] = await Promise.all([
      q(sb.from("avaliacoes").select("*").eq("td_id", td.id).eq("periodo_id", p.id).neq("status", "rascunho")),
      matriculasDaTurma(td.turma_id),
      q(sb.from("regras_avaliacao").select("*").eq("status", "aprovada")),
      q(sb.from("medias").select("matricula_id, media, completa, resultado, regra_versao").eq("td_id", td.id).eq("periodo_id", p.id))
    ]);
    const notas = avals.length ? await todas(() => sb.from("notas").select("avaliacao_id, matricula_id, valor, situacao").eq("td_id", td.id).in("avaliacao_id", avals.map((a) => a.id))) : [];
    const regra = regraVigente(regras, td.turmas.segmento, p.inicio);
    const ordemComp = (regra?.definicao?.componentes || []).map((c) => c.codigo);
    const cols = [...avals].sort((a, b2) => ORDEM_TIPO[a.tipo] - ORDEM_TIPO[b2.tipo] || (ordemComp.indexOf(a.componente) + 99) % 99 - (ordemComp.indexOf(b2.componente) + 99) % 99 || a.criado_em.localeCompare(b2.criado_em));
    const alunos = mats.filter((m) => m.status !== "cancelada" && m.inicio <= p.fim && (!m.fim || m.fim >= p.inicio));
    const mapa = new Map(notas.map((n) => [`${n.avaliacao_id}|${n.matricula_id}`, n]));
    const mapaMed = new Map(medias.map((m) => [m.matricula_id, m]));
    const ref = hoje();
    const casas = regra?.definicao?.casas_decimais_lancamento ?? 2;
    const editavel = (a, m) => {
      if (!leciona(td) || p.status !== "aberto" || a.status !== "liberada" || a.prazo && ref > a.prazo) return false;
      if (a.data && (a.data < m.inicio || m.fim && a.data > m.fim)) return false;
      const n = mapa.get(`${a.id}|${m.id}`);
      if (n?.situacao === "dispensado") return false;
      if (a.tipo === "segunda_chamada") return mapa.get(`${a.substitui_id}|${m.id}`)?.situacao === "falta";
      return true;
    };
    E.notas = { td: td.id, periodo: p.id, regra, casas, avals: cols, alunos: alunos.map((m) => m.id), mapa, alterados: /* @__PURE__ */ new Map() };
    const refMedia = Number(regra?.definicao?.media_referencia ?? 6);
    const celMedia = (m) => {
      const md = mapaMed.get(m.id);
      if (!md) return '<td class="media incompleta centro">—</td>';
      if (!md.completa) return `<td class="media incompleta centro" title="${esc((md.resultado?.pendencias || []).join("; "))}">incompleta</td>`;
      return `<td class="media centro ${Number(md.media) < refMedia ? "abaixo" : ""}"><strong>${fmtNota(md.media)}</strong></td>`;
    };
    const avisos = [];
    if (!regra) avisos.push(aviso("erro", "Não há regra de avaliação aprovada para este segmento e período. A direção precisa aprovar uma regra."));
    if (!cols.length) avisos.push(aviso("info", "Nenhuma avaliação configurada para este período. A coordenação cria os Testes e Avaliações em “Avaliações”."));
    if (p.status !== "aberto") avisos.push(aviso("info", `Período ${esc(p.status)}: lançamentos bloqueados. Correções por retificação.`));
    const prazos = cols.filter((a) => a.prazo && ref > a.prazo && a.status === "liberada");
    if (prazos.length && p.status === "aberto") avisos.push(aviso("alerta", `Prazo encerrado para: ${esc(prazos.map((a) => a.nome).join(", "))}.`));
    return shell(
      `${cabecalhoTd(td, "Notas", "notas")}<div class="linha mb-2">${seletorPeriodo(b, p, `#/td/${td.id}/notas`)}
     <span class="espaco"></span><a class="btn pequeno fantasma" href="#/relatorio/notas/${td.id}?periodo=${p.id}">Imprimir pauta</a></div>
    ${avisos.join("")}
    ${regra ? `<p class="pequeno muted">Regra: <strong>${esc(regra.nome)}</strong> (versão ${regra.versao}) — ${esc(descreverRegra(regra.definicao))}. Digite a nota (ex.: 7,5) ou <strong>F</strong> para falta. Nota em branco não é zero: a média fica incompleta.</p>` : ""}
    ${cols.length && alunos.length ? `<div class="tabela-rolagem"><table class="tabela planilha"><thead><tr><th>Nº</th><th>Estudante</th>
      ${cols.map((a) => `<th class="centro">${esc(a.nome)}<br><small>${esc(a.componente)}${a.tipo !== "regular" ? ` · ${esc(a.tipo.replace("_", " "))}` : ""} · vale ${fmtNota(a.nota_maxima)}${a.data ? ` · ${fmtData(a.data)}` : ""}${a.status !== "liberada" ? ` · ${esc(a.status)}` : ""}</small></th>`).join("")}
      <th class="centro">Média oficial</th><th class="centro">Prévia</th></tr></thead><tbody>
      ${alunos.map((m) => `<tr data-linha="${m.id}"><td class="num">${m.numero ?? ""}</td><td class="nome">${esc(nomeAluno(m))}${m.status !== "ativa" ? ` ${etq("cinza", m.status)}` : ""}</td>
        ${cols.map((a) => {
        const n = mapa.get(`${a.id}|${m.id}`);
        const ed = editavel(a, m);
        if (a.tipo === "segunda_chamada" && !ed && !n) return '<td class="centro muted">—</td>';
        return `<td class="centro"><input type="text" inputmode="decimal" value="${esc(textoNota(n))}" data-nota="${a.id}|${m.id}" ${ed ? "" : "disabled"} class="${n?.situacao === "falta" ? "falta" : ""}" aria-label="${esc(a.nome)} — ${esc(nomeAluno(m))}" maxlength="5"></td>`;
      }).join("")}
        ${celMedia(m)}<td class="centro previa" data-previa="${m.id}"></td></tr>`).join("")}
      </tbody></table></div>
      ${leciona(td) && p.status === "aberto" ? `<div class="barra-fixa"><span id="status-notas" class="status-salvamento" role="status"></span><span class="espaco"></span><button type="button" class="btn grande" data-acao="salvar-notas" disabled>Salvar notas</button></div>` : ""}
      ${leciona(td) && p.status !== "aberto" ? formRetificacaoNota(cols, alunos) : ""}` : ""}`,
      leciona(td) ? "professor" : "turmas"
    );
  }
  function descreverRegra(d) {
    if (!d) return "";
    const comp = (d.componentes || []).map((c) => `${c.nome}${Number(c.peso) !== 1 ? ` (peso ${c.peso})` : ""}`).join(" + ");
    const soma = (d.componentes || []).reduce((s, c) => s + Number(c.peso), 0);
    const multi = (d.componentes || []).some((c) => c.composicao === "media_aritmetica") ? "; vários instrumentos de um componente: média aritmética dos válidos" : "";
    return `MÉDIA = (${comp}) / ${soma}, escala 0–${d.nota_maxima}${multi}`;
  }
  function instrumentosDaLinha(matId) {
    const st = E.notas;
    return st.avals.map((a) => {
      const k = `${a.id}|${matId}`;
      const txt = st.alterados.has(k) ? st.alterados.get(k) : textoNota(st.mapa.get(k));
      const t = String(txt).trim().toUpperCase();
      const situacao = t === "" ? null : t === "F" ? "falta" : t === "D" ? "dispensado" : "lancada";
      return { avaliacaoId: a.id, nome: a.nome, componente: a.componente, tipo: a.tipo, substituiId: a.substitui_id, notaMaxima: Number(a.nota_maxima), situacao, valor: situacao === "lancada" ? t.replace(",", ".") : null };
    });
  }
  function editarNota(inp) {
    const st = E.notas;
    const k = inp.dataset.nota;
    const [avId, matId] = k.split("|");
    const a = st.avals.find((x) => x.id === avId);
    const original = textoNota(st.mapa.get(k));
    const v = inp.value.trim();
    inp.classList.remove("invalido");
    inp.removeAttribute("title");
    if (v === original) st.alterados.delete(k);
    else st.alterados.set(k, v);
    inp.classList.toggle("alterado", st.alterados.has(k));
    inp.classList.toggle("falta", v.toUpperCase() === "F");
    if (v && v.toUpperCase() !== "F") {
      const r = Motor.validarNota(v, Number(a.nota_maxima), st.casas);
      if (!r.ok) {
        inp.classList.add("invalido");
        inp.title = r.erro;
      }
    }
    const cel = document.querySelector(`[data-previa="${matId}"]`);
    if (cel && st.regra) {
      const linhaAlterada = st.avals.some((x) => st.alterados.has(`${x.id}|${matId}`));
      if (!linhaAlterada) cel.textContent = "";
      else {
        const res = Motor.calcularMedia(st.regra.definicao, instrumentosDaLinha(matId).filter((i) => i.situacao !== "lancada" || Motor.validarNota(i.valor, i.notaMaxima, st.casas).ok));
        cel.textContent = res.completa ? Motor.formatarNota(res.media) : "incompleta";
      }
    }
    const n = st.alterados.size;
    const bt = document.querySelector('[data-acao="salvar-notas"]');
    if (bt) bt.disabled = n === 0 || !!document.querySelector(".planilha input.invalido");
    const status = document.getElementById("status-notas");
    if (status) {
      status.className = `status-salvamento ${n ? "pendente" : ""}`;
      status.textContent = n ? `${n} alteração(ões) não salva(s)` : "";
    }
  }
  async function salvarNotas() {
    const st = E.notas;
    const status = document.getElementById("status-notas");
    const alteracoes = [...st.alterados.entries()].map(([k, v]) => {
      const [avaliacao_id, matricula_id] = k.split("|");
      return { avaliacao_id, matricula_id, valor: v };
    });
    status.className = "status-salvamento pendente";
    status.textContent = "Salvando…";
    try {
      const r = await rpc("lancar_notas", { p_td: st.td, p_periodo: st.periodo, p_alteracoes: alteracoes });
      S.aviso = { tipo: "sucesso", texto: `${r.salvas} lançamento(s) salvo(s). Médias recalculadas pelo servidor.` };
      render();
    } catch (e) {
      const err = traduzirErro(e);
      status.className = "status-salvamento erro";
      status.textContent = err.message;
      try {
        for (const x of JSON.parse(err.detalhe || "[]")) {
          const inp = document.querySelector(`[data-nota="${x.avaliacao_id}|${x.matricula_id}"]`);
          if (inp) {
            inp.classList.add("invalido");
            inp.title = x.erro;
          }
        }
      } catch {
      }
    }
  }
  function formRetificacaoNota(cols, alunos) {
    return `<details class="cartao mt-2"><summary><strong>Solicitar correção de nota (retificação)</strong></summary>
  <form data-form="retificar-nota"><div id="msg-retif"></div><div class="form-linha">
    <div class="campo"><label for="rn-aluno">Estudante</label><select id="rn-aluno" name="matricula_id" required>${opcoes(alunos.map((m) => [m.id, `${m.numero ?? ""} ${nomeAluno(m)}`]))}</select></div>
    <div class="campo"><label for="rn-av">Avaliação</label><select id="rn-av" name="avaliacao_id" required>${opcoes(cols.map((a) => [a.id, a.nome]))}</select></div>
    <div class="campo"><label for="rn-sit">Situação</label><select id="rn-sit" name="situacao">${opcoes([["lancada", "Nota"], ["falta", "Falta"], ["remover", "Remover lançamento"]])}</select></div>
    <div class="campo"><label for="rn-valor">Nota correta</label><input id="rn-valor" name="valor" inputmode="decimal" maxlength="5"></div></div>
    <div class="campo"><label for="rn-motivo">Motivo da correção (obrigatório)</label><textarea id="rn-motivo" name="justificativa" minlength="10" maxlength="1000" required></textarea></div>
    <button class="btn secundario" type="submit">Enviar à coordenação</button></form></details>`;
  }
  async function dadosDiario(td, p) {
    const b = await base();
    const [aulas, mats, hor] = await Promise.all([
      todas(() => sb.from("aulas").select("id, data, hora, tempos, campos, chamada_em, registrada_em").eq("td_id", td.id).eq("periodo_id", p.id).order("data").order("hora")),
      matriculasDaTurma(td.turma_id),
      q(sb.from("horarios").select("*").eq("td_id", td.id))
    ]);
    const freq = aulas.length ? await todas(() => sb.from("frequencias").select("aula_id, matricula_id, status").eq("td_id", td.id).in("aula_id", aulas.map((a) => a.id))) : [];
    const seg = b.segmentos.find((s) => s.codigo === td.turmas.segmento) || { contagem: "tempo", minimo: 75, abona_justificada: false };
    const porAula = agrupar(freq, (f) => f.aula_id);
    const comChamada = aulas.filter((a) => a.chamada_em);
    const alunos = mats.filter((m) => m.status !== "cancelada" && m.inicio <= p.fim && (!m.fim || m.fim >= p.inicio)).map((m) => {
      const minhas = freq.filter((f) => f.matricula_id === m.id);
      const conta = (f) => f.status === "F" || f.status === "J" && !seg.abona_justificada;
      const aulaDe = new Map(comChamada.map((a) => [a.id, a]));
      let total = 0, faltas = 0;
      const dias = /* @__PURE__ */ new Map();
      for (const f of minhas) {
        const a = aulaDe.get(f.aula_id);
        if (!a) continue;
        total += a.tempos;
        if (conta(f)) faltas += a.tempos;
        const d = dias.get(a.data) || { falta: false };
        d.falta = d.falta || conta(f);
        dias.set(a.data, d);
      }
      const tDias = dias.size, fDias = [...dias.values()].filter((d) => d.falta).length;
      const pct = seg.contagem === "dia" ? tDias ? 100 * (tDias - fDias) / tDias : null : total ? 100 * (total - faltas) / total : null;
      return { m, total, faltas, pct, abaixo: pct !== null && pct < Number(seg.minimo) };
    });
    const ref = hoje();
    const lim = ref < p.fim ? ref : p.fim;
    const previstas = slotsPrevistos(hor, p.inicio, lim, b.semAula).length;
    return { b, aulas, porAula, alunos, seg, previstas };
  }
  async function telaDiario(td, rq) {
    const b = await base();
    const p = porId(b.periodos, rq.get("periodo")) || periodoAtual(b);
    if (!p) return shell(`${cabecalhoTd(td, "Diário", "diario")}${aviso("alerta", "Nenhum período letivo cadastrado.")}`);
    const d = await dadosDiario(td, p);
    const resumo = (a) => {
      const fs = d.porAula.get(a.id) || [];
      return `${fs.filter((f) => f.status === "P" || f.status === "A").length}P / ${fs.filter((f) => f.status === "F" || f.status === "J").length}F`;
    };
    return shell(
      `${cabecalhoTd(td, "Diário", "diario")}<div class="linha mb-2">${seletorPeriodo(b, p, `#/td/${td.id}/diario`)}<span class="espaco"></span>
      <a class="btn pequeno fantasma" href="#/relatorio/diario/${td.id}?periodo=${p.id}">Imprimir diário</a><a class="btn pequeno fantasma" href="#/relatorio/frequencia/${td.id}?periodo=${p.id}">Imprimir frequência</a></div>
    <div class="grade grade-4 mb-2">
      ${indicador("Aulas previstas (grade)", d.previstas, `até ${fmtData(hoje() < p.fim ? hoje() : p.fim)}`, "ok")}
      ${indicador("Chamadas realizadas", d.aulas.filter((a) => a.chamada_em).length, "", "ok")}
      ${indicador("Sem conteúdo registrado", d.aulas.filter((a) => a.chamada_em && !a.registrada_em).length, "", d.aulas.some((a) => a.chamada_em && !a.registrada_em) ? "atencao" : "ok")}
      ${indicador("Frequência abaixo do mínimo", d.alunos.filter((x) => x.abaixo).length, `mínimo ${fmtPct(d.seg.minimo)} (${d.seg.contagem === "dia" ? "por dia" : "por tempo de aula"})`, d.alunos.some((x) => x.abaixo) ? "critico" : "ok")}
    </div>
    <section class="cartao"><h2>Aulas do período</h2>${d.aulas.length ? `<div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Data</th><th>Horário</th><th class="num">Tempos</th><th>Frequência</th><th>Conteúdo</th><th>Situação</th></tr></thead><tbody>
      ${d.aulas.map((a) => `<tr><td>${fmtData(a.data)}</td><td>${fmtHora(a.hora)}</td><td class="num">${a.tempos}</td><td>${a.chamada_em ? resumo(a) : "—"}</td><td>${esc(a.campos?.conteudo || "")}</td>
        <td>${a.registrada_em ? etq("verde", "Registrada") : a.chamada_em ? etq("amarela", "Sem conteúdo") : etq("cinza", "Rascunho")}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">Nenhuma aula registrada neste período.</p>'}</section>
    <section class="cartao"><h2>Frequência por estudante</h2><div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Nº</th><th>Estudante</th><th class="num">${d.seg.contagem === "dia" ? "Dias" : "Tempos"} registrados</th><th class="num">Faltas (tempos)</th><th class="num">Frequência</th></tr></thead><tbody>
      ${d.alunos.map((x) => `<tr><td class="num">${x.m.numero ?? ""}</td><td class="nome">${esc(nomeAluno(x.m))}${x.m.status !== "ativa" ? ` ${etq("cinza", x.m.status)}` : ""}</td><td class="num">${x.total}</td><td class="num">${x.faltas}</td><td class="num">${x.abaixo ? etq("vermelha", fmtPct(x.pct)) : fmtPct(x.pct)}</td></tr>`).join("")}
      </tbody></table></div></section>`,
      leciona(td) ? "professor" : "turmas"
    );
  }
  function indicador(rotulo, valor, detalhe, nivel2, href) {
    const corpo = `<div class="valor">${esc(valor)}</div><div class="rotulo">${esc(rotulo)}</div>${detalhe ? `<div class="detalhe">${esc(detalhe)}</div>` : ""}`;
    return `<div class="indicador ${nivel2 || ""}">${href ? `<a href="${href}">${corpo}</a>` : corpo}</div>`;
  }
  const nivel = (n, crit = 10) => n === 0 ? "ok" : n >= crit ? "critico" : "atencao";
  const segmentosDoEscopo = (b) => b.segmentos.filter((s) => s.habilitado && (tem("diretor") || (S.ctx.escopos || []).includes(s.codigo)));
  async function telaPainel(rq) {
    const b = await base();
    const p = porId(b.periodos, rq.get("periodo")) || periodoAtual(b);
    if (!p) return shell(`${cabecalho("Painel", "")}${aviso("alerta", "Nenhum período letivo cadastrado. Cadastre os períodos em “Períodos”.")}`, "painel");
    const r = await rpc("painel_gestao", { p_periodo: p.id });
    const t = r.totais;
    const linhas = r.linhas || [];
    const porProf = [...agrupar(linhas, (l) => l.professor || "(sem professor)").entries()].map(([nome, ls]) => ({
      nome,
      vinc: ls.length,
      freq: ls.reduce((s, l) => s + l.freq_pendentes, 0),
      cont: ls.reduce((s, l) => s + l.sem_conteudo, 0),
      notas: ls.reduce((s, l) => s + Number(l.notas_pendentes), 0)
    }));
    return shell(
      `${cabecalho(tem("diretor") ? "Painel da direção" : "Painel da coordenação", `${esc(p.nome)} ${p.ano} · ${esc(p.status)} · situação até ${fmtData(r.limite)}${!tem("diretor") ? ` · ${esc((S.ctx.escopos || []).map((s) => SEGMENTOS[s] || s).join(", "))}` : ""}`, seletorPeriodo(b, p, "#/painel"))}
    ${(r.periodos_proximos || []).map((x) => aviso("alerta", `<strong>${esc(x.nome)}</strong>: termina em ${fmtData(x.fim)}${x.prazo ? `; prazo de lançamento ${fmtData(x.prazo)}` : ""}.`)).join("")}
    <div class="grade grade-4">
      ${indicador("Professores", t.professores, `${t.turmas} turmas · ${t.vinculos} vínculos`, "ok")}
      ${indicador("Chamadas pendentes", t.frequencias_pendentes, "aulas da grade sem chamada até ontem", nivel(t.frequencias_pendentes, 20))}
      ${indicador("Aulas sem conteúdo", t.conteudos_pendentes, "chamada feita, conteúdo não registrado", nivel(t.conteudos_pendentes, 20))}
      ${indicador("Notas a lançar", t.notas_pendentes, "avaliações já aplicadas sem nota", nivel(t.notas_pendentes, 50))}
      ${indicador("Médias abaixo da referência", t.medias_abaixo, "alerta pedagógico (não é reprovação)", nivel(t.medias_abaixo, 30))}
      ${indicador("Frequência abaixo do mínimo", t.freq_baixa, "estudantes em risco", nivel(t.freq_baixa, 10))}
      ${indicador("Testes / Avaliações", `${t.testes} / ${t.avaliacoes}`, `${t.outras} outro(s) instrumento(s)`, "ok", "#/avaliacoes")}
      ${indicador("Retificações pendentes", t.retificacoes, "aguardando decisão", nivel(t.retificacoes, 5), "#/retificacoes")}
    </div>
    <section class="cartao mt-2"><h2>Por turma e disciplina</h2><div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Turma</th><th>Disciplina</th><th>Professor(a)</th><th class="num">Previstas</th><th class="num">Chamadas</th><th class="num">Pend. chamada</th><th class="num">Sem conteúdo</th><th class="num">Notas a lançar</th><th class="num">Média da turma</th><th class="num">Abaixo</th><th class="num">Freq. média</th><th></th></tr></thead><tbody>
    ${linhas.map((l) => `<tr><td><strong>${esc(l.turma)}</strong> <span class="muted pequeno">${esc(l.segmento)}</span></td><td>${esc(l.disciplina)}</td><td>${esc(l.professor || "—")}</td>
      <td class="num">${l.previstas}</td><td class="num">${l.com_chamada}</td><td class="num">${l.freq_pendentes ? etq("amarela", l.freq_pendentes) : 0}</td><td class="num">${l.sem_conteudo ? etq("amarela", l.sem_conteudo) : 0}</td>
      <td class="num">${Number(l.notas_pendentes) ? etq("amarela", l.notas_pendentes) : 0}</td><td class="num">${l.media === null ? "—" : fmtNota(l.media)} <span class="muted pequeno">(${l.completas}/${l.total})</span></td>
      <td class="num">${l.abaixo ? etq("vermelha", l.abaixo) : 0}</td><td class="num">${fmtPct(l.freq_media)}${l.freq_baixa ? ` ${etq("vermelha", l.freq_baixa)}` : ""}</td>
      <td><a class="btn pequeno fantasma" href="#/td/${l.td_id}/diario?periodo=${p.id}">Diário</a> <a class="btn pequeno fantasma" href="#/td/${l.td_id}/notas?periodo=${p.id}">Notas</a></td></tr>`).join("") || '<tr><td colspan="12" class="muted">Nenhum vínculo no seu escopo.</td></tr>'}
    </tbody></table></div></section>
    <section class="cartao"><h2>Por professor(a)</h2><div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Professor(a)</th><th class="num">Vínculos</th><th class="num">Chamadas pendentes</th><th class="num">Sem conteúdo</th><th class="num">Notas a lançar</th></tr></thead><tbody>
    ${ordenarPor(porProf, (x) => x.nome).map((x) => `<tr><td>${esc(x.nome)}</td><td class="num">${x.vinc}</td><td class="num">${x.freq}</td><td class="num">${x.cont}</td><td class="num">${x.notas}</td></tr>`).join("")}</tbody></table></div></section>`,
      "painel"
    );
  }
  async function professoresDaEscola() {
    return ordenarPor((await q(sb.from("perfis").select("id, nome, papeis, ativo"))).filter((p) => p.ativo && p.papeis.includes("professor")), (p) => p.nome);
  }
  async function telaTurmas() {
    const b = await base();
    const ano = Number((periodoAtual(b) || {}).ano || hoje().slice(0, 4));
    const [turmas, lista, mats] = await Promise.all([
      q(sb.from("turmas").select("*").order("codigo")),
      tds(),
      todas(() => sb.from("matriculas").select("turma_id, status"))
    ]);
    const ativos = (id) => mats.filter((m) => m.turma_id === id && m.status === "ativa").length;
    const segs = segmentosDoEscopo(b);
    return shell(
      `${cabecalho("Turmas e diários", "Turmas do seu escopo, vínculos (disciplina e professor) e grade horária")}
    <div class="grade grade-2">${ordenarPor(turmas, (t) => `${t.ano} ${t.codigo}`).map((t) => {
        const vs = lista.filter((x) => x.turma_id === t.id);
        return `<section class="cartao"><div class="linha"><h2 class="sem-margem">Turma ${esc(t.codigo)}</h2><span class="muted">${esc(t.serie)} · ${esc(SEGMENTOS[t.segmento] || t.segmento)} · ${esc(TURNOS[t.turno] || t.turno)} · ${t.ano}</span><span class="espaco"></span><a class="btn pequeno secundario" href="#/turma/${t.id}">Estudantes (${ativos(t.id)})</a></div>
      <table class="tabela mt-1"><tbody>${vs.map((v) => `<tr><td>${esc(v.disciplinas?.nome)}</td><td>${esc(v.perfis?.nome || "sem professor")}${v.ativo ? "" : ` ${etq("cinza", "inativo")}`}</td>
        <td><div class="linha"><a class="btn pequeno fantasma" href="#/td/${v.id}/diario">Diário</a><a class="btn pequeno fantasma" href="#/td/${v.id}/notas">Notas</a><a class="btn pequeno fantasma" href="#/vinculo/${v.id}">Editar</a></div></td></tr>`).join("") || '<tr><td class="muted">Nenhuma disciplina vinculada.</td></tr>'}</tbody></table>
      <a class="btn pequeno mt-1" href="#/vinculo/novo?turma=${t.id}">+ Vincular disciplina</a></section>`;
      }).join("") || '<p class="muted">Nenhuma turma cadastrada no seu escopo.</p>'}</div>
    <section class="cartao mt-2"><h2>Nova turma</h2><form data-form="turma-criar"><div id="msg-turma"></div><div class="form-linha">
      <div class="campo"><label for="tu-cod">Código</label><input id="tu-cod" name="codigo" required maxlength="12" pattern="[A-Za-z0-9\\-]{1,12}" placeholder="ex.: 2101"></div>
      <div class="campo"><label for="tu-serie">Série/ano</label><input id="tu-serie" name="serie" required maxlength="40" placeholder="ex.: 1ª série"></div>
      <div class="campo"><label for="tu-seg">Segmento</label><select id="tu-seg" name="segmento" required>${opcoes(segs.map((s) => [s.codigo, s.nome]))}</select></div>
      <div class="campo"><label for="tu-turno">Turno</label><select id="tu-turno" name="turno">${opcoes(Object.entries(TURNOS), "manha")}</select></div>
      <div class="campo"><label for="tu-ano">Ano letivo</label><input id="tu-ano" name="ano" type="number" min="2024" max="2100" value="${ano}" required></div></div>
      <button class="btn" type="submit">Criar turma</button></form></section>
    ${tem("diretor") ? `<section class="cartao"><h2>Disciplinas da escola</h2><p class="pequeno">${b.disciplinas.map((d) => `${esc(d.nome)} (${esc(d.sigla)})`).join(" · ")}</p>
      <form data-form="disciplina-criar" class="form-linha"><div class="campo"><label for="di-nome">Nova disciplina</label><input id="di-nome" name="nome" required maxlength="80"></div>
      <div class="campo"><label for="di-sigla">Sigla</label><input id="di-sigla" name="sigla" required maxlength="6"></div><div class="campo"><span class="rotulo-campo">&nbsp;</span><button class="btn secundario" type="submit">Adicionar</button></div></form><div id="msg-disc"></div></section>` : ""}`,
      "turmas"
    );
  }
  async function telaVinculo(id, rq) {
    const b = await base();
    const novo = id === "novo";
    const turmas = await q(sb.from("turmas").select("*").order("codigo"));
    const td = novo ? null : await carregarTd(id);
    const turmaId = novo ? rq.get("turma") : td.turma_id;
    const turma = porId(turmas, turmaId);
    if (!turma) throw new ErroUsuario("Turma não encontrada no seu escopo.", "NAO_ENCONTRADO");
    const [profs, hor] = await Promise.all([professoresDaEscola(), novo ? [] : q(sb.from("horarios").select("*").eq("td_id", id).order("dia").order("inicio"))]);
    const usadas = new Set((await tds()).filter((x) => x.turma_id === turmaId).map((x) => x.disciplina_id));
    return shell(
      `<div class="trilha"><a href="#/turmas">← Turmas</a></div>${cabecalho(novo ? `Vincular disciplina — Turma ${turma.codigo}` : `Vínculo — ${rotuloTd(td)}`, esc(`${turma.serie} · ${SEGMENTOS[turma.segmento] || turma.segmento}`))}
    <section class="cartao"><form data-form="vinculo" data-id="${esc(id)}" data-turma="${esc(turmaId)}"><div id="msg-vinculo"></div><div class="form-linha">
      ${novo ? `<div class="campo"><label for="v-disc">Disciplina</label><select id="v-disc" name="disciplina_id" required>${opcoes(b.disciplinas.filter((d) => !usadas.has(d.id)).map((d) => [d.id, d.nome]))}</select></div>` : ""}
      <div class="campo"><label for="v-prof">Professor(a)</label><select id="v-prof" name="professor_id"><option value="">— sem professor —</option>${opcoes(profs.map((p) => [p.id, p.nome]), td?.professor_id)}</select></div>
      ${novo ? "" : `<div class="campo"><label for="v-ativo">Situação</label><select id="v-ativo" name="ativo">${opcoes([["true", "Ativo"], ["false", "Inativo"]], String(td.ativo))}</select></div>`}</div>
      <button class="btn" type="submit">${novo ? "Vincular" : "Salvar"}</button></form>
      <p class="pequeno muted">Somente professores cadastrados pela direção em “Equipe e acessos” aparecem na lista. A troca de professor vale para novos registros; o histórico mantém o autor original.</p></section>
    ${novo ? "" : `<section class="cartao"><h2>Grade horária</h2><table class="tabela"><thead><tr><th>Dia</th><th>Início</th><th>Fim</th><th class="num">Tempos</th><th></th></tr></thead><tbody>
      ${hor.map((h) => `<tr><td>${DIAS_CURTOS[h.dia]}</td><td>${fmtHora(h.inicio)}</td><td>${fmtHora(h.fim)}</td><td class="num">${h.tempos}</td><td><button type="button" class="btn pequeno fantasma" data-acao="horario-remover" data-id="${h.id}">Remover</button></td></tr>`).join("") || '<tr><td colspan="5" class="muted">Sem horários.</td></tr>'}</tbody></table>
      <form data-form="horario" data-td="${esc(id)}" class="mt-1"><div id="msg-horario"></div><div class="form-linha">
        <div class="campo"><label for="h-dia">Dia</label><select id="h-dia" name="dia">${opcoes([1, 2, 3, 4, 5, 6].map((d) => [d, DIAS[d]]))}</select></div>
        <div class="campo"><label for="h-ini">Início</label><input id="h-ini" name="inicio" type="time" required></div>
        <div class="campo"><label for="h-fim">Fim</label><input id="h-fim" name="fim" type="time" required></div>
        <div class="campo"><label for="h-t">Tempos</label><select id="h-t" name="tempos">${opcoes([1, 2, 3, 4].map((n) => [n, n]))}</select></div></div>
        <button class="btn secundario" type="submit">Adicionar horário</button></form></section>`}`,
      "turmas"
    );
  }
  async function telaTurmaAlunos(id) {
    const turma = (await q(sb.from("turmas").select("*").eq("id", id)))[0];
    if (!turma) throw new ErroUsuario("Turma não encontrada no seu escopo.", "NAO_ENCONTRADO");
    const mats = await matriculasDaTurma(id);
    return shell(
      `<div class="trilha"><a href="#/turmas">← Turmas</a></div>${cabecalho(`Estudantes — Turma ${turma.codigo}`, esc(`${turma.serie} · ${turma.ano}`), '<a class="btn secundario" href="#/estudantes">Importar planilha</a>')}
    <section class="cartao"><div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Nº</th><th>Estudante</th><th>Matrícula</th><th>Início</th><th>Fim</th><th>Situação</th><th></th></tr></thead><tbody>
    ${mats.map((m) => `<tr><td class="num">${m.numero ?? ""}</td><td class="nome">${esc(nomeAluno(m))}</td><td>${esc(m.alunos?.matricula)}</td><td>${fmtData(m.inicio)}</td><td>${fmtData(m.fim)}</td><td>${m.status === "ativa" ? etq("verde", "ativa") : etq("cinza", m.status)}</td>
      <td>${m.status === "ativa" ? `<button type="button" class="btn pequeno fantasma" data-acao="matricula-encerrar" data-id="${m.id}">Transferência / saída</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="7" class="muted">Nenhum estudante.</td></tr>'}
    </tbody></table></div></section>`,
      "turmas"
    );
  }
  const CATEGORIAS_AVAL = {
    teste: { rotulo: "Teste", componente: "TESTE", tipo: "regular", base: "Teste" },
    avaliacao: { rotulo: "Avaliação (prova)", componente: "AVALIACAO", tipo: "regular", base: "Avaliação" },
    segunda: { rotulo: "2ª chamada", componente: null, tipo: "segunda_chamada", base: "2ª chamada" },
    recuperacao: { rotulo: "Recuperação", componente: "AVALIACAO", tipo: "recuperacao", base: "Recuperação" },
    outra: { rotulo: "Outra atividade (não entra na média)", componente: "PROJETO", tipo: "especial", base: "Trabalho" }
  };
  function composicaoTexto(regra, comp) {
    const c = (regra?.definicao?.componentes || []).find((x) => x.codigo === comp);
    if (!c) return "";
    return c.composicao === "soma_pontos" ? "soma dos pontos (cada um com o seu valor)" : c.composicao === "unica" ? "um único instrumento (vale 10)" : "média dos instrumentos (cada um vale 10)";
  }
  function proximoNome(base2, avals, tdIds) {
    const usados = avals.filter((a) => !tdIds.length || tdIds.includes(a.td_id)).map((a) => a.nome.toLowerCase());
    if (base2 === "Avaliação" || base2 === "Recuperação") {
      if (!usados.includes(base2.toLowerCase())) return base2;
    }
    for (let n = 1; n < 100; n++) if (!usados.includes(`${base2} ${n}`.toLowerCase())) return `${base2} ${n}`;
    return base2;
  }
  async function telaAvaliacoes(rq) {
    const b = await base();
    const p = porId(b.periodos, rq.get("periodo")) || periodoAtual(b);
    if (!p) return shell(`${cabecalho("Avaliações", "")}${aviso("alerta", "Nenhum período letivo cadastrado.")}`, "avaliacoes");
    const lista = (await tds()).filter((t) => t.ativo && t.turmas?.ano === p.ano);
    const [avals, regras] = await Promise.all([
      q(sb.from("avaliacoes").select("*").eq("periodo_id", p.id).order("criado_em")),
      q(sb.from("regras_avaliacao").select("*").eq("status", "aprovada"))
    ]);
    const meusTds = lista.filter((t) => tem("diretor") || (S.ctx.escopos || []).includes(t.turmas.segmento));
    const porTd = agrupar(avals, (a) => a.td_id);
    const porTurma = agrupar(meusTds, (t) => t.turmas.codigo);
    const regraDe = (t) => regraVigente(regras, t.turmas.segmento, p.inicio);
    const segs = [...new Set(meusTds.map((t) => t.turmas.segmento))];
    const resumoRegras = segs.map((sg) => {
      const r = regraVigente(regras, sg, p.inicio);
      return r ? `<li><strong>${esc(SEGMENTOS[sg] || sg)}</strong>: Teste = ${esc(composicaoTexto(r, "TESTE"))}; Avaliação = ${esc(composicaoTexto(r, "AVALIACAO"))}.</li>` : "";
    }).join("");
    const temSoma = segs.some((sg) => (regraVigente(regras, sg, p.inicio)?.definicao?.componentes || []).some((c) => c.composicao === "soma_pontos"));
    E.aval = { avals, tds: meusTds.map((t) => t.id) };
    const aberto = p.status === "aberto";
    return shell(
      `${cabecalho("Avaliações", `${esc(p.nome)} ${p.ano} · ${esc(p.status)}`, seletorPeriodo(b, p, "#/avaliacoes"))}
    <details class="cartao"><summary><strong>Como as notas viram média</strong></summary><ul class="pequeno">${resumoRegras}</ul>
      <p class="pequeno muted">${temSoma ? "Com “soma dos pontos”, dê a cada teste o valor que quiser (ex.: Teste 1 = 4, Teste 2 = 6): o sistema soma os pontos e converte para a escala de 10." : 'Para dar valores diferentes a cada teste (ex.: Teste 1 = 4 pontos, Teste 2 = 6 pontos), a direção aprova a regra “soma dos pontos” em <a href="#/regras">Regras de avaliação</a>.'}</p></details>
    ${!aberto ? aviso("info", "Período fechado: não é possível adicionar avaliações.") : `
    <section class="cartao"><h2>Adicionar avaliação</h2>
      <div class="acoes-rapidas linha" role="group" aria-label="Adicionar rapidamente">
        ${Object.entries(CATEGORIAS_AVAL).map(([k, c]) => `<button type="button" class="btn ${k === "teste" || k === "avaliacao" ? "" : "secundario"}" data-acao="aval-rapida" data-cat="${k}">+ ${esc(c.rotulo.replace(" (não entra na média)", ""))}</button>`).join("")}
      </div>
      <form data-form="avaliacao-criar" data-periodo="${p.id}" class="mt-2"><div id="msg-aval"></div>
        <input type="hidden" name="categoria" value="teste">
        <div class="form-linha">
          <div class="campo"><label for="av-nome">Nome</label><input id="av-nome" name="nome" type="text" required maxlength="60" value="${esc(proximoNome("Teste", avals, []))}"></div>
          <div class="campo"><label for="av-cat">Tipo</label><select id="av-cat" name="cat" data-campo-aval="categoria">${opcoes(Object.entries(CATEGORIAS_AVAL).map(([k, c]) => [k, c.rotulo]), "teste")}</select></div>
          <div class="campo"><label for="av-max">Valor (pontos)</label><input id="av-max" name="nota_maxima" type="number" step="0.5" min="0.5" max="10" value="10" required></div>
          <div class="campo campo-substitui" hidden><label for="av-sub">2ª chamada de</label><select id="av-sub" name="substitui">${opcoes([["", "—"], ...[...new Map(avals.filter((a) => a.tipo === "regular").map((a) => [a.nome, a.componente])).entries()].map(([n, c]) => [`${c}|${n}`, n])])}</select></div>
          <div class="campo"><label for="av-data">Data de aplicação</label><input id="av-data" name="data" type="date" min="${p.inicio}" max="${p.fim}"></div>
          <div class="campo"><label for="av-prazo">Prazo para lançar notas</label><input id="av-prazo" name="prazo" type="date" value="${p.prazo || ""}"></div>
        </div>
        <fieldset><legend>Em quais turmas? (${meusTds.length})</legend>
          <div class="linha mb-1"><button type="button" class="btn pequeno fantasma" data-acao="marcar-todas-tds">Marcar todas</button><button type="button" class="btn pequeno fantasma" data-acao="desmarcar-tds">Desmarcar</button></div>
          <div class="grade grade-3">${[...porTurma.entries()].map(([cod, ts]) => `<div class="grupo-turma"><strong>Turma ${esc(cod)}</strong>${ts.map((t) => `<label class="checks"><input type="checkbox" name="td" value="${t.id}"> ${esc(t.disciplinas.nome)}</label>`).join("")}</div>`).join("")}</div>
        </fieldset>
        <button class="btn grande" type="submit">Adicionar</button></form></section>`}
    ${[...porTurma.entries()].map(([cod, ts]) => `<section class="cartao"><h2>Turma ${esc(cod)}</h2>
      ${ts.map((t) => {
        const as = porTd.get(t.id) || [];
        const regra = regraDe(t);
        const somaT = (regra?.definicao?.componentes || []).some((c) => c.codigo === "TESTE" && c.composicao === "soma_pontos");
        const totalTestes = as.filter((a) => a.componente === "TESTE" && a.tipo === "regular").reduce((s2, a) => s2 + Number(a.nota_maxima), 0);
        return `<div class="bloco-td"><div class="linha"><strong>${esc(t.disciplinas.nome)}</strong><span class="muted pequeno">${esc(t.perfis?.nome || "sem professor")}</span>
          ${somaT && as.some((a) => a.componente === "TESTE") ? `<span class="espaco"></span>${etq(totalTestes === 10 ? "verde" : "amarela", `Testes somam ${fmtNota(totalTestes)} pts`)}` : ""}</div>
        ${as.length ? `<table class="tabela mt-1"><thead><tr><th>Avaliação</th><th>Tipo</th><th class="num">Valor</th><th>Data</th><th>Prazo</th><th>Situação</th><th></th></tr></thead><tbody>
        ${as.map((a) => `<tr><td>${esc(a.nome)}</td><td class="pequeno">${esc(a.componente)}${a.tipo !== "regular" ? ` · ${esc(a.tipo.replace("_", " "))}` : ""}</td><td class="num">${fmtNota(a.nota_maxima)}</td><td>${fmtData(a.data)}</td><td>${fmtData(a.prazo)}</td>
          <td>${a.status === "liberada" ? etq("verde", "liberada") : etq("cinza", a.status)}</td>
          <td>${aberto ? `<details class="editar-aval"><summary class="btn pequeno fantasma">Editar</summary>
            <form data-form="avaliacao-editar" data-id="${a.id}" class="form-linha"><div class="campo"><label>Nome</label><input type="text" name="nome" value="${esc(a.nome)}" maxlength="60" required></div>
              <div class="campo"><label>Valor</label><input type="number" name="nota_maxima" step="0.5" min="0.5" max="10" value="${Number(a.nota_maxima)}"></div>
              <div class="campo"><label>Data</label><input type="date" name="data" value="${a.data || ""}" min="${p.inicio}" max="${p.fim}"></div>
              <div class="campo"><label>Prazo</label><input type="date" name="prazo" value="${a.prazo || ""}"></div>
              <div class="campo"><span class="rotulo-campo">&nbsp;</span><button class="btn pequeno" type="submit">Salvar</button></div></form></details>
            <div class="linha"><button type="button" class="btn pequeno fantasma" data-acao="avaliacao-status" data-id="${a.id}" data-status="${a.status === "liberada" ? "bloqueada" : "liberada"}">${a.status === "liberada" ? "Bloquear" : "Liberar"}</button>
            <button type="button" class="btn pequeno fantasma" data-acao="avaliacao-excluir" data-id="${a.id}">Excluir</button></div>` : ""}</td></tr>`).join("")}</tbody></table>` : '<p class="muted pequeno">Nenhuma avaliação ainda.</p>'}</div>`;
      }).join("")}</section>`).join("") || '<p class="muted">Nenhuma turma no seu escopo.</p>'}`,
      "avaliacoes"
    );
  }
  function aplicarCategoriaAval(cat) {
    const f = document.querySelector('form[data-form="avaliacao-criar"]');
    if (!f || !CATEGORIAS_AVAL[cat]) return;
    const c = CATEGORIAS_AVAL[cat];
    f.querySelector("#av-cat").value = cat;
    const marcados = [...f.querySelectorAll('input[name="td"]:checked')].map((x) => x.value);
    f.querySelector("#av-nome").value = cat === "segunda" ? "2ª chamada" : proximoNome(c.base, E.aval.avals, marcados);
    f.querySelector(".campo-substitui").hidden = cat !== "segunda";
    if (cat !== "segunda") f.querySelector("#av-max").value = "10";
    f.querySelector("#av-nome").focus();
    f.querySelector("#av-nome").select();
  }
  async function telaPeriodos() {
    invalidar("base");
    const b = await base();
    return shell(
      `${cabecalho("Períodos letivos", "Encerramento pela coordenação ou direção; homologação e reabertura somente pela direção")}
    <section class="cartao"><div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Período</th><th>Início</th><th>Fim</th><th>Prazo de lançamento</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
    ${b.periodos.map((p) => `<tr><td><strong>${esc(p.nome)}</strong> ${p.ano}</td><td>${fmtData(p.inicio)}</td><td>${fmtData(p.fim)}</td><td>${fmtData(p.prazo)}</td>
      <td>${p.status === "aberto" ? etq("verde", "aberto") : p.status === "encerrado" ? etq("amarela", "encerrado") : etq("azul", "homologado")}</td>
      <td><div class="linha">${p.status === "aberto" ? `<button type="button" class="btn pequeno secundario" data-acao="periodo" data-id="${p.id}" data-op="encerrar">Encerrar</button><a class="btn pequeno fantasma" href="#/periodo/${p.id}">Editar datas</a>` : ""}
        ${p.status === "encerrado" && tem("diretor") ? `<button type="button" class="btn pequeno" data-acao="periodo" data-id="${p.id}" data-op="homologar">Homologar</button><button type="button" class="btn pequeno fantasma" data-acao="periodo" data-id="${p.id}" data-op="reabrir">Reabrir</button>` : ""}</div></td></tr>`).join("")}
    </tbody></table></div><p class="pequeno muted">Ao encerrar, as médias finais são gravadas com a versão da regra vigente. Depois do encerramento, correções só por retificação aprovada; após a homologação, somente a direção aprova retificações.</p></section>
    <section class="cartao"><h2>Novo período</h2><form data-form="periodo-criar"><div id="msg-periodo"></div><div class="form-linha">
      <div class="campo"><label for="pe-nome">Nome</label><input id="pe-nome" name="nome" required maxlength="40" placeholder="ex.: 4º Bimestre"></div>
      <div class="campo"><label for="pe-ano">Ano</label><input id="pe-ano" name="ano" type="number" min="2024" max="2100" value="${(b.periodos.at(-1) || {}).ano || hoje().slice(0, 4)}" required></div>
      <div class="campo"><label for="pe-ordem">Ordem</label><input id="pe-ordem" name="ordem" type="number" min="1" max="12" required></div>
      <div class="campo"><label for="pe-ini">Início</label><input id="pe-ini" name="inicio" type="date" required></div>
      <div class="campo"><label for="pe-fim">Fim</label><input id="pe-fim" name="fim" type="date" required></div>
      <div class="campo"><label for="pe-prazo">Prazo</label><input id="pe-prazo" name="prazo" type="date"></div></div>
      <button class="btn secundario" type="submit">Criar período</button></form></section>
    <section class="cartao"><h2>Calendário (dias sem aula)</h2>
      <table class="tabela"><tbody>${b.calendario.map((c) => `<tr><td>${fmtData(c.data)}</td><td>${esc(c.tipo)}</td><td>${esc(c.descricao)}</td><td><button type="button" class="btn pequeno fantasma" data-acao="calendario-remover" data-data="${c.data}" data-tipo="${esc(c.tipo)}">Remover</button></td></tr>`).join("") || '<tr><td class="muted">Nenhuma data cadastrada.</td></tr>'}</tbody></table>
      <form data-form="calendario" class="form-linha mt-1"><div class="campo"><label for="ca-data">Data</label><input id="ca-data" name="data" type="date" required></div>
      <div class="campo"><label for="ca-tipo">Tipo</label><select id="ca-tipo" name="tipo">${opcoes([["feriado", "Feriado"], ["recesso", "Recesso"], ["suspensao", "Suspensão de aulas"], ["evento", "Evento (com aula)"]])}</select></div>
      <div class="campo"><label for="ca-desc">Descrição</label><input id="ca-desc" name="descricao" required maxlength="120"></div><div class="campo"><span class="rotulo-campo">&nbsp;</span><button class="btn secundario" type="submit">Adicionar</button></div></form><div id="msg-cal"></div></section>`,
      "periodos"
    );
  }
  async function telaPeriodoEditar(id) {
    const b = await base();
    const p = porId(b.periodos, id);
    if (!p) throw new ErroUsuario("Período não encontrado.", "NAO_ENCONTRADO");
    return shell(
      `<div class="trilha"><a href="#/periodos">← Períodos</a></div>${cabecalho(`Editar ${p.nome} ${p.ano}`, "")}
    <section class="cartao"><form data-form="periodo-editar" data-id="${p.id}"><div id="msg-periodo"></div><div class="form-linha">
      <div class="campo"><label for="pe-nome">Nome</label><input id="pe-nome" name="nome" value="${esc(p.nome)}" required maxlength="40"></div>
      <div class="campo"><label for="pe-ini">Início</label><input id="pe-ini" name="inicio" type="date" value="${p.inicio}" required></div>
      <div class="campo"><label for="pe-fim">Fim</label><input id="pe-fim" name="fim" type="date" value="${p.fim}" required></div>
      <div class="campo"><label for="pe-prazo">Prazo de lançamento</label><input id="pe-prazo" name="prazo" type="date" value="${p.prazo || ""}"></div></div>
      <button class="btn" type="submit">Salvar</button></form></section>`,
      "periodos"
    );
  }
  async function telaRetificacoes() {
    const [lista, todosTds] = await Promise.all([q(sb.from("retificacoes").select("*").order("solicitado_em", { ascending: false }).limit(300)), tds()]);
    const pessoas = gestor() ? new Map((await q(sb.from("perfis").select("id, nome"))).map((p) => [p.id, p.nome])) : /* @__PURE__ */ new Map([[S.ctx.usuario_id, S.ctx.nome]]);
    const descr = (r) => r.tipo === "nota" ? `Nota: ${r.dados.situacao === "lancada" ? fmtNota(r.dados.valor) : r.dados.situacao} (antes: ${r.anterior ? r.anterior.situacao === "lancada" ? fmtNota(r.anterior.valor) : r.anterior.situacao : "sem lançamento"})` : `Frequência: ${ROTULO_FREQ[r.dados.status] || r.dados.status} (antes: ${r.anterior ? ROTULO_FREQ[r.anterior.status] : "—"})`;
    const podeDecidir = (r) => r.status === "pendente" && gestor() && r.solicitado_por !== S.ctx.usuario_id;
    return shell(
      `${cabecalho("Retificações", "Correções de registros de períodos encerrados — exigem justificativa e decisão da coordenação/direção")}
    <section class="cartao"><div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Solicitada em</th><th>Turma · Disciplina</th><th>Correção pedida</th><th>Motivo</th><th>Solicitante</th><th>Situação</th><th></th></tr></thead><tbody>
    ${lista.map((r) => `<tr><td>${fmtDataHora(r.solicitado_em)}</td><td>${esc(rotuloTd(porId(todosTds, r.td_id)))}</td><td>${esc(descr(r))}</td><td class="pequeno">${esc(r.justificativa)}</td><td>${esc(pessoas.get(r.solicitado_por) || "—")}</td>
      <td>${r.status === "pendente" ? etq("amarela", "pendente") : r.status === "aplicada" ? etq("verde", "aplicada") : etq("vermelha", "rejeitada")}${r.parecer ? `<br><span class="pequeno muted">${esc(r.parecer)}</span>` : ""}</td>
      <td>${podeDecidir(r) ? `<form data-form="retificacao-decidir" data-id="${r.id}" class="pilha"><input name="parecer" placeholder="Parecer (obrigatório)" required minlength="5" maxlength="500" aria-label="Parecer">
        <div class="linha"><button class="btn pequeno" type="submit" name="decisao" value="1">Aprovar e aplicar</button><button class="btn pequeno perigo" type="submit" name="decisao" value="0">Rejeitar</button></div></form>` : ""}</td></tr>`).join("") || '<tr><td colspan="7" class="muted">Nenhuma retificação.</td></tr>'}
    </tbody></table></div></section>`,
      "retificacoes"
    );
  }
  async function telaRegras() {
    const b = await base();
    const regras = await q(sb.from("regras_avaliacao").select("*").order("versao", { ascending: false }));
    const atual = regras.find((r) => r.status === "aprovada" && !r.vigencia_fim) || regras.find((r) => r.status === "aprovada");
    const d = atual?.definicao || {};
    const comp = (c) => (d.componentes || []).find((x) => x.codigo === c) || {};
    return shell(
      `${cabecalho("Regras de avaliação", "Versionadas: cada média gravada guarda a versão da regra usada; nova versão vale a partir da data de vigência")}
    <section class="cartao"><div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Versão</th><th>Nome</th><th>Segmento</th><th>Fórmula</th><th>Vigência</th><th>Situação</th><th></th></tr></thead><tbody>
    ${regras.map((r) => `<tr><td class="num">${r.versao}</td><td>${esc(r.nome)}</td><td>${esc(r.segmento ? SEGMENTOS[r.segmento] || r.segmento : "Todos")}</td><td class="pequeno">${esc(descreverRegra(r.definicao))}</td>
      <td>${fmtData(r.vigencia_inicio)}${r.vigencia_fim ? ` a ${fmtData(r.vigencia_fim)}` : ""}</td><td>${r.status === "aprovada" ? etq("verde", "aprovada") : etq("amarela", r.status)}</td>
      <td>${r.status === "rascunho" && tem("diretor") ? `<button type="button" class="btn pequeno" data-acao="regra-aprovar" data-id="${r.id}">Aprovar</button>` : ""}</td></tr>
      ${(r.definicao.pendencias_institucionais || []).length && r === atual ? `<tr><td></td><td colspan="6"><details><summary class="pequeno">Pendências institucionais registradas</summary><ul class="pequeno">${r.definicao.pendencias_institucionais.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details></td></tr>` : ""}`).join("")}
    </tbody></table></div></section>
    <section class="cartao"><h2>Propor nova versão</h2><form data-form="regra-propor"><div id="msg-regra"></div><div class="form-linha">
      <div class="campo"><label for="rg-nome">Nome</label><input id="rg-nome" name="nome" required maxlength="80" value="Regra de avaliação"></div>
      <div class="campo"><label for="rg-seg">Segmento</label><select id="rg-seg" name="segmento"><option value="">Todos</option>${opcoes(segmentosDoEscopo(b).map((s) => [s.codigo, s.nome]))}</select></div>
      <div class="campo"><label for="rg-vig">Vigência a partir de</label><input id="rg-vig" name="vigencia_inicio" type="date" required></div></div>
      <div class="form-linha">
      <div class="campo"><label for="rg-pt">Peso do Teste</label><input id="rg-pt" name="peso_teste" type="number" step="0.5" min="0.5" max="10" value="${comp("TESTE").peso ?? 1}"></div>
      <div class="campo"><label for="rg-pa">Peso da Avaliação</label><input id="rg-pa" name="peso_avaliacao" type="number" step="0.5" min="0.5" max="10" value="${comp("AVALIACAO").peso ?? 1}"></div>
      <div class="campo"><label for="rg-ct">Vários Testes</label><select id="rg-ct" name="composicao_teste">${opcoes([["media_aritmetica", "Média dos testes (cada um vale 10)"], ["soma_pontos", "Soma dos pontos (cada teste com seu valor)"], ["unica", "Apenas um Teste"]], comp("TESTE").composicao)}</select></div>
      <div class="campo"><label for="rg-arr">Arredondamento</label><select id="rg-arr" name="arredondamento">${opcoes([["meio_para_cima:2", "2 casas (meio para cima)"], ["meio_para_cima:1", "1 casa (meio para cima)"], ["truncar:1", "1 casa (truncar)"], ["multiplo:0.5", "múltiplo de 0,5"]], d.arredondamento ? d.arredondamento.modo === "multiplo_meio_para_cima" ? `multiplo:${d.arredondamento.multiplo}` : `${d.arredondamento.modo}:${d.arredondamento.casas}` : "meio_para_cima:2")}</select></div>
      <div class="campo"><label for="rg-rec">Recuperação</label><select id="rg-rec" name="recuperacao">${opcoes([["nenhuma", "Não altera a média"], ["substitui_se_maior", "Substitui a média se maior"]], d.recuperacao?.modo)}</select></div>
      <div class="campo"><label for="rg-ref">Média de referência (alerta)</label><input id="rg-ref" name="media_referencia" type="number" step="0.5" min="0" max="10" value="${d.media_referencia ?? 6}"></div></div>
      <div class="campo"><label for="rg-just">Justificativa institucional (obrigatória)</label><textarea id="rg-just" name="justificativa" minlength="15" maxlength="2000" required></textarea></div>
      <button class="btn secundario" type="submit">Enviar como rascunho</button>${tem("diretor") ? "" : ' <span class="pequeno muted">A aprovação é feita pela direção.</span>'}</form></section>`,
      "regras"
    );
  }
  async function telaEstudantes(resultado) {
    const b = await base();
    const ano = Number((periodoAtual(b) || {}).ano || hoje().slice(0, 4));
    return shell(
      `${cabecalho("Estudantes", "Importação da planilha oficial da secretaria (fonte oficial dos dados)")}
    <section class="cartao"><h2>Importar planilha (CSV)</h2>
      <p class="pequeno">Colunas (com cabeçalho): <code>matricula;nome;turma;numero;nascimento;inicio</code>. Separador ponto e vírgula ou vírgula; datas no formato AAAA-MM-DD ou DD/MM/AAAA. A importação é feita primeiro em <strong>simulação</strong>: nada é gravado até você confirmar.</p>
      <form data-form="importar"><div id="msg-importar"></div><div class="form-linha">
        <div class="campo"><label for="im-arq">Arquivo CSV</label><input id="im-arq" name="arquivo" type="file" accept=".csv,text/csv" required></div>
        <div class="campo"><label for="im-ano">Ano letivo</label><input id="im-ano" name="ano" type="number" min="2024" max="2100" value="${ano}" required></div></div>
        <button class="btn" type="submit">Simular importação</button></form>
      ${resultado || ""}</section>
    <p class="pequeno muted">Para consultar estudantes, abra a turma em “Turmas e diários”. Dados pessoais: use apenas o necessário (LGPD).</p>`,
      "estudantes"
    );
  }
  function lerCsv(texto) {
    const linhas = texto.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
    if (!linhas.length) return [];
    const sep = (linhas[0].match(/;/g) || []).length >= (linhas[0].match(/,/g) || []).length ? ";" : ",";
    const partir = (l) => {
      const out = [];
      let cur = "", aspas = false;
      for (let i = 0; i < l.length; i++) {
        const ch = l[i];
        if (ch === '"') {
          if (aspas && l[i + 1] === '"') {
            cur += '"';
            i++;
          } else aspas = !aspas;
        } else if (ch === sep && !aspas) {
          out.push(cur.trim());
          cur = "";
        } else cur += ch;
      }
      out.push(cur.trim());
      return out;
    };
    const cab = partir(linhas[0]).map((c) => c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, ""));
    const idx = (n) => cab.indexOf(n);
    const data = (v) => /^\d{2}\/\d{2}\/\d{4}$/.test(v || "") ? v.split("/").reverse().join("-") : v || "";
    return linhas.slice(1).map((l, i) => {
      const c = partir(l);
      const g = (n) => idx(n) >= 0 ? c[idx(n)] || "" : "";
      return { linha: i + 2, matricula: g("matricula"), nome: g("nome"), turma: g("turma"), numero: g("numero"), nascimento: data(g("nascimento")), inicio: data(g("inicio")) };
    });
  }
  let importacaoPendente = null;
  function relatorioImportacao(r) {
    return `<div class="cartao mt-2"><h3>${r.simulacao ? "Simulação (nada foi gravado)" : "Importação concluída"}</h3>
  <p>${r.linhas} linha(s): <strong>${r.criados}</strong> estudante(s) novo(s), <strong>${r.atualizados}</strong> atualizado(s), <strong>${r.matriculas}</strong> matrícula(s) nova(s), ${r.sem_alteracao} sem alteração, <strong>${r.erros.length}</strong> com erro.</p>
  ${r.erros.length ? `<details open><summary>Erros</summary><ul class="pequeno">${r.erros.map((e) => `<li>Linha ${esc(e.linha)}: ${esc(e.erro)}</li>`).join("")}</ul></details>` : ""}
  ${r.simulacao && r.criados + r.atualizados + r.matriculas > 0 ? '<button type="button" class="btn" data-acao="importar-confirmar">Confirmar e gravar</button>' : ""}</div>`;
  }
  async function telaAuditoria(rq) {
    const tabela = rq.get("tabela") || "";
    let consulta = sb.from("auditoria").select("id, usuario_id, acao, tabela, registro_id, td_id, antes, depois, criado_em").order("id", { ascending: false }).limit(200);
    if (tabela) consulta = consulta.eq("tabela", tabela);
    const [ev, pessoas, todosTds] = await Promise.all([q(consulta), q(sb.from("perfis").select("id, nome")), tds()]);
    const nomes = new Map(pessoas.map((p) => [p.id, p.nome]));
    const resumo = (e) => {
      const x = e.depois || e.antes || {};
      if (e.tabela === "notas") return `${e.antes ? fmtNota(e.antes.valor) || e.antes.situacao : "∅"} → ${e.depois ? fmtNota(e.depois.valor) || e.depois.situacao : "∅"}`;
      if (e.tabela === "frequencias") return `${e.antes?.status || "∅"} → ${e.depois?.status || "∅"}`;
      if (e.tabela === "acessos") return Object.entries(x).filter(([k]) => k !== "alvo").map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(",") : v}`).join(" · ").slice(0, 160);
      return x.nome || x.codigo || x.data || "";
    };
    return shell(
      `${cabecalho("Auditoria", "Últimos 200 registros (imutáveis)")}
    <div class="linha mb-2"><label class="linha"><span class="rotulo-campo">Filtrar</span><select data-ir-param="#/auditoria" data-param="tabela">${opcoes([["", "Tudo"], ["notas", "Notas"], ["frequencias", "Frequência"], ["aulas", "Aulas"], ["avaliacoes", "Avaliações"], ["periodos", "Períodos"], ["retificacoes", "Retificações"], ["acessos", "Acessos"], ["perfis", "Perfis"], ["matriculas", "Matrículas"], ["regras_avaliacao", "Regras"]], tabela)}</select></label></div>
    <section class="cartao"><div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Onde</th><th>Turma · Disciplina</th><th>Detalhe</th></tr></thead><tbody>
    ${ev.map((e) => `<tr><td class="pequeno">${fmtDataHora(e.criado_em)}</td><td>${esc(nomes.get(e.usuario_id) || (e.usuario_id ? "outro usuário" : "sistema"))}</td><td>${esc(e.acao)}</td><td>${esc(e.tabela || "")}</td><td class="pequeno">${e.td_id ? esc(rotuloTd(porId(todosTds, e.td_id))) : ""}</td><td class="pequeno">${esc(resumo(e))}</td></tr>`).join("") || '<tr><td colspan="6" class="muted">Sem registros.</td></tr>'}
    </tbody></table></div></section>`,
      "auditoria"
    );
  }
  let credencialRecente = null;
  function situacaoConta(p) {
    const s = [];
    s.push(p.ativo ? etq("verde", "ativa") : etq("vermelha", "desativada"));
    if (p.deve_trocar_senha) s.push(etq("amarela", "senha provisória"));
    if (p.mfa) s.push(etq("azul", "2º fator"));
    return s.join(" ");
  }
  function papeisTexto(p) {
    return `${p.papeis.map((x) => NOMES_PAPEL[x]).join(", ")}${p.escopos?.length ? ` <span class="muted pequeno">(${esc(p.escopos.join(", "))})</span>` : ""}`;
  }
  function acoesConta(p, plataforma) {
    const pode = plataforma || !p.papeis.includes("diretor");
    if (!pode || p.id === S.ctx.usuario_id) return "";
    return `<div class="linha"><button type="button" class="btn pequeno secundario" data-acao="conta-senha" data-id="${p.id}" data-nome="${esc(p.nome)}">Nova senha</button>
    ${p.mfa ? `<button type="button" class="btn pequeno fantasma" data-acao="conta-mfa" data-id="${p.id}" data-nome="${esc(p.nome)}">Redefinir 2º fator</button>` : ""}
    <button type="button" class="btn pequeno ${p.ativo ? "perigo" : ""}" data-acao="conta-ativar" data-id="${p.id}" data-ativo="${p.ativo ? "0" : "1"}" data-nome="${esc(p.nome)}">${p.ativo ? "Desativar" : "Reativar"}</button>
    ${plataforma ? "" : `<a class="btn pequeno fantasma" href="#/equipe/${p.id}">Editar</a>`}</div>`;
  }
  async function telaEquipe() {
    const r = await acessos("equipe_listar");
    const b = await base();
    const segs = b.segmentos.filter((s) => s.habilitado);
    const cred = credencialRecente;
    credencialRecente = null;
    return shell(
      `${cabecalho("Equipe e acessos", `${esc(r.escola.nome)} · código da escola <code>${esc(r.escola.codigo)}</code>`)}
    ${cred ? cred.html || cartaoCredencial(cred.dados, cred.titulo) : ""}
    <section class="cartao"><h2>Cadastrar pessoa da equipe</h2>
    <form data-form="membro-criar"><div id="msg-membro"></div><div class="form-linha">
      <div class="campo"><label for="mb-nome">Nome completo</label><input id="mb-nome" name="nome" required minlength="3" maxlength="120" data-sugerir-usuario></div>
      <div class="campo"><label for="mb-usuario">Usuário (gerado; pode ajustar)</label><input id="mb-usuario" name="usuario" maxlength="30" pattern="[a-z0-9]+([._\\-][a-z0-9]+)*" autocapitalize="none" placeholder="nome.sobrenome"></div>
      <div class="campo"><label for="mb-email">E-mail de contato (opcional)</label><input id="mb-email" name="email" type="email" maxlength="120"></div></div>
      <fieldset class="checks"><legend>Perfil de acesso</legend><label><input type="checkbox" name="papel" value="professor" checked> Professor(a)</label> <label><input type="checkbox" name="papel" value="coordenador"> Coordenação</label></fieldset>
      <fieldset class="checks"><legend>Segmentos acompanhados pela coordenação</legend>${segs.map((s) => `<label><input type="checkbox" name="escopo" value="${esc(s.codigo)}"> ${esc(s.nome)}</label>`).join(" ")}</fieldset>
      <button class="btn" type="submit">Criar acesso</button></form>
      <p class="pequeno muted">O sistema gera o usuário e uma senha provisória. No primeiro acesso a pessoa define a própria senha${S.ctx.escola?.exige_mfa_gestao ? "; contas de coordenação também configuram o aplicativo autenticador" : ""}. O e-mail de contato é apenas cadastral: o login é <strong>código da escola + usuário</strong>.</p></section>
    <section class="cartao"><h2>Equipe (${r.equipe.length})</h2><div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Nome</th><th>Usuário</th><th>Perfil</th><th>Situação</th><th>Último acesso</th><th class="num">Vínculos</th><th>Ações</th></tr></thead><tbody>
    ${r.equipe.map((p) => `<tr><td>${esc(p.nome)}</td><td><code>${esc(p.usuario)}</code></td><td>${papeisTexto(p)}</td><td>${situacaoConta(p)}</td><td class="pequeno">${fmtDataHora(p.ultimo_acesso)}</td><td class="num">${p.vinculos}</td><td>${acoesConta(p, false)}</td></tr>`).join("")}
    </tbody></table></div><p class="pequeno muted">Contas da direção são administradas pela plataforma. Desativar bloqueia o login e encerra as sessões abertas na hora; o histórico de registros é preservado.</p></section>`,
      "equipe"
    );
  }
  async function telaMembroEditar(id) {
    const r = await acessos("equipe_listar");
    const p = r.equipe.find((x) => x.id === id);
    if (!p || p.papeis.includes("diretor")) throw new ErroUsuario("Pessoa não encontrada (ou conta da direção, administrada pela plataforma).", "NAO_ENCONTRADO");
    const b = await base();
    return shell(
      `<div class="trilha"><a href="#/equipe">← Equipe</a></div>${cabecalho(`Editar acesso — ${p.nome}`, `usuário <code>${esc(p.usuario)}</code>`)}
    <section class="cartao"><form data-form="membro-editar" data-id="${p.id}"><div id="msg-membro"></div>
      <div class="campo"><label for="me-nome">Nome</label><input id="me-nome" name="nome" value="${esc(p.nome)}" required maxlength="120"></div>
      <div class="campo"><label for="me-email">E-mail de contato</label><input id="me-email" name="email" type="email" value="${esc(p.email_contato || "")}" maxlength="120"></div>
      <fieldset class="checks"><legend>Perfil</legend><label><input type="checkbox" name="papel" value="professor" ${p.papeis.includes("professor") ? "checked" : ""}> Professor(a)</label> <label><input type="checkbox" name="papel" value="coordenador" ${p.papeis.includes("coordenador") ? "checked" : ""}> Coordenação</label></fieldset>
      <fieldset class="checks"><legend>Segmentos (coordenação)</legend>${b.segmentos.filter((s) => s.habilitado).map((s) => `<label><input type="checkbox" name="escopo" value="${esc(s.codigo)}" ${p.escopos.includes(s.codigo) ? "checked" : ""}> ${esc(s.nome)}</label>`).join(" ")}</fieldset>
      <button class="btn" type="submit">Salvar</button></form><p class="pequeno muted">As novas permissões valem no próximo login (as sessões abertas da pessoa são encerradas).</p></section>`,
      "equipe"
    );
  }
  async function telaPlataforma(rq) {
    const r = await acessos("escolas_listar");
    const cred = credencialRecente;
    credencialRecente = null;
    const ver = rq.get("escola");
    let equipe = "";
    if (ver) {
      const e = r.escolas.find((x) => x.id === ver);
      const eq = await acessos("escola_equipe", { escola_id: ver });
      equipe = `<section class="cartao" id="equipe-escola"><h2>Equipe — ${esc(e?.nome || "")}</h2><div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Nome</th><th>Usuário</th><th>Perfil</th><th>Situação</th><th>Último acesso</th><th>Ações</th></tr></thead><tbody>
      ${eq.equipe.map((p) => `<tr><td>${esc(p.nome)}</td><td><code>${esc(p.usuario)}</code></td><td>${papeisTexto(p)}</td><td>${situacaoConta(p)}</td><td class="pequeno">${fmtDataHora(p.ultimo_acesso)}</td><td>${acoesConta(p, true)}</td></tr>`).join("")}
      </tbody></table></div>
      <form data-form="diretor-criar" data-escola="${esc(ver)}" class="mt-1"><div id="msg-diretor"></div><div class="form-linha">
        <div class="campo"><label for="nd-nome">Nova conta da direção — nome</label><input id="nd-nome" name="nome" required maxlength="120"></div>
        <div class="campo"><label for="nd-usuario">Usuário (opcional)</label><input id="nd-usuario" name="usuario" maxlength="30" autocapitalize="none"></div></div>
        <button class="btn secundario" type="submit">Criar conta da direção</button></form>
      <p class="pequeno muted">A plataforma não acessa notas, frequência ou dados de estudantes — apenas as contas.</p></section>`;
    }
    return shell(
      `${cabecalho("Escolas", "Cadastro de escolas e de suas contas da direção")}
    ${cred ? cred.html || cartaoCredencial(cred.dados, cred.titulo) : ""}${equipe}
    <section class="cartao"><div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Escola</th><th>Código</th><th>Situação</th><th>2º fator na gestão</th><th class="num">Usuários</th><th class="num">Turmas</th><th class="num">Estudantes</th><th>Direção</th><th>Ações</th></tr></thead><tbody>
    ${r.escolas.map((e) => `<tr><td><strong>${esc(e.nome)}</strong>${e.demonstracao ? ` ${etq("azul", "demonstração")}` : ""}<br><span class="pequeno muted">${esc([e.cidade, e.uf].filter(Boolean).join(" / "))}</span></td><td><code>${esc(e.codigo)}</code></td>
      <td>${e.status === "ativa" ? etq("verde", "ativa") : etq("vermelha", "suspensa")}</td><td>${e.exige_mfa_gestao ? "obrigatório" : "opcional"}</td><td class="num">${e.usuarios}</td><td class="num">${e.turmas}</td><td class="num">${e.alunos}</td>
      <td class="pequeno">${e.diretores.map((d) => esc(`${d.nome} (${d.usuario})`)).join("<br>") || "—"}</td>
      <td><div class="linha"><a class="btn pequeno secundario" href="#/plataforma?escola=${e.id}">Equipe</a>
        <button type="button" class="btn pequeno fantasma" data-acao="escola-status" data-id="${e.id}" data-status="${e.status === "ativa" ? "suspensa" : "ativa"}" data-nome="${esc(e.nome)}">${e.status === "ativa" ? "Suspender" : "Reativar"}</button>
        <button type="button" class="btn pequeno fantasma" data-acao="escola-mfa" data-id="${e.id}" data-mfa="${e.exige_mfa_gestao ? "0" : "1"}">${e.exige_mfa_gestao ? "Tornar 2º fator opcional" : "Exigir 2º fator"}</button></div></td></tr>`).join("") || '<tr><td colspan="9" class="muted">Nenhuma escola cadastrada.</td></tr>'}
    </tbody></table></div></section>
    <section class="cartao"><h2>Cadastrar escola</h2><form data-form="escola-criar"><div id="msg-escola"></div>
      <div class="form-linha"><div class="campo"><label for="es-nome">Nome da escola</label><input id="es-nome" name="nome" required maxlength="160"></div>
      <div class="campo"><label for="es-cod">Código de acesso (login)</label><input id="es-cod" name="codigo" required maxlength="30" pattern="[a-z0-9]+(-[a-z0-9]+)*" autocapitalize="none" placeholder="ex.: ceja-jpa"></div>
      <div class="campo"><label for="es-sigla">Sigla</label><input id="es-sigla" name="sigla" maxlength="20"></div></div>
      <div class="form-linha"><div class="campo"><label for="es-cid">Cidade</label><input id="es-cid" name="cidade" maxlength="80"></div>
      <div class="campo"><label for="es-uf">UF</label><input id="es-uf" name="uf" maxlength="2" pattern="[A-Za-z]{2}"></div>
      <div class="campo"><label for="es-ano">Ano letivo inicial</label><input id="es-ano" name="ano" type="number" min="2024" max="2100" value="${Math.max(2027, Number(hoje().slice(0, 4)))}"></div></div>
      <label class="checks"><input type="checkbox" name="exige_mfa_gestao" value="1" checked> Exigir segundo fator (aplicativo autenticador) para direção e coordenação <span class="muted">(recomendado)</span></label>
      <h3>Direção (conta principal da escola)</h3><div class="form-linha">
      <div class="campo"><label for="es-dnome">Nome do(a) diretor(a)</label><input id="es-dnome" name="diretor_nome" required maxlength="120"></div>
      <div class="campo"><label for="es-dusu">Usuário (opcional)</label><input id="es-dusu" name="diretor_usuario" maxlength="30" autocapitalize="none" placeholder="gerado a partir do nome"></div>
      <div class="campo"><label for="es-demail">E-mail de contato (opcional)</label><input id="es-demail" name="diretor_email" type="email" maxlength="120"></div></div>
      <button class="btn" type="submit">Cadastrar escola e direção</button></form>
      <p class="pequeno muted">A escola nasce com segmentos, 3 trimestres provisórios, 8 disciplinas e a regra de avaliação inicial (MÉDIA = (TESTE + AVALIAÇÃO) / 2). A direção ajusta o restante.</p></section>
    <section class="cartao"><h2>Escola de demonstração</h2><p class="pequeno">Cria uma escola com dados <strong>100% fictícios</strong> (6 turmas, estudantes, diário e notas do 1º trimestre de 2027) e 7 contas de teste.</p>
      <button type="button" class="btn secundario" data-acao="criar-demo">Criar escola de demonstração</button></section>`,
      "plataforma"
    );
  }
  function cartaoDemo(r) {
    return `<section class="cartao credencial"><h2>Escola de demonstração criada</h2><p class="pequeno">Código da escola: <code>${esc(r.escola.codigo)}</code>. Senhas provisórias (cada pessoa define a sua no primeiro acesso):</p>
  <table class="tabela"><thead><tr><th>Nome</th><th>Perfil</th><th>Usuário</th><th>Senha provisória</th></tr></thead><tbody>${r.contas.map((c) => `<tr><td>${esc(c.nome)}</td><td>${esc(c.papeis.map((p) => NOMES_PAPEL[p]).join(", "))}${c.escopos.length ? ` (${esc(c.escopos.join(", "))})` : ""}</td><td><code>${esc(c.usuario)}</code></td><td><code class="codigo-segredo">${esc(c.senha_provisoria)}</code></td></tr>`).join("")}</tbody></table>
  <div class="linha nao-imprimir mt-1"><button type="button" class="btn secundario" data-acao="imprimir-credencial">Imprimir</button></div><p class="pequeno muted">Estas senhas não serão mostradas de novo.</p></section>`;
  }
  function documento(titulo, meta, corpo, assinaturas) {
    return `<div class="nao-imprimir linha mb-2"><button type="button" class="btn secundario" data-acao="voltar">← Voltar</button><button type="button" class="btn" data-acao="imprimir">Imprimir</button></div>
  <article class="documento"><header class="cab-doc">${marca(64)}<div><div class="inst">${esc(nomeEscola())}</div><div class="titulo-doc">${esc(titulo)}</div></div></header>
  <div class="meta-doc">${meta.map(([k, v]) => `<span><b>${esc(k)}:</b> ${esc(v)}</span>`).join(" ")}</div>${corpo}
  <div class="assinaturas">${assinaturas.map((a) => `<div>${esc(a)}</div>`).join("")}</div>
  <footer class="rodape-doc">Emitido pelo CEJA OS em ${esc(fmtDataHora((/* @__PURE__ */ new Date()).toISOString()))} por ${esc(S.ctx.nome)} — documento registrado em auditoria.</footer></article>`;
  }
  async function telaRelatorio(tipo, tdId, rq) {
    const td = await carregarTd(tdId);
    const b = await base();
    const p = porId(b.periodos, rq.get("periodo")) || periodoAtual(b);
    const meta = [["Turma", td.turmas.codigo], ["Série", td.turmas.serie], ["Disciplina", td.disciplinas.nome], ["Professor(a)", td.perfis?.nome || (leciona(td) ? S.ctx.nome : "—")], ["Período", `${p.nome} ${p.ano} (${p.status})`]];
    await rpc("registrar_documento", { p_tipo: `relatorio_${tipo}`, p_referencia: td.id }).catch(() => {
    });
    if (tipo === "notas") {
      const [avals, mats, medias, regras] = await Promise.all([
        q(sb.from("avaliacoes").select("*").eq("td_id", td.id).eq("periodo_id", p.id).neq("status", "rascunho").order("criado_em")),
        matriculasDaTurma(td.turma_id),
        q(sb.from("medias").select("matricula_id, media, completa, regra_versao").eq("td_id", td.id).eq("periodo_id", p.id)),
        q(sb.from("regras_avaliacao").select("*").eq("status", "aprovada"))
      ]);
      const notas = avals.length ? await todas(() => sb.from("notas").select("avaliacao_id, matricula_id, valor, situacao").eq("td_id", td.id)) : [];
      const mapa = new Map(notas.map((n) => [`${n.avaliacao_id}|${n.matricula_id}`, n]));
      const mm = new Map(medias.map((m) => [m.matricula_id, m]));
      const regra = regraVigente(regras, td.turmas.segmento, p.inicio);
      const alunos = mats.filter((m) => m.status !== "cancelada" && m.inicio <= p.fim && (!m.fim || m.fim >= p.inicio));
      return documento(
        "Pauta de notas",
        [...meta, ["Regra", regra ? `${regra.nome} v${regra.versao}` : "—"]],
        `<table class="tabela"><thead><tr><th>Nº</th><th>Estudante</th>${avals.map((a) => `<th>${esc(a.nome)}</th>`).join("")}<th>Média</th></tr></thead><tbody>
      ${alunos.map((m) => `<tr><td>${m.numero ?? ""}</td><td>${esc(nomeAluno(m))}${m.status !== "ativa" ? ` (${esc(m.status)})` : ""}</td>${avals.map((a) => `<td class="centro">${esc(textoNota(mapa.get(`${a.id}|${m.id}`)) || "—")}</td>`).join("")}
        <td class="centro"><strong>${mm.get(m.id)?.completa ? fmtNota(mm.get(m.id).media) : "incompleta"}</strong></td></tr>`).join("")}</tbody></table>
      <p class="pequeno">${regra ? esc(descreverRegra(regra.definicao)) : ""}. F = falta; D = dispensado; nota ausente não é zero.</p>`,
        ["Professor(a)", "Coordenação", "Direção"]
      );
    }
    const d = await dadosDiario(td, p);
    if (tipo === "frequencia") {
      return documento(
        "Relatório de frequência",
        [...meta, ["Critério", `mínimo ${fmtPct(d.seg.minimo)} (${d.seg.contagem === "dia" ? "por dia letivo" : "por tempo de aula"})`]],
        `<table class="tabela"><thead><tr><th>Nº</th><th>Estudante</th><th>Registrados</th><th>Faltas</th><th>Frequência</th></tr></thead><tbody>
      ${d.alunos.map((x) => `<tr><td>${x.m.numero ?? ""}</td><td>${esc(nomeAluno(x.m))}</td><td class="centro">${x.total}</td><td class="centro">${x.faltas}</td><td class="centro">${fmtPct(x.pct)}${x.abaixo ? " ⚠" : ""}</td></tr>`).join("")}</tbody></table>`,
        ["Professor(a)", "Coordenação"]
      );
    }
    return documento(
      "Diário de classe — registro de aulas",
      [...meta, ["Aulas registradas", d.aulas.filter((a) => a.registrada_em).length]],
      `<table class="tabela"><thead><tr><th>Data</th><th>Horário</th><th>Tempos</th><th>Conteúdo</th><th>Frequência</th></tr></thead><tbody>
    ${d.aulas.map((a) => `<tr><td>${fmtData(a.data)}</td><td>${fmtHora(a.hora)}</td><td class="centro">${a.tempos}</td><td>${esc(a.campos?.conteudo || "(sem conteúdo)")}</td><td class="centro">${a.chamada_em ? `${(d.porAula.get(a.id) || []).filter((f) => f.status === "F" || f.status === "J").length} falta(s)` : "—"}</td></tr>`).join("")}</tbody></table>`,
      ["Professor(a)", "Coordenação", "Direção"]
    );
  }
  const TIPOS_ARQUIVO = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  const LIMITE_ARQUIVO = 20 * 1024 * 1024;
  const MODALIDADES = { comum: "Prova comum", adaptada: "Prova adaptada" };
  const fmtTamanho = (n) => n >= 1048576 ? `${(n / 1048576).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.ceil(n / 1024))} KB`;
  const prazoAberto = (p) => p.status === "aberto" && new Date(p.prazo).getTime() >= Date.now();
  function prazoEtiqueta(p) {
    if (p.status !== "aberto") return etq("cinza", "encerrado");
    const ms = new Date(p.prazo).getTime() - Date.now();
    if (ms < 0) return etq("vermelha", "prazo encerrado");
    const dias = Math.floor(ms / 864e5);
    return etq(dias < 2 ? "amarela" : "verde", dias >= 1 ? `faltam ${dias} dia(s)` : `faltam ${Math.max(1, Math.floor(ms / 36e5))} hora(s)`);
  }
  const etqEnvio = (e) => !e ? etq("cinza", "não enviada") : e.situacao === "aprovada" ? etq("verde", "aprovada") : e.situacao === "devolvida" ? etq("vermelha", "devolvida") : etq("azul", "enviada");
  function uuidAleatorio() {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    return [...b].map((x) => x.toString(16).padStart(2, "0")).join("").replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
  }
  const paraDataHoraLocal = (iso) => {
    const d = new Date(iso);
    const z = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
  };
  async function telaProvas() {
    const b = await base();
    const [pedidos, envios, todosTds] = await Promise.all([
      q(sb.from("prova_pedidos").select("*").order("prazo", { ascending: false }).limit(200)),
      todas(() => sb.from("prova_envios").select("*").order("enviado_em", { ascending: false })),
      tds()
    ]);
    const ultimo = (ped, td, mod) => envios.find((e) => e.pedido_id === ped && e.td_id === td && e.modalidade === mod) || null;
    const historico = (ped, td, mod) => envios.filter((e) => e.pedido_id === ped && e.td_id === td && e.modalidade === mod);
    const meus = todosTds.filter(leciona);
    const partes = [];
    if (tem("professor")) {
      const meusPedidos = pedidos.filter((p) => p.td_ids.some((id) => meus.some((t) => t.id === id)));
      partes.push(`<h2 class="mt-2">Minhas provas</h2>${meusPedidos.length ? "" : '<p class="muted">Nenhum pedido de prova da coordenação para as suas turmas.</p>'}
    ${meusPedidos.map((p) => {
        const aberto = prazoAberto(p);
        const mods = p.pede_adaptada ? ["comum", "adaptada"] : ["comum"];
        return `<section class="cartao"><div class="linha"><h3 class="sem-margem">${esc(p.titulo)}</h3><span class="espaco"></span>${prazoEtiqueta(p)}</div>
      <p class="pequeno">Entregar até <strong>${esc(fmtDataHora(p.prazo))}</strong>${p.pede_adaptada ? " · pede também a <strong>versão adaptada</strong>" : ""}</p>
      ${p.instrucoes ? `<p class="pequeno instrucoes">${esc(p.instrucoes)}</p>` : ""}
      <div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Turma · Disciplina</th>${mods.map((m) => `<th>${MODALIDADES[m]}</th>`).join("")}</tr></thead><tbody>
      ${meus.filter((t) => p.td_ids.includes(t.id)).map((t) => `<tr><td><strong>${esc(rotuloTd(t))}</strong></td>${mods.map((m) => {
          const e = ultimo(p.id, t.id, m);
          return `<td class="celula-prova">${etqEnvio(e)}${e ? ` <button type="button" class="btn-link" data-acao="prova-baixar" data-arquivo="${esc(e.arquivo)}" data-nome="${esc(e.nome_arquivo)}">${esc(e.nome_arquivo)}</button><span class="muted pequeno"> · ${esc(fmtDataHora(e.enviado_em))}</span>` : ""}
          ${e?.situacao === "devolvida" && e.parecer ? `<div class="aviso alerta pequeno">Coordenação: ${esc(e.parecer)}</div>` : ""}
          ${aberto && e?.situacao !== "aprovada" ? `<form data-form="prova-enviar" data-pedido="${p.id}" data-td="${t.id}" data-mod="${m}" class="envio-prova"><input type="file" name="arquivo" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required aria-label="${esc(MODALIDADES[m])} — ${esc(rotuloTd(t))}">
            <button class="btn pequeno" type="submit">${e ? "Enviar nova versão" : "Enviar"}</button></form>` : ""}</td>`;
        }).join("")}</tr>`).join("")}</tbody></table></div>
      <div id="msg-prova-${p.id}"></div></section>`;
      }).join("")}`);
    }
    if (gestor()) {
      const supervisionados = todosTds.filter((t) => tem("diretor") || (S.ctx.escopos || []).includes(t.turmas.segmento));
      const meusPedidos = pedidos.filter((p) => p.td_ids.some((id) => supervisionados.some((t) => t.id === id)));
      const periodo = periodoAtual(b);
      const ativos = supervisionados.filter((t) => t.ativo);
      const porTurma = agrupar(ativos, (t) => t.turmas.codigo);
      partes.push(`<h2 class="mt-3">Pedidos da coordenação</h2>
    <details class="cartao" ${meusPedidos.length ? "" : "open"}><summary><strong>+ Novo pedido de provas</strong></summary>
      <form data-form="prova-pedido" class="mt-1"><div id="msg-pedido"></div><div class="form-linha">
        <div class="campo"><label for="pp-titulo">Título</label><input id="pp-titulo" name="titulo" type="text" required maxlength="120" placeholder="ex.: Avaliação do 2º trimestre"></div>
        <div class="campo"><label for="pp-periodo">Período</label><select id="pp-periodo" name="periodo_id">${opcoes(b.periodos.map((x) => [x.id, `${x.nome} ${x.ano}`]), periodo?.id)}</select></div>
        <div class="campo"><label for="pp-prazo">Prazo de entrega</label><input id="pp-prazo" name="prazo" type="datetime-local" required></div></div>
        <div class="campo"><label for="pp-inst">Instruções aos professores (opcional)</label><textarea id="pp-inst" name="instrucoes" maxlength="2000" rows="2" placeholder="ex.: cabeçalho padrão, 10 questões, enviar gabarito na última página"></textarea></div>
        <label class="checks"><input type="checkbox" name="pede_adaptada" value="1" checked> Pedir também a <strong>prova adaptada</strong> (estudantes com necessidades específicas)</label>
        <fieldset><legend>Turmas e disciplinas</legend><div class="linha mb-1"><button type="button" class="btn pequeno fantasma" data-acao="marcar-todas-tds">Marcar todas</button><button type="button" class="btn pequeno fantasma" data-acao="desmarcar-tds">Desmarcar</button></div>
          <div class="grade grade-3">${[...porTurma.entries()].map(([cod, ts]) => `<div class="grupo-turma"><strong>Turma ${esc(cod)}</strong>${ts.map((t) => `<label class="checks"><input type="checkbox" name="td" value="${t.id}"> ${esc(t.disciplinas.nome)} <span class="muted pequeno">${esc(t.perfis?.nome || "")}</span></label>`).join("")}</div>`).join("")}</div></fieldset>
        <button class="btn" type="submit">Criar pedido</button></form></details>
    ${meusPedidos.map((p) => {
        const mods = p.pede_adaptada ? ["comum", "adaptada"] : ["comum"];
        const tdsPed = supervisionados.filter((t) => p.td_ids.includes(t.id));
        const conta = (m) => tdsPed.filter((t) => ultimo(p.id, t.id, m)).length;
        return `<section class="cartao"><div class="linha"><h3 class="sem-margem">${esc(p.titulo)}</h3>${prazoEtiqueta(p)}<span class="espaco"></span>
        ${mods.map((m) => etq(conta(m) === tdsPed.length ? "verde" : "amarela", `${MODALIDADES[m]}: ${conta(m)}/${tdsPed.length}`)).join(" ")}</div>
      <p class="pequeno">Prazo: <strong>${esc(fmtDataHora(p.prazo))}</strong>${p.instrucoes ? ` · ${esc(p.instrucoes)}` : ""}</p>
      <div class="linha mb-1"><details><summary class="btn pequeno secundario">Prorrogar prazo</summary>
        <form data-form="prova-prazo" data-id="${p.id}" class="linha mt-1"><input type="datetime-local" name="prazo" value="${paraDataHoraLocal(p.prazo)}" required aria-label="Novo prazo"><button class="btn pequeno" type="submit">Salvar prazo</button></form></details>
        <button type="button" class="btn pequeno fantasma" data-acao="prova-pedido-status" data-id="${p.id}" data-status="${p.status === "aberto" ? "encerrado" : "aberto"}">${p.status === "aberto" ? "Encerrar pedido" : "Reabrir pedido"}</button></div>
      <div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Turma · Disciplina</th><th>Professor(a)</th>${mods.map((m) => `<th>${MODALIDADES[m]}</th>`).join("")}</tr></thead><tbody>
      ${tdsPed.map((t) => `<tr><td><strong>${esc(rotuloTd(t))}</strong></td><td>${esc(t.perfis?.nome || "—")}</td>${mods.map((m) => {
          const e = ultimo(p.id, t.id, m);
          const n = historico(p.id, t.id, m).length;
          if (!e) return `<td>${etqEnvio(null)}</td>`;
          return `<td class="celula-prova">${etqEnvio(e)} <button type="button" class="btn-link" data-acao="prova-baixar" data-arquivo="${esc(e.arquivo)}" data-nome="${esc(e.nome_arquivo)}">${esc(e.nome_arquivo)}</button>
          <span class="muted pequeno">${esc(fmtTamanho(e.tamanho))} · ${esc(fmtDataHora(e.enviado_em))}${new Date(e.enviado_em) > new Date(p.prazo) ? " · após o prazo" : ""}${n > 1 ? ` · versão ${n}` : ""}</span>
          ${e.parecer ? `<div class="pequeno muted">Parecer: ${esc(e.parecer)}</div>` : ""}
          ${e.situacao !== "aprovada" ? `<div class="linha mt-1"><button type="button" class="btn pequeno" data-acao="prova-aprovar" data-id="${e.id}">Aprovar</button>
            <details><summary class="btn pequeno perigo">Devolver</summary><form data-form="prova-devolver" data-id="${e.id}" class="linha mt-1"><input type="text" name="parecer" required minlength="5" maxlength="1000" placeholder="O que precisa ser ajustado?" aria-label="Motivo da devolução"><button class="btn pequeno perigo" type="submit">Devolver ao professor</button></form></details></div>` : ""}</td>`;
        }).join("")}</tr>`).join("")}</tbody></table></div></section>`;
      }).join("") || '<p class="muted">Nenhum pedido criado ainda.</p>'}`);
    }
    return shell(`${cabecalho("Provas", "Envio das provas pelos professores e recebimento pela coordenação — arquivos guardados em depósito privado e seguro")}${partes.join("")}`, "provas");
  }
  function erroArmazenamento(e) {
    const m = String(e?.message || e || "");
    if (/row-level security|unauthorized|403|not allowed/i.test(m)) return new ErroUsuario("Envio não permitido: prazo encerrado, pedido fechado ou turma que não é sua.");
    if (/too large|size|413/i.test(m)) return new ErroUsuario("Arquivo grande demais (máximo 20 MB).");
    if (/mime|content type|invalid_mime/i.test(m)) return new ErroUsuario("Tipo de arquivo não aceito. Envie PDF ou Word (.pdf, .doc, .docx).");
    return traduzirErro(e);
  }
  async function enviarProva(f) {
    const arq = f.querySelector("input[type=file]").files[0];
    const alvo = document.getElementById(`msg-prova-${f.dataset.pedido}`);
    const bt = f.querySelector("button[type=submit]");
    try {
      if (!arq) throw new ErroUsuario("Escolha o arquivo da prova.");
      const ext = (arq.name.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase();
      if (!TIPOS_ARQUIVO[ext]) throw new ErroUsuario("Envie a prova em PDF ou Word (.pdf, .doc, .docx).");
      if (arq.size === 0) throw new ErroUsuario("O arquivo está vazio.");
      if (arq.size > LIMITE_ARQUIVO) throw new ErroUsuario("Arquivo grande demais (máximo 20 MB).");
      const caminho = `${S.ctx.escola.id}/${f.dataset.pedido}/${f.dataset.td}/${f.dataset.mod}/${uuidAleatorio()}.${ext}`;
      bt.textContent = "Enviando…";
      const up = await sb.storage.from("provas").upload(caminho, arq, { contentType: TIPOS_ARQUIVO[ext], upsert: false, cacheControl: "0" });
      if (up.error) throw erroArmazenamento(up.error);
      await rpc("prova_registrar_envio", { p_arquivo: caminho, p_nome_arquivo: arq.name });
      sucesso(`${MODALIDADES[f.dataset.mod]} enviada à coordenação: ${arq.name}`);
    } catch (e) {
      bt.textContent = "Enviar";
      if (alvo) alvo.innerHTML = aviso("erro", esc(traduzirErro(e).message));
    }
  }
  async function baixarArquivo(deposito, caminho, nome) {
    const { data, error } = await sb.storage.from(deposito).createSignedUrl(caminho, 120, { download: nome || true });
    if (error) throw erroArmazenamento(error);
    window.location.assign(data.signedUrl);
  }
  const TABELAS_BACKUP = [
    "escolas",
    "perfis",
    "segmentos",
    "periodos",
    "calendario",
    "disciplinas",
    "turmas",
    "alunos",
    "matriculas",
    "turma_disciplinas",
    "horarios",
    "aulas",
    "frequencias",
    "regras_avaliacao",
    "avaliacoes",
    "notas",
    "medias",
    "retificacoes",
    "prova_pedidos",
    "prova_envios",
    "auditoria"
  ];
  async function telaSeguranca() {
    const escola = S.ctx.escola;
    const [lista, eq] = await Promise.all([
      sb.storage.from("backups").list(escola.id, { limit: 100, sortBy: { column: "name", order: "desc" } }),
      acessos("equipe_listar")
    ]);
    const backups = (lista.data || []).filter((f) => /\.json(\.gz)?$/.test(f.name));
    const equipe = eq.equipe || [];
    const gestao = equipe.filter((p) => p.ativo && (p.papeis.includes("diretor") || p.papeis.includes("coordenador")));
    const semMfa = gestao.filter((p) => !p.mfa);
    const provisorias = equipe.filter((p) => p.ativo && p.deve_trocar_senha);
    const limite = Date.now() - 60 * 864e5;
    const parados = equipe.filter((p) => p.ativo && !p.deve_trocar_senha && (!p.ultimo_acesso || new Date(p.ultimo_acesso).getTime() < limite));
    const nomes = (l) => l.length ? `<ul class="pequeno">${l.map((p) => `<li>${esc(p.nome)} <span class="muted">(${esc(p.usuario)})</span></li>`).join("")}</ul>` : "";
    const ultimo = backups[0];
    const ultimoDia = ultimo ? ultimo.name.slice(0, 10) : null;
    const atrasado = !ultimoDia || Date.now() - (/* @__PURE__ */ new Date(`${ultimoDia}T12:00:00-03:00`)).getTime() > 2 * 864e5;
    return shell(
      `${cabecalho("Backup e segurança", esc(escola.nome))}
    <div class="grade grade-4 mb-2">
      ${indicador("Último backup automático", ultimoDia ? fmtData(ultimoDia) : "nenhum", "diário, às 03h17", atrasado ? "atencao" : "ok")}
      ${indicador("Gestão sem 2º fator", semMfa.length, escola.exige_mfa_gestao ? "o 2º fator é obrigatório na escola" : "2º fator opcional nesta escola", semMfa.length ? "critico" : "ok")}
      ${indicador("Senhas provisórias", provisorias.length, "ainda não fizeram o 1º acesso", provisorias.length ? "atencao" : "ok")}
      ${indicador("Sem acesso há 60+ dias", parados.length, "avalie desativar", parados.length ? "atencao" : "ok")}
    </div>
    <section class="cartao"><h2>Backups automáticos</h2>
      <p class="pequeno">Todo dia, de madrugada, o sistema grava uma cópia completa dos dados da escola (turmas, estudantes, diários, frequência, notas, médias, provas enviadas e auditoria) num depósito privado. Ficam guardados os últimos 35 dias. Só a direção consegue baixar.</p>
      ${backups.length ? `<div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Data</th><th class="num">Tamanho</th><th></th></tr></thead><tbody>
        ${backups.map((f) => `<tr><td>${fmtData(f.name.slice(0, 10))}</td><td class="num">${esc(fmtTamanho(f.metadata?.size || 0))}</td>
          <td><button type="button" class="btn pequeno secundario" data-acao="backup-baixar" data-arquivo="${esc(`${escola.id}/${f.name}`)}" data-nome="${esc(`ceja-os-${escola.codigo}-${f.name}`)}">Baixar</button></td></tr>`).join("")}
      </tbody></table></div>` : aviso("alerta", "Ainda não há backup automático desta escola. O primeiro é gerado na próxima madrugada.")}
      ${lista.error ? aviso("erro", "Não foi possível listar os backups.") : ""}</section>
    <section class="cartao"><h2>Cópia completa agora</h2>
      <p class="pequeno">Gera agora, no seu computador, um arquivo com todos os dados da escola. Guarde em local seguro — por exemplo, numa pasta do Google Drive institucional com acesso restrito à direção. <strong>O arquivo contém dados pessoais de estudantes (LGPD)</strong>: não envie por WhatsApp nem deixe em computadores compartilhados.</p>
      <button type="button" class="btn" data-acao="backup-agora">Baixar cópia completa</button> <span id="status-backup" class="status-salvamento" role="status"></span></section>
    <section class="cartao"><h2>Equipe</h2>
      ${semMfa.length ? `<p><strong>Gestão sem segundo fator (${semMfa.length})</strong> — peça para configurarem o aplicativo autenticador em “Minha conta”:</p>${nomes(semMfa)}` : "<p>Toda a gestão usa segundo fator.</p>"}
      ${provisorias.length ? `<p><strong>Ainda com senha provisória (${provisorias.length})</strong>:</p>${nomes(provisorias)}` : ""}
      ${parados.length ? `<p><strong>Sem acesso há mais de 60 dias (${parados.length})</strong> — se a pessoa saiu da escola, desative em <a href="#/equipe">Equipe e acessos</a>:</p>${nomes(parados)}` : ""}</section>
    <section class="cartao"><h2>Como os dados estão protegidos</h2><ul class="pequeno">
      <li>Cada pessoa só vê o que lhe cabe (professor: as próprias turmas; coordenação: o seu segmento; direção: a escola). A regra está no banco de dados, não só na tela.</li>
      <li>Senhas pessoais, segundo fator para a gestão, encerramento da sessão por inatividade e revogação imediata ao desativar alguém.</li>
      <li>Toda alteração de nota, frequência, aula, avaliação, prova e acesso fica registrada na auditoria, que não pode ser apagada.</li>
      <li>Provas enviadas ficam em depósito privado; ninguém altera nem apaga pelo sistema — cada reenvio vira uma nova versão.</li>
      <li>Backup automático diário (35 dias) + cópia completa sob demanda. No plano Pro do Supabase, há também o backup diário do banco inteiro.</li></ul></section>`,
      "seguranca"
    );
  }
  async function baixarCopiaCompleta() {
    const st = document.getElementById("status-backup");
    const tabelas = {};
    for (const [i, t] of TABELAS_BACKUP.entries()) {
      st.className = "status-salvamento pendente";
      st.textContent = `Lendo ${t} (${i + 1}/${TABELAS_BACKUP.length})…`;
      tabelas[t] = await todas(() => sb.from(t).select("*").order("id"));
    }
    const conteudo = {
      formato: "ceja-os-backup",
      versao: 1,
      origem: "manual",
      gerado_em: (/* @__PURE__ */ new Date()).toISOString(),
      gerado_por: S.ctx.nome,
      escola: { id: S.ctx.escola.id, codigo: S.ctx.escola.codigo, nome: S.ctx.escola.nome },
      contagens: Object.fromEntries(Object.entries(tabelas).map(([k, v]) => [k, v.length])),
      tabelas
    };
    const blob = new Blob([JSON.stringify(conteudo)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ceja-os-${S.ctx.escola.codigo}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 2e3);
    await rpc("registrar_documento", { p_tipo: "backup_manual", p_referencia: null }).catch(() => {
    });
    st.className = "status-salvamento ok";
    st.textContent = `Cópia gerada: ${Object.values(conteudo.contagens).reduce((s, n) => s + n, 0)} registros, ${fmtTamanho(blob.size)}.`;
  }
  const semAcesso = () => shell(`<div class="cartao"><h1>Acesso não permitido</h1><p>Esta área não está disponível para o seu perfil.</p><a class="btn" href="#/">Voltar ao início</a></div>`);
  const naoEncontrado = () => shell(`<div class="cartao"><h1>Não encontrado</h1><p>O endereço não existe ou o registro não está disponível para o seu acesso.</p><a class="btn" href="#/">Ir para o início</a></div>`);
  function rotaInicial() {
    if (S.ctx.plataforma) return "#/plataforma";
    if (gestor()) return "#/painel";
    if (tem("professor")) return "#/professor";
    return "#/conta";
  }
  async function resolver(p, rq) {
    const [r0, r1, r2] = p;
    const exige = (ok, f) => ok ? f() : semAcesso();
    if (S.ctx.plataforma && !["plataforma", "conta"].includes(r0 || "")) {
      location.replace("#/plataforma");
      return null;
    }
    switch (r0 || "") {
      case "":
        location.replace(rotaInicial());
        return null;
      case "professor":
        return exige(tem("professor"), telaProfessor);
      case "td": {
        const td = await carregarTd(r1);
        const telas = { chamada: telaChamada, aula: telaAula, notas: telaNotas, diario: telaDiario };
        return telas[r2] ? telas[r2](td, rq) : naoEncontrado();
      }
      case "painel":
        return exige(gestor(), () => telaPainel(rq));
      case "turmas":
        return exige(gestor(), telaTurmas);
      case "turma":
        return exige(gestor(), () => telaTurmaAlunos(r1));
      case "vinculo":
        return exige(gestor(), () => telaVinculo(r1, rq));
      case "avaliacoes":
        return exige(gestor(), () => telaAvaliacoes(rq));
      case "periodos":
        return exige(gestor(), telaPeriodos);
      case "periodo":
        return exige(gestor(), () => telaPeriodoEditar(r1));
      case "regras":
        return exige(gestor(), telaRegras);
      case "estudantes":
        return exige(gestor(), () => telaEstudantes());
      case "retificacoes":
        return telaRetificacoes();
      case "provas":
        return exige(tem("professor") || gestor(), telaProvas);
      case "seguranca":
        return exige(tem("diretor"), telaSeguranca);
      case "equipe":
        return exige(tem("diretor"), () => r1 ? telaMembroEditar(r1) : telaEquipe());
      case "auditoria":
        return exige(tem("diretor"), () => telaAuditoria(rq));
      case "plataforma":
        return exige(S.ctx.plataforma, () => telaPlataforma(rq));
      case "conta":
        return telaConta();
      case "relatorio":
        return telaRelatorio(r1, r2, rq);
      default:
        return naoEncontrado();
    }
  }
  let geracao = 0;
  async function render() {
    const g = ++geracao;
    const { partes, q: rq } = rota();
    if (partes[0] === "recuperar") {
      app.innerHTML = telaRecuperar();
      return;
    }
    if (!CFG.url || !CFG.chavePublica) {
      app.innerHTML = caixaAcesso("Configuração ausente", "", aviso("erro", "O arquivo config.js não foi encontrado ou está incompleto."));
      return;
    }
    if (!S.ctx && !await iniciarSessao()) return;
    if (g !== geracao) return;
    app.setAttribute("aria-busy", "true");
    S.apos = null;
    let html;
    try {
      html = await resolver(partes, rq);
    } catch (e) {
      const err = traduzirErro(e);
      if (err.codigo === "SESSAO" || err.codigo === "SESSAO_INVALIDA") {
        S.ctx = null;
        S.aviso = { tipo: "alerta", texto: "Sua sessão terminou. Entre novamente." };
        await iniciarSessao();
        return;
      }
      if (err.codigo === "MFA_OBRIGATORIO" || err.codigo === "TROCAR_SENHA") {
        S.ctx = null;
        await iniciarSessao();
        return;
      }
      html = shell(`${aviso("erro", esc(err.message))}<p><a class="btn" href="#/">Voltar ao início</a></p>`);
    }
    app.removeAttribute("aria-busy");
    if (g !== geracao || html === null) return;
    app.innerHTML = html;
    S.aviso = null;
    if (S.apos) S.apos();
    const h1 = app.querySelector("main h1");
    if (h1 && !document.activeElement?.closest?.("main")) h1.setAttribute("tabindex", "-1");
  }
  const dados = (f) => Object.fromEntries(new FormData(f).entries());
  const valores = (f, nome) => new FormData(f).getAll(nome).map(String);
  async function executar(alvoId, fn, botao) {
    const alvo = alvoId && document.getElementById(alvoId);
    if (botao) botao.disabled = true;
    try {
      await fn();
    } catch (e) {
      const m = esc(traduzirErro(e).message);
      if (alvo) alvo.innerHTML = aviso("erro", m);
      else {
        S.aviso = { tipo: "erro", texto: traduzirErro(e).message };
        render();
      }
    } finally {
      if (botao && document.body.contains(botao)) botao.disabled = false;
    }
  }
  function sucesso(texto, destino) {
    S.aviso = { tipo: "sucesso", texto };
    if (destino) ir(destino);
    else render();
  }
  const confirmar = (t) => window.confirm(t);
  const acoes = {
    sair: () => sair(false),
    "sair-todos": () => confirmar("Encerrar a sua sessão em todos os dispositivos?") && sair(true),
    voltar: () => history.back(),
    imprimir: () => window.print(),
    "imprimir-credencial": () => {
      document.body.classList.add("imprimir-credencial");
      window.print();
      setTimeout(() => document.body.classList.remove("imprimir-credencial"), 500);
    },
    "copiar-credencial": async (el) => {
      try {
        await navigator.clipboard.writeText(el.dataset.texto);
        el.textContent = "Copiado";
      } catch {
        el.textContent = "Não foi possível copiar";
      }
    },
    marcar: (el) => marcarFrequencia(el.dataset.mat, el.dataset.s),
    "todos-presentes": () => {
      for (const id of Object.keys(E.chamada.marcas)) marcarFrequencia(id, "P");
    },
    "salvar-chamada": () => salvarChamada(),
    "salvar-notas": () => salvarNotas(),
    "configurar-mfa": async () => {
      app.innerHTML = await telaMfa();
    },
    "remover-mfa": async (el) => {
      if (!confirmar("Remover o segundo fator da sua conta?")) return;
      const { error } = await sb.auth.mfa.unenroll({ factorId: el.dataset.fator });
      if (error) return sucesso(traduzirErro(error).message);
      sucesso("Segundo fator removido.");
    },
    "aval-rapida": (el) => aplicarCategoriaAval(el.dataset.cat),
    "prova-baixar": (el) => baixarArquivo("provas", el.dataset.arquivo, el.dataset.nome),
    "backup-baixar": (el) => baixarArquivo("backups", el.dataset.arquivo, el.dataset.nome),
    "backup-agora": (el) => executar(null, () => baixarCopiaCompleta(), el),
    "prova-aprovar": (el) => executar(null, async () => {
      await rpc("prova_avaliar", { p_envio: el.dataset.id, p_situacao: "aprovada", p_parecer: "" });
      sucesso("Prova aprovada.");
    }),
    "prova-pedido-status": (el) => confirmar(el.dataset.status === "encerrado" ? "Encerrar este pedido? Os professores não poderão mais enviar." : "Reabrir este pedido?") && executar(null, async () => {
      const p = (await q(sb.from("prova_pedidos").select("*").eq("id", el.dataset.id)))[0];
      await rpc("prova_pedido_salvar", { p: { ...p, status: el.dataset.status } });
      sucesso(el.dataset.status === "encerrado" ? "Pedido encerrado." : "Pedido reaberto.");
    }),
    "marcar-todas-tds": () => document.querySelectorAll('input[name="td"]').forEach((c) => c.checked = true),
    "desmarcar-tds": () => document.querySelectorAll('input[name="td"]').forEach((c) => c.checked = false),
    "avaliacao-status": (el) => executar(null, async () => {
      await q(sb.from("avaliacoes").update({ status: el.dataset.status }).eq("id", el.dataset.id));
      sucesso(`Avaliação ${el.dataset.status}.`);
    }),
    "avaliacao-excluir": (el) => confirmar("Excluir esta avaliação? (Só é possível se ainda não tiver notas lançadas.)") && executar(null, async () => {
      await q(sb.from("avaliacoes").delete().eq("id", el.dataset.id));
      sucesso("Avaliação excluída.");
    }),
    periodo: (el) => {
      const op = el.dataset.op;
      const textos = { encerrar: "Encerrar o período? Os lançamentos serão bloqueados e as médias finais gravadas.", homologar: "Homologar o período? Depois disso, somente a direção aprova retificações." };
      let motivo = null;
      if (op === "reabrir") {
        motivo = window.prompt("Motivo da reabertura (mínimo 10 caracteres):");
        if (!motivo) return;
      } else if (!confirmar(textos[op])) return;
      executar(null, async () => {
        await rpc("periodo_acao", { p_periodo: el.dataset.id, p_acao: op, p_motivo: motivo });
        invalidar("base");
        sucesso(`Período: ${op} concluído.`);
      });
    },
    "calendario-remover": (el) => executar("msg-cal", async () => {
      await q(sb.from("calendario").delete().eq("data", el.dataset.data).eq("tipo", el.dataset.tipo));
      invalidar("base");
      sucesso("Data removida do calendário.");
    }),
    "horario-remover": (el) => confirmar("Remover este horário?") && executar("msg-horario", async () => {
      await q(sb.from("horarios").delete().eq("id", el.dataset.id));
      sucesso("Horário removido.");
    }),
    "matricula-encerrar": (el) => {
      const data = window.prompt("Data de saída/transferência (AAAA-MM-DD):", hoje());
      if (!data) return;
      if (!ehData(data)) return window.alert("Use o formato AAAA-MM-DD.");
      executar(null, async () => {
        await q(sb.from("matriculas").update({ status: "transferida", fim: data }).eq("id", el.dataset.id));
        sucesso("Matrícula encerrada (transferência/saída). O histórico foi preservado.");
      });
    },
    "regra-aprovar": (el) => confirmar("Aprovar esta regra? Ela passa a valer a partir da data de vigência e as médias afetadas serão recalculadas.") && executar("msg-regra", async () => {
      await rpc("regra_aprovar", { p_regra: el.dataset.id });
      sucesso("Regra aprovada.");
    }),
    "importar-confirmar": () => executar("msg-importar", async () => {
      const r = await rpc("importar_alunos", { p_linhas: importacaoPendente.linhas, p_ano: importacaoPendente.ano, p_simular: false });
      importacaoPendente = null;
      app.innerHTML = await telaEstudantes(relatorioImportacao(r));
    }),
    "conta-senha": (el) => confirmar(`Gerar nova senha provisória para ${el.dataset.nome}? As sessões abertas dessa pessoa serão encerradas.`) && executar(null, async () => {
      const r = await acessos("conta_redefinir_senha", { usuario_id: el.dataset.id });
      credencialRecente = { dados: { ...r, nome: el.dataset.nome }, titulo: "Nova senha provisória" };
      render();
    }),
    "conta-mfa": (el) => confirmar(`Redefinir o segundo fator de ${el.dataset.nome}? No próximo acesso a pessoa configura o aplicativo de novo.`) && executar(null, async () => {
      await acessos("conta_redefinir_mfa", { usuario_id: el.dataset.id });
      sucesso("Segundo fator redefinido.");
    }),
    "conta-ativar": (el) => confirmar(`${el.dataset.ativo === "1" ? "Reativar" : "Desativar"} o acesso de ${el.dataset.nome}?`) && executar(null, async () => {
      await acessos("conta_ativar", { usuario_id: el.dataset.id, ativo: el.dataset.ativo === "1" });
      sucesso(el.dataset.ativo === "1" ? "Acesso reativado." : "Acesso desativado e sessões encerradas.");
    }),
    "escola-status": (el) => confirmar(`${el.dataset.status === "suspensa" ? "Suspender" : "Reativar"} o acesso de toda a escola "${el.dataset.nome}"?`) && executar(null, async () => {
      await acessos("escola_status", { escola_id: el.dataset.id, status: el.dataset.status });
      sucesso("Situação da escola alterada.");
    }),
    "escola-mfa": (el) => executar(null, async () => {
      await acessos("escola_status", { escola_id: el.dataset.id, exige_mfa_gestao: el.dataset.mfa === "1" });
      sucesso("Exigência de segundo fator alterada.");
    }),
    "criar-demo": (el) => confirmar("Criar a escola de demonstração (dados fictícios) com 7 contas de teste?") && executar(null, async () => {
      el.textContent = "Criando… (pode levar até 30 segundos)";
      const r = await acessos("escola_demo_criar", { codigo: "demo" });
      credencialRecente = { html: cartaoDemo(r) };
      render();
    }, el)
  };
  document.addEventListener("click", (ev) => {
    const link = ev.target.closest('a[href^="#/"]');
    if (link && link.getAttribute("href") === location.hash) {
      ev.preventDefault();
      render();
      return;
    }
    const el = ev.target.closest("[data-acao]");
    if (!el || el.tagName === "FORM" || el.tagName === "SELECT") return;
    const f = acoes[el.dataset.acao];
    if (!f) return;
    ev.preventDefault();
    Promise.resolve(f(el, ev)).catch((e) => {
      S.aviso = { tipo: "erro", texto: traduzirErro(e).message };
      render();
    });
  });
  document.addEventListener("change", async (ev) => {
    const el = ev.target;
    if (el.matches("select[data-ir-param]")) {
      const base2 = el.dataset.irParam;
      return ir(`${base2}?${el.dataset.param}=${encodeURIComponent(el.value)}`);
    }
    if (el.matches("input[data-ir-data]") && ehData(el.value)) return ir(`${el.dataset.irData}?data=${el.value}`);
    if (el.matches('select[data-campo-chamada="tempos"]') && E.chamada) E.chamada.tempos = Number(el.value);
    if (el.matches('select[data-campo-aval="categoria"]')) aplicarCategoriaAval(el.value);
    if (el.matches("input[data-sugerir-usuario]")) {
      const u = document.getElementById("mb-usuario");
      if (u && !u.value && el.value.trim().length >= 3) {
        try {
          u.value = (await acessos("usuario_sugerir", { nome: el.value })).usuario;
        } catch {
        }
      }
    }
  });
  document.addEventListener("input", (ev) => {
    const el = ev.target;
    if (el.matches("input[data-just]") && E.chamada?.marcas[el.dataset.just]) E.chamada.marcas[el.dataset.just].j = el.value;
    if (el.matches("input[data-nota]") && E.notas) editarNota(el);
  });
  document.addEventListener("keydown", (ev) => {
    const el = ev.target;
    if (el.matches?.("input[data-nota]") && ev.key === "Enter") {
      ev.preventDefault();
      const [av] = el.dataset.nota.split("|");
      const todos = [...document.querySelectorAll(`input[data-nota^="${av}|"]:not([disabled])`)];
      const prox = todos[todos.indexOf(el) + 1];
      if (prox) prox.focus();
      return;
    }
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return;
    const li = el.closest?.("li[data-mat]");
    const k = ev.key.toUpperCase();
    if (li && E.chamada && ["P", "F", "A", "J"].includes(k) && !li.querySelector("button[disabled]")) {
      ev.preventDefault();
      marcarFrequencia(li.dataset.mat, k);
      if (k !== "J") {
        const prox = li.nextElementSibling;
        (prox?.querySelector("button") || prox)?.focus();
      }
    }
  });
  const formularios = {
    login: (f) => enviarLogin(f),
    "trocar-senha": (f) => enviarTrocaSenha(f),
    "minha-senha": (f) => enviarTrocaSenha(f, "msg-conta", () => sucesso("Senha alterada.")),
    "mfa-verificar": (f) => verificarMfa(f.dataset.fator, dados(f).codigo, document.getElementById("msg-mfa")),
    "mfa-ativar": (f) => verificarMfa(mfaPendente.factorId, dados(f).codigo, document.getElementById("msg-mfa")),
    recuperar: (f, ev) => enviarRecuperar(f, ev),
    aula: (f) => salvarAula(f),
    "retificar-freq": (f) => executar("msg-retif", async () => {
      const d = dados(f);
      await rpc("retificacao_solicitar", { p: { tipo: "frequencia", aula_id: f.dataset.aula, matricula_id: d.matricula_id, status: d.status, justificativa_falta: d.justificativa_falta, justificativa: d.justificativa } });
      sucesso("Solicitação enviada à coordenação.");
    }),
    "retificar-nota": (f) => executar("msg-retif", async () => {
      const d = dados(f);
      await rpc("retificacao_solicitar", { p: { tipo: "nota", avaliacao_id: d.avaliacao_id, matricula_id: d.matricula_id, situacao: d.situacao, valor: d.valor, justificativa: d.justificativa } });
      sucesso("Solicitação enviada à coordenação.");
    }),
    "turma-criar": (f) => executar("msg-turma", async () => {
      const d = dados(f);
      await q(sb.from("turmas").insert({ codigo: d.codigo.trim(), serie: d.serie.trim(), segmento: d.segmento, turno: d.turno, ano: Number(d.ano) }));
      invalidar("tds");
      sucesso(`Turma ${d.codigo} criada.`);
    }),
    "disciplina-criar": (f) => executar("msg-disc", async () => {
      const d = dados(f);
      await q(sb.from("disciplinas").insert({ nome: d.nome.trim(), sigla: d.sigla.trim().toUpperCase() }));
      invalidar("base");
      sucesso("Disciplina adicionada.");
    }),
    vinculo: (f) => executar("msg-vinculo", async () => {
      const d = dados(f);
      if (f.dataset.id === "novo") {
        await q(sb.from("turma_disciplinas").insert({ turma_id: f.dataset.turma, disciplina_id: d.disciplina_id, professor_id: d.professor_id || null }));
        const r = await q(sb.from("turma_disciplinas").select("id").eq("turma_id", f.dataset.turma).eq("disciplina_id", d.disciplina_id));
        invalidar("tds");
        sucesso("Disciplina vinculada. Agora cadastre os horários.", r[0] ? `#/vinculo/${r[0].id}` : "#/turmas");
      } else {
        await q(sb.from("turma_disciplinas").update({ professor_id: d.professor_id || null, ativo: d.ativo === "true" }).eq("id", f.dataset.id));
        invalidar("tds");
        sucesso("Vínculo atualizado.");
      }
    }),
    horario: (f) => executar("msg-horario", async () => {
      const d = dados(f);
      await q(sb.from("horarios").insert({ td_id: f.dataset.td, dia: Number(d.dia), inicio: d.inicio, fim: d.fim, tempos: Number(d.tempos) }));
      sucesso("Horário adicionado.");
    }),
    "avaliacao-criar": (f) => executar("msg-aval", async () => {
      const d = dados(f);
      const td_ids = valores(f, "td");
      if (!td_ids.length) throw new ErroUsuario("Marque ao menos uma turma.");
      const cat = CATEGORIAS_AVAL[d.cat] || CATEGORIAS_AVAL.teste;
      const p = { periodo_id: f.dataset.periodo, td_ids, nome: d.nome, componente: cat.componente, tipo: cat.tipo, data: d.data, prazo: d.prazo };
      if (cat.tipo === "segunda_chamada") {
        if (!d.substitui) throw new ErroUsuario("Escolha qual avaliação esta 2ª chamada substitui.");
        const [componente, ...nome] = d.substitui.split("|");
        Object.assign(p, { componente, substitui: nome.join("|") });
      } else p.nota_maxima = Number(d.nota_maxima);
      const r = await rpc("criar_avaliacoes", { p });
      sucesso(`“${d.nome}” adicionada em ${r.criadas} turma(s).`);
    }),
    "avaliacao-editar": (f) => executar(null, async () => {
      const d = dados(f);
      await rpc("avaliacao_editar", { p_id: f.dataset.id, p: { nome: d.nome, nota_maxima: d.nota_maxima, data: d.data || "", prazo: d.prazo || "" } });
      sucesso("Avaliação atualizada. As médias foram recalculadas pelo servidor.");
    }),
    "prova-enviar": (f) => enviarProva(f),
    "prova-pedido": (f) => executar("msg-pedido", async () => {
      const d = dados(f);
      const td_ids = valores(f, "td");
      if (!td_ids.length) throw new ErroUsuario("Marque ao menos uma turma.");
      if (!d.prazo) throw new ErroUsuario("Informe o prazo de entrega.");
      await rpc("prova_pedido_salvar", { p: { titulo: d.titulo, periodo_id: d.periodo_id, prazo: new Date(d.prazo).toISOString(), instrucoes: d.instrucoes, pede_adaptada: !!d.pede_adaptada, td_ids } });
      sucesso(`Pedido “${d.titulo}” enviado a ${td_ids.length} turma(s)/disciplina(s).`);
    }),
    "prova-prazo": (f) => executar(null, async () => {
      const p = (await q(sb.from("prova_pedidos").select("*").eq("id", f.dataset.id)))[0];
      await rpc("prova_pedido_salvar", { p: { ...p, prazo: new Date(dados(f).prazo).toISOString() } });
      sucesso("Prazo atualizado.");
    }),
    "prova-devolver": (f) => executar(null, async () => {
      await rpc("prova_avaliar", { p_envio: f.dataset.id, p_situacao: "devolvida", p_parecer: dados(f).parecer });
      sucesso("Prova devolvida ao professor com o seu parecer.");
    }),
    "periodo-criar": (f) => executar("msg-periodo", async () => {
      const d = dados(f);
      await q(sb.from("periodos").insert({ nome: d.nome.trim(), ano: Number(d.ano), ordem: Number(d.ordem), inicio: d.inicio, fim: d.fim, prazo: d.prazo || null }));
      invalidar("base");
      sucesso("Período criado.");
    }),
    "periodo-editar": (f) => executar("msg-periodo", async () => {
      const d = dados(f);
      await q(sb.from("periodos").update({ nome: d.nome.trim(), inicio: d.inicio, fim: d.fim, prazo: d.prazo || null }).eq("id", f.dataset.id));
      invalidar("base");
      sucesso("Período atualizado.", "#/periodos");
    }),
    calendario: (f) => executar("msg-cal", async () => {
      const d = dados(f);
      await q(sb.from("calendario").insert({ data: d.data, tipo: d.tipo, descricao: d.descricao.trim() }));
      invalidar("base");
      sucesso("Data adicionada ao calendário.");
    }),
    "retificacao-decidir": (f, ev) => executar(null, async () => {
      const d = dados(f);
      const aprovar = ev.submitter ? ev.submitter.value === "1" : false;
      await rpc("retificacao_decidir", { p_id: f.dataset.id, p_aprovar: aprovar, p_parecer: d.parecer });
      sucesso(aprovar ? "Retificação aprovada e aplicada." : "Retificação rejeitada.");
    }),
    "regra-propor": (f) => executar("msg-regra", async () => {
      const d = dados(f);
      const [modo, x] = String(d.arredondamento).split(":");
      const arredondamento = modo === "multiplo" ? { modo: "multiplo_meio_para_cima", casas: 1, multiplo: Number(x) } : { modo, casas: Number(x) };
      const definicao = {
        nota_maxima: 10,
        casas_decimais_lancamento: 2,
        componentes: [
          { codigo: "TESTE", nome: "Teste", peso: Number(d.peso_teste), composicao: d.composicao_teste },
          { codigo: "AVALIACAO", nome: "Avaliação", peso: Number(d.peso_avaliacao), composicao: "media_aritmetica" }
        ],
        arredondamento,
        recuperacao: { modo: d.recuperacao },
        media_referencia: Number(d.media_referencia)
      };
      await rpc("regra_propor", { p: { nome: d.nome, segmento: d.segmento, vigencia_inicio: d.vigencia_inicio, justificativa: d.justificativa, definicao } });
      sucesso("Nova versão enviada como rascunho. A direção precisa aprovar.");
    }),
    importar: (f) => executar("msg-importar", async () => {
      const d = dados(f);
      const arq = f.querySelector("input[type=file]").files[0];
      if (!arq) throw new ErroUsuario("Escolha o arquivo CSV.");
      if (arq.size > 2e6) throw new ErroUsuario("Arquivo grande demais (máx. 2 MB).");
      const linhas = lerCsv(await arq.text());
      if (!linhas.length) throw new ErroUsuario("O arquivo não tem linhas de dados.");
      const r = await rpc("importar_alunos", { p_linhas: linhas, p_ano: Number(d.ano), p_simular: true });
      importacaoPendente = { linhas, ano: Number(d.ano) };
      app.innerHTML = await telaEstudantes(relatorioImportacao(r));
    }),
    "membro-criar": (f) => executar("msg-membro", async () => {
      const d = dados(f);
      const papeis2 = valores(f, "papel");
      if (!papeis2.length) throw new ErroUsuario("Escolha ao menos um perfil.");
      const r = await acessos("membro_criar", { nome: d.nome, usuario: d.usuario || void 0, email: d.email || void 0, papeis: papeis2, escopos: valores(f, "escopo") });
      credencialRecente = { dados: { ...r.conta, precisaMfa: papeis2.includes("coordenador") && S.ctx.escola?.exige_mfa_gestao }, titulo: "Acesso criado" };
      render();
    }),
    "membro-editar": (f) => executar("msg-membro", async () => {
      const d = dados(f);
      const papeis2 = valores(f, "papel");
      if (!papeis2.length) throw new ErroUsuario("Escolha ao menos um perfil.");
      await acessos("membro_atualizar", { usuario_id: f.dataset.id, nome: d.nome, email: d.email, papeis: papeis2, escopos: valores(f, "escopo") });
      sucesso("Acesso atualizado.", "#/equipe");
    }),
    "escola-criar": (f) => executar("msg-escola", async () => {
      const d = dados(f);
      const r = await acessos("escola_criar", {
        escola: { codigo: d.codigo, nome: d.nome, sigla: d.sigla, cidade: d.cidade, uf: d.uf, ano: Number(d.ano), exige_mfa_gestao: !!d.exige_mfa_gestao },
        diretor: { nome: d.diretor_nome, usuario: d.diretor_usuario || void 0, email: d.diretor_email || void 0 }
      });
      credencialRecente = { dados: { ...r.diretor, precisaMfa: !!d.exige_mfa_gestao }, titulo: `Escola “${r.escola.nome}” cadastrada — acesso da direção` };
      render();
    }),
    "diretor-criar": (f) => executar("msg-diretor", async () => {
      const d = dados(f);
      const r = await acessos("diretor_criar", { escola_id: f.dataset.escola, nome: d.nome, usuario: d.usuario || void 0 });
      credencialRecente = { dados: r.conta, titulo: "Conta da direção criada" };
      render();
    })
  };
  document.addEventListener("submit", (ev) => {
    const f = ev.target.closest("form[data-form]");
    if (!f) return;
    ev.preventDefault();
    const h = formularios[f.dataset.form];
    if (!h) return;
    const bt = ev.submitter || f.querySelector("button[type=submit]");
    if (bt) bt.disabled = true;
    Promise.resolve(h(f, ev)).catch((e) => {
      S.aviso = { tipo: "erro", texto: traduzirErro(e).message };
      render();
    }).finally(() => {
      if (bt && document.body.contains(bt)) bt.disabled = false;
    });
  });
  window.addEventListener("beforeunload", (ev) => {
    const pendente = E.notas && E.notas.alterados.size && document.querySelector('[data-acao="salvar-notas"]') || document.querySelector(".status-salvamento.pendente");
    if (pendente) {
      ev.preventDefault();
      ev.returnValue = "";
    }
  });
  window.addEventListener("hashchange", render);
  render();
})();
