// E2E V5 no Chromium contra os emuladores: flags da plataforma, cadastro self-service,
// onboarding, conta/plano, agenda (sobreposição, recorrência, reagendamento, cancelamento,
// fuso), relatório PDF, auditoria e exportação de dados.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { chromium, serveStatic, clearEmulators, eventually, login, openApp, ymd, local, PASS } from './harness.js';

const PORT = 5058;
const URL_APP = `http://localhost:${PORT}/index.html?emulator=1`;
const DAY = 864e5;
let server, browser, db, auth;
const errors = [];
let novoProfessorUid = null;

// Uma data futura (≥ 10 dias) numa terça-feira, para a agenda não colidir com o "agora".
function proximaTerca() {
  const d = new Date(Date.now() + 10 * DAY);
  while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
  return d;
}

async function seed() {
  await clearEmulators();
  const users = [['own', 'owner@example.com'], ['expT', 'expired@example.com']];
  for (const [uid, email] of users) await auth.createUser({ uid, email, password: PASS, emailVerified: true });
  const set = (p, d) => db.doc(p).set(d);
  const hoje = new Date();
  await Promise.all([
    set('organizations/org_jair', { nome: 'Conta original', ownerUid: 'own', createdAt: Timestamp.fromMillis(Date.now() - 400 * DAY), billingExempt: true }),
    set('organizations/org_exp', { nome: 'Teste vencido', ownerUid: 'expT', createdAt: Timestamp.fromMillis(Date.now() - 30 * DAY) }),
    set('usuarios/own', { email: 'owner@example.com', nome: 'Proprietário', role: 'admin', organizationId: 'org_jair', ativo: true }),
    set('usuarios/expT', { email: 'expired@example.com', nome: 'Vencido', role: 'admin', organizationId: 'org_exp', ativo: true }),
    set('alunos/alunoA1', { organizationId: 'org_jair', nome: 'Ana Souza', tel: '21999990001', materia: 'Física' }),
    set('alunos/alunoA2', { organizationId: 'org_jair', nome: 'Bruno Lima', tel: '21999990002', materia: 'Matemática' }),
    set('alunos/alunoExp', { organizationId: 'org_exp', nome: 'Aluno Exp', materia: 'Física' }),
    set('aulas/passada', { organizationId: 'org_jair', alunoId: 'alunoA1', alunoNome: 'Ana Souza', title: 'Ana Souza (Física)', start: local(new Date(hoje.getTime() - 5 * DAY)), end: local(new Date(hoje.getTime() - 5 * DAY + 3600e3)), valor: 120, status: 'pendente', statusAula: 'realizada', presenca: 'presente', conteudo: 'Cinemática' }),
    set('despesas/d1', { organizationId: 'org_jair', descricao: 'Livro', valor: 40, data: ymd(hoje) }),
  ]);
}
const setFlags = (flags) => db.doc('platformConfig/public').set(flags);
const aulasDe = async (alunoId) => (await db.collection('aulas').where('organizationId', '==', 'org_jair').where('alunoId', '==', alunoId).get()).docs.map((d) => ({ id: d.id, ...d.data() }));

async function abrirAula(page) {
  await page.evaluate(() => window.abrirNovaAulaHoje());
  await page.waitForSelector('#modalEvento.show');
}
async function salvarAula(page, { alunoId, data, inicio, fim, valor = '120' }) {
  await abrirAula(page);
  await page.selectOption('#eventoAluno', alunoId);
  await page.fill('#eventoData', data);
  await page.fill('#eventoHora', inicio);
  await page.fill('#eventoFim', fim);
  await page.fill('#eventoValor', valor);
}
async function ownerPage(extra) {
  const s = await login(browser, URL_APP, 'owner@example.com', errors, extra);
  await s.page.waitForSelector('#authGate', { state: 'hidden', timeout: 20000 });
  await s.page.waitForFunction(() => document.getElementById('badgeAlunos')?.textContent === '2');
  return s;
}

