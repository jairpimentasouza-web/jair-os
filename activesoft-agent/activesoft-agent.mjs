#!/usr/bin/env node
// Agente ActiveSoft — Jair OS
// Consolida acesso (login + unidade) e lançamento de notas no ActiveSoft (siga.activesoft.com.br)
// usando a sessão real do navegador do professor (Playwright). A grade de notas recusa sessões
// puramente programáticas (HTTP 403), por isso as chamadas de API são feitas DE DENTRO da página,
// reaproveitando cookies e cabeçalhos que o próprio portal usa.
//
// Comandos:
//   descobrir --turma-id N --disciplina-id N [--bimestre B]
//       Faz login, abre a grade e salva um retrato (fases, colunas, alunos) — somente leitura.
//   lancar --lote lote.json [--aplicar] [--incluir-pendentes] [--sobrescrever]
//       Sem --aplicar: simulação (lê a grade e mostra o plano). Com --aplicar: valida, grava
//       célula a célula, relê a grade e confere. NUNCA confirma/fecha a turma.
//
// Credenciais (nunca no repositório): ACTIVESOFT_INSTITUICAO, ACTIVESOFT_LOGIN, ACTIVESOFT_SENHA
// (o executor do Jair OS injeta a partir do Supabase Vault). Opcional: ACTIVESOFT_UNIDADE (regex).

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const BASE = process.env.ACTIVESOFT_BASE_URL || 'https://siga.activesoft.com.br';
const API_NOTAS = '/api/v1/avaliacao_nota/';

// ---------------------------------------------------------------- utilidades puras (testáveis)

