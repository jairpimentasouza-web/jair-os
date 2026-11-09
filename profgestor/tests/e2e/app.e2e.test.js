// Teste ponta a ponta do app real (web/) no Chromium, contra os emuladores Auth + Firestore
// com as regras V5. Produção nunca é contatada: o app entra no modo emulador (projeto demo-).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const WEB = fileURLToPath(new URL('../../web/', import.meta.url));
const PORT = 5057;
const URL_APP = `http://localhost:${PORT}/index.html?emulator=1`;
const PASS = 'Senha-forte-123';
const pad = (n) => String(n).padStart(2, '0');
const local = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
const addMin = (d, m) => new Date(d.getTime() + m * 60000);
const brl = (s) => String(s).replace(/\s/g, ' ').trim();
// A interface reflete gravações de forma otimista; o teste confirma o estado no servidor.
async function eventually(fn, ms = 10000) {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await new Promise((r) => setTimeout(r, 200)); }
  throw last || new Error('condição não atingida no servidor');
}

let server, browser, db, auth;
const pageErrors = [];

function serveStatic() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webmanifest': 'application/manifest+json' };
  return createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    if (path.includes('..')) { res.writeHead(400).end(); return; }
    try {
      const body = await readFile(join(WEB, path || 'index.html'));
      res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' }).end(body);
    } catch { res.writeHead(404).end('not found'); }
  }).listen(PORT, '127.0.0.1');
}

async function seed() {
  const now = new Date();
  const hojeFuturo = now.getHours() < 23 ? addMin(now, 30) : addMin(now, -30);
  const hojeCedo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const tresDiasAtras = addMin(now, -3 * 24 * 60);
  const old = Timestamp.fromMillis(Date.now() - 400 * 864e5);
  const users = [
    ['profA', 'prof.a@example.com'], ['profB', 'prof.b@example.com'], ['famA', 'fam.a@example.com'], ['expT', 'expired@example.com'],
  ];
  for (const [uid, email] of users) await auth.createUser({ uid, email, password: PASS, emailVerified: true });
  const set = (p, d) => db.doc(p).set(d);
  await Promise.all([
    set('organizations/org_a', { nome: 'Org A', ownerUid: 'profA', createdAt: old, billingExempt: true }),
    set('organizations/org_b', { nome: 'Org B', ownerUid: 'profB', createdAt: Timestamp.now() }),
    set('organizations/org_exp', { nome: 'Org vencida', ownerUid: 'expT', createdAt: Timestamp.fromMillis(Date.now() - 30 * 864e5) }),
    set('usuarios/profA', { email: 'prof.a@example.com', nome: 'Prof A', role: 'admin', organizationId: 'org_a', ativo: true }),
    set('usuarios/profB', { email: 'prof.b@example.com', nome: 'Prof B', role: 'admin', organizationId: 'org_b', ativo: true }),
    set('usuarios/famA', { email: 'fam.a@example.com', nome: 'Resp A1', role: 'responsavel', organizationId: 'org_a', alunoId: 'alunoA1', ativo: true }),
    set('usuarios/expT', { email: 'expired@example.com', nome: 'Vencido', role: 'admin', organizationId: 'org_exp', ativo: true }),
    set('alunos/alunoA1', { organizationId: 'org_a', nome: 'Ana Souza', tel: '21999990001', materia: 'Física' }),
    set('alunos/alunoA2', { organizationId: 'org_a', nome: 'Bruno Lima', tel: '21999990002', materia: 'Matemática' }),
    set('alunos/alunoB1', { organizationId: 'org_b', nome: 'Carla B', tel: '11999990001', materia: 'Química' }),
    set('aulas/futuraHoje', { organizationId: 'org_a', alunoId: 'alunoA1', alunoNome: 'Ana Souza', title: 'Ana Souza (Física)', start: local(hojeFuturo), end: local(addMin(hojeFuturo, 60)), valor: 150, status: 'pendente', statusAula: 'agendada' }),
    set('aulas/pagaHoje', { organizationId: 'org_a', alunoId: 'alunoA2', alunoNome: 'Bruno Lima', title: 'Bruno Lima (Matemática)', start: local(hojeCedo), end: local(addMin(hojeCedo, 1)), valor: 100, status: 'pago', statusAula: 'realizada', presenca: 'presente', registradoEm: local(hojeCedo) }),
    set('aulas/atrasada', { organizationId: 'org_a', alunoId: 'alunoA1', alunoNome: 'Ana Souza', title: 'Ana Souza (Física)', start: local(tresDiasAtras), end: local(addMin(tresDiasAtras, 60)), valor: 120, status: 'pendente', statusAula: 'agendada' }),
    set('aulas/aulaB', { organizationId: 'org_b', alunoId: 'alunoB1', alunoNome: 'Carla B', start: local(hojeFuturo), end: local(addMin(hojeFuturo, 60)), valor: 90, status: 'pendente' }),
    set('despesas/despA', { organizationId: 'org_a', descricao: 'Material', valor: 40, data: local(now).slice(0, 10) }),
    set('pacotes/pacA1', { organizationId: 'org_a', alunoId: 'alunoA1', nome: '5 aulas', creditosTotal: 5, creditosUsados: 0, validade: '2099-12-31', status: 'ativo' }),
  ]);
}