before(async () => {
  if (!getApps().length) initializeApp({ projectId: 'demo-profgestor' });
  db = getFirestore(); auth = getAuth();
  await seed();
  server = serveStatic(PORT);
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.close(); });

describe('Plataforma e cadastro', () => {
  it('cadastro de professor fechado: link de cadastro informa e não exibe formulário', async () => {
    const { ctx, page } = await openApp(browser, `${URL_APP}&cadastro=professor`, errors);
    await page.waitForSelector('#loginMessage:has-text("ainda não está aberto")');
    assert.equal(await page.isVisible('#authToggle'), false);
    assert.equal(await page.isVisible('#registerSchoolGroup'), false);
    await ctx.close();
  });

  it('cadastro aberto: verificação de e-mail → organização própria em teste → onboarding', async () => {
    await setFlags({ selfSignupOpen: true });
    const { ctx, page } = await openApp(browser, `${URL_APP}&cadastro=professor`, errors);
    await page.waitForSelector('#registerSchoolGroup', { state: 'visible' });
    await page.fill('#registerName', 'Carla Mendes');
    await page.fill('#registerSchool', 'Química com a Carla');
    await page.fill('#loginEmail', 'carla@example.com');
    await page.fill('#loginPassword', PASS);
    await page.click('#loginButton');
    await page.waitForSelector('#loginMessage:has-text("link de confirmação")');
    const u = await auth.getUserByEmail('carla@example.com');
    novoProfessorUid = u.uid;
    assert.equal((await db.doc(`organizations/org_${u.uid}`).get()).exists, false, 'sem e-mail confirmado não há organização');

    await auth.updateUser(u.uid, { emailVerified: true });
    await page.fill('#loginPassword', PASS);
    await page.click('#loginButton');
    await page.waitForSelector('#authGate', { state: 'hidden', timeout: 20000 });
    await page.waitForSelector('#wrapper', { state: 'visible' });
    const org = await eventually(async () => (await db.doc(`organizations/org_${u.uid}`).get()).data());
    assert.equal(org.nome, 'Química com a Carla');
    assert.equal(org.ownerUid, u.uid);
    assert.ok(org.createdAt instanceof Timestamp && Math.abs(org.createdAt.toMillis() - Date.now()) < 120000);
    assert.equal(org.billingExempt, undefined);
    const perfil = (await db.doc(`usuarios/${u.uid}`).get()).data();
    assert.deepEqual([perfil.role, perfil.organizationId], ['admin', `org_${u.uid}`]);

    await page.waitForSelector('#v5Onboarding .v5-onb:has-text("1 de 8")');
    await page.evaluate(() => window.showSection('alunos'));
    await page.fill('#alunoNome', 'Primeiro Aluno');
    await page.fill('#alunoTel', '11988887777');
    await page.click('#formAluno button[type=submit]');
    await eventually(async () => (await db.collection('alunos').where('organizationId', '==', `org_${u.uid}`).get()).size === 1);
    await page.evaluate(() => window.showSection('dashboard'));
    await page.waitForSelector('#v5Onboarding .v5-onb:has-text("2 de 8")');

    await page.evaluate(() => window.showSection('conta'));
    await page.waitForSelector('#v5StatusPill:has-text("Teste grátis · 14 dia(s)")');
    assert.equal(await page.locator('[data-pg-action=assinar]').count(), 0, 'sem billingEnabled não há botão de assinar');
    await ctx.close();
  });

  it('convite tem prioridade: responsável convidado não vira professor mesmo com cadastro aberto', async () => {
    await db.doc('convites/pai.ana@example.com').set({ email: 'pai.ana@example.com', organizationId: 'org_jair', alunoId: 'alunoA1', alunoNome: 'Ana Souza', role: 'responsavel', ativo: true, createdBy: 'own' });
    const { ctx, page } = await openApp(browser, URL_APP, errors);
    await page.click('#personaFamilia');
    await page.click('#authToggle');
    await page.fill('#registerName', 'Pai da Ana');
    await page.fill('#loginEmail', 'pai.ana@example.com');
    await page.fill('#loginPassword', PASS);
    await page.click('#loginButton');
    await page.waitForSelector('#loginMessage:has-text("link de confirmação")');
    const u = await auth.getUserByEmail('pai.ana@example.com');
    await auth.updateUser(u.uid, { emailVerified: true });
    await page.click('#personaProfessor'); // entra pela aba "Professor" por engano
    await page.fill('#loginEmail', 'pai.ana@example.com');
    await page.fill('#loginPassword', PASS);
    await page.click('#loginButton');
    await page.waitForSelector('#familyApp', { state: 'visible', timeout: 20000 });
    assert.equal((await db.doc(`organizations/org_${u.uid}`).get()).exists, false);
    assert.equal((await db.doc(`usuarios/${u.uid}`).get()).data().role, 'responsavel');
    await ctx.close();
  });

  it('planos: botões de assinatura só aparecem quando a cobrança é aberta pela plataforma', async () => {
    await setFlags({ selfSignupOpen: true, billingEnabled: true });
    const { ctx, page } = await login(browser, URL_APP, 'carla@example.com', errors);
    await page.waitForSelector('#authGate', { state: 'hidden', timeout: 20000 });
    await page.evaluate(() => window.showSection('conta'));
    await page.waitForSelector('[data-pg-action=assinar][data-id=profissional]');
    assert.equal(await page.locator('[data-pg-action=assinar][data-id=equipe]').count(), 0, 'Equipe não é vendável');
    await ctx.close();
    const own = await ownerPage();
    await own.page.evaluate(() => window.showSection('conta'));
    await own.page.waitForSelector('#v5StatusPill:has-text("isenta")');
    assert.equal(await own.page.locator('[data-pg-action=assinar]').count(), 0, 'conta isenta não assina');
    await own.ctx.close();
    await setFlags({ selfSignupOpen: false, billingEnabled: false });
  });
});