export function norm(s) {
  return String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

export function paraNumero(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const s = String(v).trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

export function formatarValor(n, formato) {
  if (formato === 'numero') return n;
  const s = Number(n).toFixed(2).replace(/\.?0+$/, '');
  return formato === 'virgula' ? s.replace('.', ',') : s;
}

// Acha, em qualquer JSON, o maior array de objetos que parece uma lista de alunos.
export function acharAlunos(json) {
  let melhor = null;
  const visitar = (v) => {
    if (Array.isArray(v)) {
      const objs = v.filter((x) => x && typeof x === 'object' && !Array.isArray(x));
      if (objs.length && objs.length === v.length) {
        const chaveNome = escolherChaveNome(objs);
        if (chaveNome && (!melhor || objs.length > melhor.itens.length)) {
          melhor = { itens: objs, chaveNome, chaveId: escolherChaveId(objs) };
        }
      }
      v.forEach(visitar);
    } else if (v && typeof v === 'object') {
      Object.values(v).forEach(visitar);
    }
  };
  visitar(json);
  return melhor;
}

function escolherChaveNome(objs) {
  const chaves = Object.keys(objs[0]);
  const pareceNome = (k) => objs.filter((o) => typeof o[k] === 'string' && o[k].trim().split(/\s+/).length >= 2).length;
  const candidatas = chaves.filter((k) => pareceNome(k) >= Math.ceil(objs.length * 0.8));
  return candidatas.find((k) => /aluno.*nome|nome.*aluno/i.test(k))
    || candidatas.find((k) => /nome/i.test(k)) || candidatas[0] || null;
}

function escolherChaveId(objs) {
  const chaves = Object.keys(objs[0]);
  const ordem = [/^aluno$/i, /^aluno_id$/i, /^id_aluno$/i, /^codigo_aluno$/i, /^aluno_?pk$/i];
  for (const re of ordem) {
    const k = chaves.find((c) => re.test(c) && objs.every((o) => o[c] !== null && typeof o[c] !== 'object'));
    if (k) return k;
  }
  const comObj = chaves.find((c) => /^aluno$/i.test(c) && objs.every((o) => o[c] && typeof o[c] === 'object' && 'id' in o[c]));
  if (comObj) return `${comObj}.id`;
  return chaves.includes('id') ? 'id' : null;
}

export function lerChave(obj, chave) {
  return chave.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// Valor atual de uma coluna (ex.: "AV1") num objeto de aluno. Retorna {achou, valor}.
export function valorDoCampo(obj, campo) {
  const alvo = norm(campo);
  let achado = { achou: false, valor: undefined };
  const visitar = (v) => {
    if (achado.achou || !v || typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v)) {
      if (norm(k) === alvo && (x === null || typeof x !== 'object')) { achado = { achou: true, valor: x }; return; }
    }
    const rotulo = ['campo', 'sigla', 'label', 'nome', 'descricao', 'abreviacao'].find((k) => typeof v[k] === 'string' && norm(v[k]) === alvo);
    if (rotulo) {
      const kv = ['valor', 'nota', 'value', 'valor_nota', 'nota_digitada'].find((k) => k in v);
      if (kv) { achado = { achou: true, valor: v[kv] }; return; }
    }
    Object.values(v).forEach(visitar);
  };
  visitar(obj);
  return achado;
}

// Procura em respostas capturadas uma lista de fases e devolve a do bimestre pedido.
export function acharFase(respostas, bimestre) {
  const re = new RegExp(`(^|\\D)${bimestre}\\s*[ºo°ª]?\\s*(bim|b(\\b|$)|per)`, 'i');
  const achadas = [];
  const visitar = (v) => {
    if (Array.isArray(v)) v.forEach(visitar);
    else if (v && typeof v === 'object') {
      const id = v.id ?? v.fase_nota ?? v.value ?? v.pk;
      const rot = [v.descricao, v.nome, v.label, v.text, v.fase, v.abreviacao].find((x) => typeof x === 'string');
      if (id != null && typeof id !== 'object' && rot && re.test(rot)) achadas.push({ id, rotulo: rot });
      Object.values(v).forEach(visitar);
    }
  };
  respostas.forEach((r) => visitar(r.json));
  const unicas = [...new Map(achadas.map((a) => [String(a.id), a])).values()];
  return unicas;
}

export function planejar({ lote, turma, grade, incluirPendentes, sobrescrever }) {
  const { itens, chaveNome, chaveId } = grade;
  const porNome = new Map();
  for (const a of itens) {
    const k = norm(a[chaveNome]);
    porNome.set(k, (porNome.get(k) || []).concat([a]));
  }
  return turma.notas.map((n) => {
    const base = { turma: turma.turma, nome: n.nome, nota: n.nota, vinculo: n.vinculo };
    if (lote.valor_maximo != null && (n.nota < 0 || n.nota > lote.valor_maximo)) return { ...base, acao: 'erro', motivo: `nota fora de 0..${lote.valor_maximo}` };
    const achados = porNome.get(norm(n.nome)) || [];
    if (achados.length !== 1) return { ...base, acao: 'erro', motivo: achados.length ? 'nome duplicado na grade' : 'nome não encontrado na grade' };
    const aluno = achados[0];
    const alunoId = lerChave(aluno, chaveId);
    const atual = valorDoCampo(aluno, lote.campo);
    if (!atual.achou) return { ...base, aluno_id: alunoId, acao: 'erro', motivo: `coluna ${lote.campo} não localizada no registro do aluno` };
    const atualNum = paraNumero(atual.valor);
    const r = { ...base, aluno_id: alunoId, valor_atual: atual.valor ?? null };
    if (n.vinculo !== 'confirmado' && !incluirPendentes) return { ...r, acao: 'pular', motivo: 'vínculo pendente de confirmação' };
    if (atualNum !== null && Math.abs(atualNum - n.nota) < 1e-9) return { ...r, acao: 'ja_lancada' };
    if (atual.valor !== null && atual.valor !== undefined && String(atual.valor).trim() !== '' && !sobrescrever) {
      return { ...r, acao: 'pular', motivo: 'célula já preenchida com outro valor (use --sobrescrever)' };
    }
    return { ...r, acao: 'gravar' };
  });
}

// ---------------------------------------------------------------- navegador

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const nxt = argv[i + 1];
      if (nxt === undefined || nxt.startsWith('--')) out[k] = true; else { out[k] = nxt; i++; }
    } else out._.push(a);
  }
  return out;
}