async function login(email, { familia = false } = {}) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${email}: ${e.message}`));
  await page.goto(URL_APP, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginForm', { state: 'visible' });
  if (familia) await page.click('#personaFamilia');
  await page.fill('#loginEmail', email);
  await page.fill('#loginPassword', PASS);
  await page.click('#loginButton');
  return { ctx, page };
}

before(async () => {
  initializeApp({ projectId: 'demo-profgestor' });
  db = getFirestore(); auth = getAuth();
  await seed();
  server = serveStatic();
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.close(); });

describe('ProfGestor V5 — fluxos reais no navegador (emuladores)', () => {
  it('professor entra e o painel mostra os indicadores reais (antes: zeros fixos)', async () => {
    const { ctx, page } = await login('prof.a@example.com');
    await page.waitForSelector('#wrapper', { state: 'visible' });
    await page.waitForFunction(() => document.getElementById('v4TodayLessons')?.textContent === '2', null, { timeout: 20000 });
    assert.equal(brl(await page.textContent('#v4OverdueAmount')), 'R$ 120,00');
    assert.equal(brl(await page.textContent('#v4ExpensesMonth')), 'R$ 40,00');
    assert.equal(brl(await page.textContent('#v4NetMonth')), 'R$ 60,00');
    assert.equal(await page.textContent('#v4ReportsPending'), '1');
    assert.equal(await page.textContent('#badgeAlunos'), '2');
    await ctx.close();
  });

  it('CRM: cria lead pelo formulário, muda etapa e matricula como aluno', async () => {
    const { ctx, page } = await login('prof.a@example.com');
    await page.waitForSelector('#wrapper', { state: 'visible' });
    await page.evaluate(() => window.showSection('crm'));
    await page.fill('#v4CrmNome', 'Daniela Interessada');
    await page.fill('#v4CrmTel', '(21) 98888-7777');
    await page.fill('#v4CrmInteresse', 'Física · ENEM');
    await page.click('#v4CrmForm button[type=submit]');
    await page.waitForSelector('#v4CrmBody tr:has-text("Daniela Interessada")');
    await page.selectOption('#v4CrmBody tr:has-text("Daniela Interessada") select', 'experimental');
    await page.waitForFunction(() => document.getElementById('v4CrmTrial')?.textContent === '1');
    await page.click('#v4CrmBody tr:has-text("Daniela Interessada") [data-pg-action=converter]');
    await page.waitForSelector('#v4CrmBody tr:has-text("Daniela Interessada") >> text=Aluno criado');
    const alunos = await eventually(async () => {
      const q = await db.collection('alunos').where('organizationId', '==', 'org_a').where('nome', '==', 'Daniela Interessada').get();
      return q.size ? q : null;
    });
    assert.equal(alunos.size, 1);
    assert.equal(alunos.docs[0].data().tel, '21988887777');
    await page.waitForFunction(() => document.getElementById('badgeAlunos')?.textContent === '3');
    await ctx.close();
  });

  it('presença consome 1 crédito uma única vez e o estorno devolve ao mudar para falta', async () => {
    const { ctx, page } = await login('prof.a@example.com');
    await page.waitForSelector('#wrapper', { state: 'visible' });
    await page.waitForFunction(() => window.__gestaoV4?.getState().pacotes.length === 1);
    const registrar = (presenca) => page.evaluate(async (p) => {
      window.showSection('pedagogico');
      const sel = document.getElementById('pedAula');
      if (![...sel.options].some((o) => o.value === 'futuraHoje')) sel.add(new Option('futuraHoje', 'futuraHoje'));
      sel.value = 'futuraHoje';
      document.getElementById('pedPresenca').value = p;
      document.getElementById('pedConteudo').value = 'Cinemática';
      await window.salvarRegistroPedagogico();
    }, presenca);
    await registrar('presente');
    await Promise.all([registrar('presente'), registrar('presente')]); // cliques repetidos/concorrentes
    let pac = (await db.doc('pacotes/pacA1').get()).data();
    assert.equal(pac.creditosUsados, 1);
    assert.equal((await db.doc('aulas/futuraHoje').get()).data().creditoConsumidoPacoteId, 'pacA1');
    await registrar('faltou');
    pac = (await db.doc('pacotes/pacA1').get()).data();
    assert.equal(pac.creditosUsados, 0);
    assert.equal((await db.doc('aulas/futuraHoje').get()).data().creditoConsumidoPacoteId, null);
    await ctx.close();
  });

  it('professor B vê apenas o próprio tenant', async () => {
    const { ctx, page } = await login('prof.b@example.com');
    await page.waitForSelector('#wrapper', { state: 'visible' });
    await page.waitForFunction(() => document.getElementById('badgeAlunos')?.textContent === '1');
    const st = await page.evaluate(() => window.__gestaoV4.getState());
    assert.deepEqual(st.alunos.map((a) => a.nome), ['Carla B']);
    assert.deepEqual(st.eventos.map((e) => e.organizationId), ['org_b']);
    await ctx.close();
  });

  it('convite do portal só vira acesso depois da confirmação do e-mail', async () => {
    const prof = await login('prof.a@example.com');
    await prof.page.waitForSelector('#wrapper', { state: 'visible' });
    await prof.page.waitForFunction(() => document.getElementById('badgeAlunos')?.textContent !== '0');
    await prof.page.evaluate(async () => {
      document.getElementById('inviteAluno').value = 'alunoA1';
      document.getElementById('inviteEmail').value = 'mae.ana@example.com';
      document.getElementById('inviteRole').value = 'responsavel';
      await window.salvarConviteAcesso();
    });
    assert.equal((await db.doc('convites/mae.ana@example.com').get()).data().organizationId, 'org_a');
    await prof.ctx.close();

    const ctx = await browser.newContext({ serviceWorkers: 'block', proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => pageErrors.push(`ativacao: ${e.message}`));
    await page.goto(URL_APP);
    await page.click('#personaFamilia');
    await page.click('#authToggle');
    await page.fill('#registerName', 'Mãe da Ana');
    await page.fill('#loginEmail', 'mae.ana@example.com');
    await page.fill('#loginPassword', PASS);
    await page.click('#loginButton');
    await page.waitForSelector('#loginMessage', { state: 'visible' });
    await page.waitForFunction(() => !document.getElementById('loginButton').disabled);
    assert.match(await page.textContent('#loginMessage'), /link de confirmação/);
    const user = await auth.getUserByEmail('mae.ana@example.com');
    assert.equal((await db.doc(`usuarios/${user.uid}`).get()).exists, false, 'sem e-mail confirmado não há perfil');

    // Tentativa de entrar antes de confirmar continua bloqueada.
    await page.fill('#loginPassword', PASS);
    await page.click('#loginButton');
    await page.waitForSelector('#loginMessage:has-text("Confirme seu e-mail")');

    await auth.updateUser(user.uid, { emailVerified: true });
    await page.fill('#loginPassword', PASS);
    await page.click('#loginButton');
    await page.waitForSelector('#familyApp', { state: 'visible', timeout: 20000 });
    await page.waitForFunction(() => document.getElementById('familyStudentName')?.textContent === 'Ana Souza');
    const perfil = (await db.doc(`usuarios/${user.uid}`).get()).data();
    assert.deepEqual([perfil.role, perfil.alunoId, perfil.organizationId], ['responsavel', 'alunoA1', 'org_a']);
    await ctx.close();
  });

  it('responsável já ativo entra direto no portal do próprio aluno', async () => {
    const { ctx, page } = await login('fam.a@example.com', { familia: true });
    await page.waitForSelector('#familyApp', { state: 'visible', timeout: 20000 });
    await page.waitForFunction(() => document.getElementById('familyStudentName')?.textContent === 'Ana Souza');
    await ctx.close();
  });

  it('teste vencido: leitura permitida, gravação recusada pelo servidor', async () => {
    const { ctx, page } = await login('expired@example.com');
    await page.waitForSelector('#wrapper', { state: 'visible' });
    await page.evaluate(() => window.showSection('alunos'));
    await page.fill('#alunoNome', 'Não deve gravar');
    await page.fill('#alunoTel', '21900000000');
    await page.click('#formAluno button[type=submit]');
    await page.waitForSelector('.custom-toast.error', { timeout: 15000 });
    const snap = await db.collection('alunos').where('nome', '==', 'Não deve gravar').get();
    assert.equal(snap.size, 0);
    await ctx.close();
  });

  it('nenhum erro de JavaScript na página durante os fluxos', () => {
    assert.deepEqual(pageErrors, []);
  });
});