describe('Agenda', () => {
  const terca = proximaTerca();
  const D = ymd(terca);

  it('cria aula pelo formulário, bloqueia sobreposição, reagenda e cancela', async () => {
    const { ctx, page } = await ownerPage();
    await salvarAula(page, { alunoId: 'alunoA1', data: D, inicio: '14:00', fim: '15:00' });
    await page.click('#btnSalvarEvento');
    const [aula] = await eventually(async () => { const a = (await aulasDe('alunoA1')).filter((x) => x.start === `${D}T14:00:00`); return a.length ? a : null; });
    assert.equal(aula.end, `${D}T15:00:00`);
    assert.equal(aula.valor, 120);

    await page.waitForFunction(() => !document.querySelector('#modalEvento.show'));
    await salvarAula(page, { alunoId: 'alunoA2', data: D, inicio: '14:30', fim: '15:30' });
    await page.click('#btnSalvarEvento');
    await page.waitForSelector('.custom-toast.warning:has-text("Conflito de agenda")');
    assert.equal((await aulasDe('alunoA2')).filter((x) => x.start.startsWith(D)).length, 0, 'sobreposição não gravada');
    await page.click('#modalEvento .btn-close');

    // Reagendamento pela mesma janela do clique no calendário (objeto no formato do FullCalendar).
    await page.waitForFunction((id) => window.__gestaoV4.getState().eventos.some((e) => e.id === id), aula.id);
    await page.evaluate((id) => {
      const a = window.__gestaoV4.getState().eventos.find((e) => e.id === id);
      const p = (s) => { const [d, t] = s.split('T'); const [y, m, dd] = d.split('-').map(Number); const [h, mi] = t.split(':').map(Number); return new Date(y, m - 1, dd, h, mi); };
      window.abrirModalEvento({ id, start: p(a.start), end: p(a.end), extendedProps: a });
    }, aula.id);
    await page.waitForSelector('#modalEvento.show');
    await page.fill('#eventoHora', '16:00');
    await page.fill('#eventoFim', '17:00');
    await page.click('#btnSalvarEvento');
    await eventually(async () => (await db.doc(`aulas/${aula.id}`).get()).data().start === `${D}T16:00:00`);

    // Agora 14:30 está livre: a aula de Bruno pode ser marcada.
    await page.waitForFunction(() => !document.querySelector('#modalEvento.show'));
    await salvarAula(page, { alunoId: 'alunoA2', data: D, inicio: '14:30', fim: '15:30' });
    await page.click('#btnSalvarEvento');
    await eventually(async () => (await aulasDe('alunoA2')).some((x) => x.start === `${D}T14:30:00`));

    // Cancelamento pelo status da aula.
    await page.waitForFunction(() => !document.querySelector('#modalEvento.show'));
    await page.evaluate((id) => {
      const a = window.__gestaoV4.getState().eventos.find((e) => e.id === id);
      const p = (s) => { const [d, t] = s.split('T'); const [y, m, dd] = d.split('-').map(Number); const [h, mi] = t.split(':').map(Number); return new Date(y, m - 1, dd, h, mi); };
      window.abrirModalEvento({ id, start: p(a.start), end: p(a.end), extendedProps: a });
    }, aula.id);
    await page.waitForSelector('#modalEvento.show');
    await page.selectOption('#eventoStatusAula', 'cancelada');
    await page.click('#btnSalvarEvento');
    await eventually(async () => (await db.doc(`aulas/${aula.id}`).get()).data().statusAula === 'cancelada');
    await ctx.close();
  });

  it('recorrência semanal cria exatamente as datas esperadas e pula conflitos', async () => {
    const { ctx, page } = await ownerPage();
    const inicio = new Date(terca.getTime() + 7 * DAY); // terça seguinte
    const fim = new Date(inicio.getTime() + 20 * DAY);
    // Conflito proposital na quinta da primeira semana, 09:00.
    const quinta = new Date(inicio.getTime() + 2 * DAY);
    await db.doc('aulas/bloqueio').set({ organizationId: 'org_jair', alunoId: 'alunoA2', alunoNome: 'Bruno Lima', start: `${ymd(quinta)}T09:00:00`, end: `${ymd(quinta)}T10:00:00`, valor: 100, status: 'pendente', statusAula: 'agendada' });
    await page.waitForFunction(() => window.__gestaoV4.getState().eventos.some((e) => e.id === 'bloqueio'));
    await salvarAula(page, { alunoId: 'alunoA1', data: ymd(inicio), inicio: '09:00', fim: '10:00', valor: '90' });
    await page.check('#eventoRecorrente');
    // Os dias são checkboxes estilizados (input oculto): o usuário clica no rótulo.
    for (const dia of [0, 1, 2, 3, 4, 5, 6]) {
      if ((await page.isChecked(`#recDia${dia}`)) !== (dia === 2 || dia === 4)) await page.click(`label[for=recDia${dia}]`);
    }
    await page.fill('#eventoRecorrenciaFim', ymd(fim));
    await page.click('#btnSalvarEvento');
    const esperado = [];
    for (let d = new Date(inicio); d <= fim; d = new Date(d.getTime() + DAY)) if ([2, 4].includes(d.getDay()) && ymd(d) !== ymd(quinta)) esperado.push(`${ymd(d)}T09:00:00`);
    const criadas = await eventually(async () => {
      const a = (await aulasDe('alunoA1')).filter((x) => x.start >= ymd(inicio) && x.start <= `${ymd(fim)}T23:59`).map((x) => x.start).sort();
      return a.length === esperado.length ? a : null;
    });
    assert.deepEqual(criadas, esperado);
    await ctx.close();
  });

  it('fuso horário: o horário é salvo como digitado, mesmo com o navegador em Manaus', async () => {
    const { ctx, page } = await ownerPage({ timezoneId: 'America/Manaus' });
    const d = ymd(new Date(terca.getTime() + 2 * DAY));
    await salvarAula(page, { alunoId: 'alunoA2', data: d, inicio: '18:00', fim: '19:00' });
    await page.click('#btnSalvarEvento');
    await eventually(async () => (await aulasDe('alunoA2')).some((x) => x.start === `${d}T18:00:00` && x.end === `${d}T19:00:00`));
    await ctx.close();
  });
});