function credenciais() {
  const c = { inst: process.env.ACTIVESOFT_INSTITUICAO, login: process.env.ACTIVESOFT_LOGIN, senha: process.env.ACTIVESOFT_SENHA };
  const faltam = Object.entries(c).filter(([, v]) => !v).map(([k]) => k);
  if (faltam.length) throw new Error('Credenciais ausentes (ACTIVESOFT_INSTITUICAO/LOGIN/SENHA). O executor do Jair OS deve injetá-las a partir do Vault.');
  return c;
}

const CABECALHOS_DO_NAVEGADOR = /^(cookie|host|content-length|connection|accept-encoding|user-agent|referer|origin|sec-|:)/i;

class Sessao {
  constructor(saida) {
    this.saida = saida;
    this.capturas = [];
    this.cabecalhosApi = {};
  }

  async abrir({ visivel = false } = {}) {
    const { chromium } = require('playwright');
    this.browser = await chromium.launch({ headless: !visivel });
    this.ctx = await this.browser.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    this.page = await this.ctx.newPage();
    this.page.on('response', async (resp) => {
      const req = resp.request();
      const url = req.url();
      if (!/^https:\/\/[a-z0-9-]+\.activesoft\.com\.br\//.test(url) || !url.includes('/api/')) return;
      const h = req.headers();
      for (const [k, v] of Object.entries(h)) if (!CABECALHOS_DO_NAVEGADOR.test(k)) this.cabecalhosApi[k] = v;
      let json = null;
      try { if ((resp.headers()['content-type'] || '').includes('json')) json = await resp.json(); } catch { /* corpo indisponível */ }
      this.capturas.push({ metodo: req.method(), url, status: resp.status(), json });
    });
  }

  async evidencia(nome) {
    try {
      await this.page.screenshot({ path: path.join(this.saida, `${nome}.png`), fullPage: true });
    } catch { /* sem tela */ }
  }

  async login() {
    const c = credenciais();
    const p = this.page;
    await p.goto(`${BASE}/login/`, { waitUntil: 'domcontentloaded' });
    await p.fill('#codigoInstituicao', c.inst);
    await p.fill('#id_login', c.login);
    await p.fill('#id_senha', c.senha);
    const botao = p.locator('form.login_form button, form.login_form input[type=submit]').filter({ hasText: /^\s*entrar\s*$/i }).first();
    await Promise.all([
      p.waitForURL((u) => !/\/login\/?$/.test(new URL(u).pathname), { timeout: 30000 }).catch(() => null),
      (await botao.count()) ? botao.click() : p.locator('form.login_form').evaluate((f) => f.requestSubmit()),
    ]);
    await p.waitForLoadState('networkidle').catch(() => null);
    if (/\/login\/?$/.test(new URL(p.url()).pathname)) {
      await this.evidencia('falha-login');
      const msg = await p.locator('.alert, .errorlist, .login_form_error, [class*=erro]').allInnerTexts().catch(() => []);
      throw new Error(`Login recusado pelo ActiveSoft: ${msg.join(' | ') || 'sem mensagem'}`);
    }
    if (p.url().includes('/login/unidade')) await this.escolherUnidade();
    // Após o login o ActiveSoft move a sessão para um servidor próprio (ex.: siga01); seguir esse host.
    this.origem = new URL(p.url()).origin;
    return p.url();
  }

  async escolherUnidade() {
    const p = this.page;
    const filtro = process.env.ACTIVESOFT_UNIDADE ? new RegExp(process.env.ACTIVESOFT_UNIDADE, 'i') : null;
    const opcoes = p.locator('a, button, li, .card, [role=button]').filter({ hasText: /\S/ });
    const textos = (await opcoes.allInnerTexts()).map((t) => t.trim());
    let idx = -1;
    if (filtro) idx = textos.findIndex((t) => filtro.test(t));
    if (idx < 0) {
      const sel = p.locator('select');
      if (await sel.count()) {
        const ops = await sel.first().locator('option').allInnerTexts();
        const i = filtro ? ops.findIndex((t) => filtro.test(t)) : ops.findIndex((t) => t.trim());
        if (i >= 0) await sel.first().selectOption({ index: i });
        const enviar = p.locator('button[type=submit], input[type=submit]').first();
        if (await enviar.count()) await enviar.click();
      } else {
        const candidatos = textos.map((t, i) => [t, i]).filter(([t]) => t.length > 2 && !/sair|voltar|ajuda/i.test(t));
        if (candidatos.length !== 1) {
          await this.evidencia('escolha-unidade');
          throw new Error(`Várias unidades disponíveis; defina ACTIVESOFT_UNIDADE. Opções: ${candidatos.map(([t]) => t).join(' / ')}`);
        }
        idx = candidatos[0][1];
      }
    }
    if (idx >= 0) await opcoes.nth(idx).click();
    await p.waitForLoadState('networkidle').catch(() => null);
  }

  async abrirGrade(turmaId, disciplinaId) {
    const inicio = this.capturas.length;
    await this.page.goto(`${this.origem}/portal_eb_professor/planilha_notas_faltas/${turmaId}/${disciplinaId}/`, { waitUntil: 'networkidle', timeout: 60000 });
    await this.page.waitForTimeout(1500);
    return this.capturas.slice(inicio);
  }

  async api(metodo, caminho, { params = {}, corpo } = {}) {
    const url = new URL(caminho, this.origem);
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) url.searchParams.set(k, v);
    const headers = { accept: 'application/json, text/plain, */*', ...this.cabecalhosApi };
    if (corpo !== undefined) headers['content-type'] = 'application/json';
    return this.page.evaluate(async ({ url, metodo, headers, corpo }) => {
      if (!['GET', 'HEAD'].includes(metodo)) {
        const csrf = document.cookie.split('; ').find((c) => c.startsWith('csrftoken='));
        if (csrf && !Object.keys(headers).some((k) => k.toLowerCase() === 'x-csrftoken')) headers['X-CSRFToken'] = decodeURIComponent(csrf.split('=')[1]);
      }
      const r = await fetch(url, { method: metodo, headers, credentials: 'include', body: corpo === undefined ? undefined : JSON.stringify(corpo) });
      const texto = await r.text();
      let json = null; try { json = JSON.parse(texto); } catch { /* não-JSON */ }
      return { status: r.status, json, texto: json ? undefined : texto.slice(0, 500) };
    }, { url: url.toString(), metodo, headers, corpo });
  }

  // A grade legada aparece num iframe "alunoTurma" apontando para app*.activesoft.com.br/sistema/LoginDiretoV2.asp
  async temGradeLegada() {
    const p = this.page;
    const fase = p.getByText('Nenhuma opção selecionada').first();
    if (await fase.count().catch(() => 0)) {
      await fase.click().catch(() => null);
      await p.locator('[role=option], [class*=option]').first().click().catch(() => null);
      await p.getByRole('button', { name: /consultar/i }).click().catch(() => null);
      await p.waitForTimeout(3000);
    }
    return p.frames().some((f) => /^https:\/\/app\d*\.activesoft\.com\.br\/sistema\//.test(f.url()))
      || (await p.locator('iframe#alunoTurma').count().catch(() => 0)) > 0;
  }

  async fechar() { await this.browser?.close(); }
}

// Parâmetros da grade: parte da requisição que o próprio portal fez ao abrir a página.
function paramsDaGrade(capturas, { turmaId, disciplinaId }) {
  const req = [...capturas].reverse().find((c) => c.metodo === 'GET' && new URL(c.url).pathname.replace(/\/?$/, '/') === API_NOTAS);
  const p = req ? Object.fromEntries(new URL(req.url).searchParams) : {};
  p.turma = p.turma || String(turmaId);
  p.disciplina = p.disciplina || String(disciplinaId);
  p.situacao = p.situacao || 'A';
  return { params: p, requisicaoOriginal: req?.url || null };
}

async function lerGrade(s, params) {
  const r = await s.api('GET', API_NOTAS, { params });
  if (r.status === 403 && (await s.temGradeLegada())) {
    throw new Error('Esta escola usa a grade LEGADA (ASP, iframe "alunoTurma" em app*.activesoft.com.br); a API moderna avaliacao_nota responde 403 mesmo na sessão do navegador. O lançamento precisa ser feito pela grade ASP (modo ainda não implementado) ou manualmente.');
  }
  if (r.status !== 200) throw new Error(`Leitura da grade falhou: HTTP ${r.status} ${r.texto || ''}`);
  const grade = acharAlunos(r.json);
  if (!grade || !grade.chaveId) throw new Error('Não identifiquei a lista de alunos/ids na resposta da grade (rode "descobrir").');
  return { ...grade, bruto: r.json };
}

// Fases de nota da turma, pela mesma lista que alimenta o seletor "Fase de nota" da página.
async function fasesDaTurma(s, turmaId) {
  const r = await s.api('GET', '/api/v1/fields/select/fase_nota/', { params: { search: '', limit: 50, offset: 0, turmas: turmaId, fase_informada: 1 } });
  if (r.status !== 200) return [];
  return (r.json?.results || []).map((f) => ({ id: f.value, rotulo: f.label, json: f }));
}

async function resolverFase(s, capturas, params, bimestre, turmaId, fasePorTurma) {
  if (fasePorTurma) return { fase: String(fasePorTurma), origem: 'lote' };
  let fases = acharFase([{ json: (await fasesDaTurma(s, turmaId)).map((f) => ({ id: f.id, descricao: f.rotulo })) }], bimestre);
  if (!fases.length) fases = acharFase(capturas, bimestre);
  if (fases.length === 1) return { fase: String(fases[0].id), origem: `descoberta: ${fases[0].rotulo}` };
  throw new Error(`Não consegui determinar a fase do ${bimestre}º bimestre (${fases.length} candidatas: ${fases.map((f) => `${f.id}=${f.rotulo}`).join(', ') || 'nenhuma'}; padrão da página: ${params.fase_nota || '—'}). Informe "fase_nota" no lote.`);
}

function semCampo(obj, campo) {
  const copia = JSON.parse(JSON.stringify(obj));
  const alvo = norm(campo);
  const limpar = (v) => {
    if (!v || typeof v !== 'object') return;
    for (const k of Object.keys(v)) if (norm(k) === alvo) delete v[k];
    if (['campo', 'sigla', 'label', 'nome', 'descricao', 'abreviacao'].some((k) => typeof v[k] === 'string' && norm(v[k]) === alvo)) {
      for (const k of ['valor', 'nota', 'value', 'valor_nota', 'nota_digitada', 'id', 'alterado_em', 'data_alteracao']) delete v[k];
    }
    Object.values(v).forEach(limpar);
  };
  limpar(copia);
  return semVolateis(copia);
}

// campos calculados/carimbos mudam legitimamente quando uma nota entra
const VOLATEIS = /media|resultado|total|situacao_nota|alterad|atualizad|modific/i;
export function semVolateis(obj) {
  return JSON.stringify(obj, (k, v) => (VOLATEIS.test(k) ? undefined : v));
}

// ---------------------------------------------------------------- comandos

async function descobrir(s, a) {
  const turmaId = a['turma-id'];
  const disciplinaId = a['disciplina-id'];
  if (!turmaId || !disciplinaId) throw new Error('Use: descobrir --turma-id N --disciplina-id N [--bimestre B]');
  await s.login();
  const cap = await s.abrirGrade(turmaId, disciplinaId);
  await s.evidencia(`grade-${turmaId}`);
  const { params, requisicaoOriginal } = paramsDaGrade(cap, { turmaId, disciplinaId });
  const fases = a.bimestre ? acharFase(cap, a.bimestre) : [];
  let grade = null;
  let erroGrade = null;
  try { grade = await lerGrade(s, params); } catch (e) { erroGrade = e.message; }
  const retrato = {
    url: s.page.url(),
    requisicao_grade: requisicaoOriginal,
    params_grade: params,
    fases_candidatas: fases,
    cabecalhos_api: Object.keys(s.cabecalhosApi),
    endpoints_vistos: [...new Set(cap.map((c) => `${c.metodo} ${new URL(c.url).pathname} → ${c.status}`))],
    grade: grade ? {
      alunos: grade.itens.length,
      chave_nome: grade.chaveNome,
      chave_id: grade.chaveId,
      chaves_do_registro: Object.keys(grade.itens[0] || {}),
      exemplo_estrutura: JSON.stringify(grade.itens[0], (k, v) => (typeof v === 'string' && /nome/i.test(k) ? '<nome>' : v)).slice(0, 2000),
    } : { erro: erroGrade },
  };
  fs.writeFileSync(path.join(s.saida, `descoberta-${turmaId}.json`), JSON.stringify(retrato, null, 2));
  console.log(JSON.stringify(retrato, null, 2));
}

async function lancar(s, a) {
  if (!a.lote) throw new Error('Use: lancar --lote lote.json [--aplicar] [--incluir-pendentes] [--sobrescrever]');
  const lote = JSON.parse(fs.readFileSync(a.lote, 'utf8'));
  if (!lote.campo || !lote.bimestre || !lote.disciplina_id) throw new Error('Lote sem campo/bimestre/disciplina_id');
  const aplicar = Boolean(a.aplicar);
  const formatos = a['formato-valor'] ? [a['formato-valor']] : ['virgula', 'ponto', 'numero'];
  const relatorio = { iniciado_em: new Date().toISOString(), modo: aplicar ? 'aplicar' : 'simulacao', lote: path.basename(a.lote), campo: lote.campo, bimestre: lote.bimestre, turmas: [] };
  await s.login();

  for (const turma of lote.turmas) {
    const rt = { turma: turma.turma, turma_id: turma.turma_id, itens: [] };
    relatorio.turmas.push(rt);
    try {
      const cap = await s.abrirGrade(turma.turma_id, lote.disciplina_id);
      const { params } = paramsDaGrade(cap, { turmaId: turma.turma_id, disciplinaId: lote.disciplina_id });
      if (lote.periodo && !params.periodo) params.periodo = String(lote.periodo);
      const { fase, origem } = await resolverFase(s, cap, params, lote.bimestre, turma.turma_id, turma.fase_nota || lote.fase_nota?.[turma.turma]);
      params.fase_nota = fase;
      rt.fase_nota = fase; rt.fase_origem = origem;

      const antes = await lerGrade(s, params);
      const plano = planejar({ lote, turma, grade: antes, incluirPendentes: Boolean(a['incluir-pendentes']), sobrescrever: Boolean(a.sobrescrever) });
      rt.itens = plano;
      const erros = plano.filter((p) => p.acao === 'erro');
      if (erros.length) { rt.status = 'bloqueada'; rt.motivo = 'há linhas com erro de vínculo/coluna — nada gravado nesta turma'; continue; }
      if (!aplicar) { rt.status = 'simulada'; continue; }

      let formato = null;
      for (const p of plano.filter((x) => x.acao === 'gravar')) {
        const q = { fase_nota: fase, turma: String(turma.turma_id), aluno: String(p.aluno_id), disciplina: String(lote.disciplina_id) };
        let val = null;
        for (const f of formato ? [formato] : formatos) {
          const v = await s.api('POST', `${API_NOTAS}validar/`, { params: q, corpo: { valor: formatarValor(p.nota, f), campo: lote.campo } });
          if (v.status >= 200 && v.status < 300) { formato = f; val = v; break; }
          val = v;
        }
        if (!formato || !(val.status >= 200 && val.status < 300)) { p.acao = 'falhou'; p.motivo = `validação recusada: HTTP ${val.status} ${JSON.stringify(val.json || val.texto)}`; continue; }
        const w = await s.api('PATCH', API_NOTAS, { params: q, corpo: { campo: lote.campo, valor: formatarValor(p.nota, formato) } });
        if (w.status >= 200 && w.status < 300) { p.acao = 'gravada'; p.formato = formato; } else { p.acao = 'falhou'; p.motivo = `gravação recusada: HTTP ${w.status} ${JSON.stringify(w.json || w.texto)}`; }
      }

      // Releitura e conferência (inclui preservação das demais colunas)
      const depois = await lerGrade(s, params);
      const porId = new Map(depois.itens.map((x) => [String(lerChave(x, depois.chaveId)), x]));
      const antesPorId = new Map(antes.itens.map((x) => [String(lerChave(x, antes.chaveId)), x]));
      for (const p of plano) {
        if (!['gravada', 'ja_lancada'].includes(p.acao)) continue;
        const reg = porId.get(String(p.aluno_id));
        const lido = reg ? paraNumero(valorDoCampo(reg, lote.campo).valor) : null;
        p.releitura = lido;
        p.conferida = lido !== null && Math.abs(lido - p.nota) < 1e-9;
        if (!p.conferida) p.motivo = 'releitura não confere';
      }
      const tocados = new Set(plano.filter((p) => p.acao === 'gravada').map((p) => String(p.aluno_id)));
      rt.colunas_alteradas_indevidamente = [...antesPorId.keys()].filter((id) => {
        const depoisReg = porId.get(id);
        if (!depoisReg) return true;
        const comparar = tocados.has(id) ? (o) => semCampo(o, lote.campo) : semVolateis;
        return comparar(antesPorId.get(id)) !== comparar(depoisReg);
      });
      const ok = plano.filter((p) => p.conferida).length;
      rt.status = plano.some((p) => p.acao === 'falhou' || p.conferida === false) ? 'parcial' : 'concluida';
      rt.resumo = { conferidas: ok, puladas: plano.filter((p) => p.acao === 'pular').length };
      await s.evidencia(`grade-${turma.turma_id}-apos`);
    } catch (e) {
      rt.status = 'falhou';
      rt.motivo = e.message;
      await s.evidencia(`erro-${turma.turma_id}`);
    }
  }
  relatorio.concluido_em = new Date().toISOString();
  const arq = path.join(s.saida, `relatorio-${relatorio.modo}-${Date.now()}.json`);
  fs.writeFileSync(arq, JSON.stringify(relatorio, null, 2));
  imprimirResumo(relatorio);
  console.log(`\nRelatório: ${arq}`);
  if (relatorio.turmas.some((t) => t.status !== 'concluida' && t.status !== 'simulada')) process.exitCode = 2;
}

function imprimirResumo(r) {
  console.log(`\n== ActiveSoft · ${r.campo} · ${r.bimestre}º bimestre · modo ${r.modo}`);
  for (const t of r.turmas) {
    console.log(`\nTurma ${t.turma} (fase ${t.fase_nota ?? '?'}) → ${t.status}${t.motivo ? ` — ${t.motivo}` : ''}`);
    for (const p of t.itens) {
      const extra = p.releitura !== undefined ? ` | releitura ${p.releitura}` : '';
      console.log(`  ${p.acao.padEnd(10)} ${String(p.nota).padStart(4)}  ${p.nome}${p.valor_atual != null ? ` (atual: ${p.valor_atual})` : ''}${extra}${p.motivo ? ` — ${p.motivo}` : ''}`);
    }
    if (t.colunas_alteradas_indevidamente?.length) console.log(`  ATENÇÃO: outros campos mudaram para alunos ${t.colunas_alteradas_indevidamente.join(', ')}`);
  }
}

async function main() {
  const a = args(process.argv.slice(2));
  const cmd = a._[0];
  if (!['descobrir', 'lancar'].includes(cmd)) {
    console.log('Uso:\n  node activesoft-agent.mjs descobrir --turma-id N --disciplina-id N [--bimestre B]\n  node activesoft-agent.mjs lancar --lote lote.json [--aplicar] [--incluir-pendentes] [--sobrescrever] [--formato-valor virgula|ponto|numero]\nOpções gerais: --saida DIR (padrão ./saida-activesoft)  --visivel');
    process.exitCode = 1;
    return;
  }
  const saida = path.resolve(a.saida || 'saida-activesoft');
  fs.mkdirSync(saida, { recursive: true, mode: 0o700 });
  const s = new Sessao(saida);
  await s.abrir({ visivel: Boolean(a.visivel) });
  try {
    if (cmd === 'descobrir') await descobrir(s, a); else await lancar(s, a);
  } finally {
    await s.fechar();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(`ERRO: ${e.message}`); process.exitCode = 1; });
}