describe('Relatórios, auditoria e dados', () => {
  it('relatório PDF do aluno é gerado e baixado', async () => {
    const { ctx, page } = await ownerPage();
    await page.evaluate(() => window.showSection('relatorios'));
    await page.selectOption('#relatorioAluno', 'alunoA1');
    const hoje = new Date();
    await page.fill('#relatorioInicio', ymd(new Date(hoje.getTime() - 30 * DAY)));
    await page.fill('#relatorioFim', ymd(hoje));
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Gerar Relatório (PDF)")')]);
    const bytes = await readFile(await download.path());
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    assert.ok(bytes.length > 2000);
    assert.match(download.suggestedFilename(), /^relatorio_Ana Souza_.*\.pdf$/);
    await ctx.close();
  });

  it('auditoria registra a mudança de pagamento com autor e horário do servidor', async () => {
    const { ctx, page } = await ownerPage();
    await page.evaluate(() => window.alternarPagamento('passada', 'pago'));
    const log = await eventually(async () => { const q = await db.collection('auditLogs').where('action', '==', 'aula.pagamento').get(); return q.size ? q.docs[0].data() : null; });
    assert.deepEqual([log.organizationId, log.actorUid, log.alvo.id, log.detalhes.de, log.detalhes.para, log.detalhes.valor], ['org_jair', 'own', 'passada', 'pendente', 'pago', 120]);
    assert.ok(log.at instanceof Timestamp);
    await page.evaluate(() => window.showSection('conta'));
    await page.click('[data-pg-action=auditoria]');
    await page.waitForSelector('#v5Auditoria tr:has-text("Pagamento de aula")');
    await ctx.close();
  });

  it('exportação (LGPD) baixa todos os dados do tenant em JSON', async () => {
    const { ctx, page } = await ownerPage();
    await page.evaluate(() => window.showSection('conta'));
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-pg-action=exportar]')]);
    const json = JSON.parse(await readFile(await download.path(), 'utf8'));
    const n = async (col) => (await db.collection(col).where('organizationId', '==', 'org_jair').get()).size;
    assert.equal(json.formato, 'profgestor-export/1');
    assert.equal(json.organizationId, 'org_jair');
    assert.equal(json.contagens.alunos, await n('alunos'));
    assert.equal(json.contagens.aulas, await n('aulas'));
    assert.equal(json.contagens.convites, await n('convites'));
    assert.ok(json.dados.alunos.some((a) => a.nome === 'Ana Souza'));
    await eventually(async () => (await db.collection('auditLogs').where('action', '==', 'dados.exportar').get()).size === 1);
    await ctx.close();
  });

  it('teste vencido: aviso de somente leitura, exportação continua disponível', async () => {
    const { ctx, page } = await login(browser, URL_APP, 'expired@example.com', errors);
    await page.waitForSelector('#v5Banner:has-text("somente leitura")');
    await page.evaluate(() => window.showSection('conta'));
    await page.waitForSelector('#v5StatusPill:has-text("Somente leitura")');
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-pg-action=exportar]')]);
    assert.equal(JSON.parse(await readFile(await download.path(), 'utf8')).contagens.alunos, 1);
    await ctx.close();
  });

  it('Pix de aula fica oculto até a plataforma habilitar o backend', async () => {
    let s = await ownerPage();
    await s.page.evaluate(() => window.showSection('financeiro'));
    await s.page.waitForSelector('#financeiro tbody tr');
    assert.equal(await s.page.locator('[onclick^="gerarPixParaAula"]').count(), 0);
    await s.ctx.close();
    await setFlags({ pixAulaEnabled: true });
    s = await ownerPage();
    await s.page.evaluate(() => window.showSection('financeiro'));
    await s.page.waitForSelector('[onclick^="gerarPixParaAula"]');
    await s.ctx.close();
    await setFlags({});
  });

  it('nenhum erro de JavaScript na página', () => {
    assert.deepEqual(errors, []);
  });
});
