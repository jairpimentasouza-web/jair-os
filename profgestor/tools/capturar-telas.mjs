// Gera as capturas de tela do site comercial a partir do app real, rodando nos emuladores
// com dados FICTÍCIOS. Uso: npm run site:telas
import { mkdir } from 'node:fs/promises';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { chromium, serveStatic, clearEmulators, contextOptions, local, ymd, PASS } from '../tests/e2e/harness.js';

const PORT = 5062;
const URL_APP = `http://localhost:${PORT}/index.html?emulator=1`;
const OUT = new URL('../site/img/', import.meta.url);
const DAY = 864e5;

initializeApp({ projectId: 'demo-profgestor' });
const db = getFirestore();
const auth = getAuth();

function semanaAtual() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // segunda-feira
  return d;
}
const em = (base, dias, h, m = 0) => { const d = new Date(base.getTime() + dias * DAY); d.setHours(h, m, 0, 0); return d; };

async function seed() {
  await clearEmulators();
  await auth.createUser({ uid: 'demo', email: 'marina@exemplo.com.br', password: PASS, emailVerified: true });
  await auth.createUser({ uid: 'famdemo', email: 'responsavel@exemplo.com.br', password: PASS, emailVerified: true });
  const b = db.batch();
  const set = (p, d) => b.set(db.doc(p), d);
  const org = 'org_demo';
  set(`organizations/${org}`, { nome: 'Aulas da Marina', ownerUid: 'demo', createdAt: Timestamp.fromMillis(Date.now() - 200 * DAY), billingExempt: true });
  set('usuarios/demo', { email: 'marina@exemplo.com.br', nome: 'Marina Costa', role: 'admin', organizationId: org, ativo: true });
  set('usuarios/famdemo', { email: 'responsavel@exemplo.com.br', nome: 'Paulo Ribeiro', role: 'responsavel', organizationId: org, alunoId: 'a1', ativo: true });
  const alunos = [
    ['a1', 'Lucas Ribeiro', 'Matemática · 9º ano'], ['a2', 'Beatriz Nogueira', 'Física · 2º ano EM'], ['a3', 'Rafael Martins', 'Matemática · ENEM'],
    ['a4', 'Júlia Andrade', 'Física · 1º ano EM'], ['a5', 'Pedro Lacerda', 'Matemática · 7º ano'], ['a6', 'Sofia Almeida', 'Física · ENEM'],
  ];
  for (const [id, nome, materia] of alunos) set(`alunos/${id}`, { organizationId: org, nome, materia, tel: '21900000000' });
  const seg = semanaAtual();
  const grade = [
    ['a1', 0, 15], ['a2', 0, 17], ['a3', 1, 9], ['a4', 1, 14], ['a5', 2, 16], ['a6', 2, 18],
    ['a1', 3, 15], ['a3', 3, 19], ['a2', 4, 10], ['a6', 4, 14], ['a4', 5, 9],
  ];
  let i = 0;
  for (const [aluno, dia, hora] of grade) {
    for (const semana of [-2, -1, 0, 1]) {
      const ini = em(seg, dia + semana * 7, hora);
      const passado = ini.getTime() < Date.now();
      const nome = alunos.find((a) => a[0] === aluno)[1];
      set(`aulas/d${i++}`, {
        organizationId: org, alunoId: aluno, alunoNome: nome, title: nome, start: local(ini), end: local(new Date(ini.getTime() + 3600e3)),
        valor: aluno === 'a3' || aluno === 'a6' ? 150 : 120, status: passado && (i % 3 !== 0) ? 'pago' : 'pendente',
        statusAula: passado ? 'realizada' : 'agendada', modalidade: i % 3 ? 'online' : 'presencial',
        ...(passado && i % 5 !== 0 ? { presenca: 'presente', registradoEm: local(ini), conteudo: aluno.endsWith('1') ? 'Equações do 2º grau' : 'Cinemática: MRUV', tarefa: 'Lista 3, exercícios 1 a 8', progresso: 'evoluindo' } : {}),
      });
    }
  }
  set('despesas/x1', { organizationId: org, descricao: 'Material impresso', valor: 85, data: ymd(new Date()) });
  set('despesas/x2', { organizationId: org, descricao: 'Transporte', valor: 60, data: ymd(new Date()) });
  set('pacotes/p1', { organizationId: org, alunoId: 'a1', nome: 'Pacote 8 aulas', creditosTotal: 8, creditosUsados: 5, validade: ymd(new Date(Date.now() + 40 * DAY)), status: 'ativo' });
  set('pacotes/p2', { organizationId: org, alunoId: 'a3', nome: 'Pacote ENEM 12 aulas', creditosTotal: 12, creditosUsados: 3, validade: ymd(new Date(Date.now() + 70 * DAY)), status: 'ativo' });
  for (const [id, nome, etapa, interesse] of [['l1', 'Carolina Pires', 'lead', 'Matemática · 8º ano'], ['l2', 'Diego Souto', 'experimental', 'Física · ENEM'], ['l3', 'Helena Duarte', 'proposta', 'Matemática · vestibular'], ['l4', 'Igor Matos', 'convertido', 'Física · 1º ano EM']]) {
    set(`leads/${id}`, { organizationId: org, nome, etapa, interesse, origem: 'Indicação', createdAt: local(new Date()) });
  }
  await b.commit();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await seed();
  const server = serveStatic(PORT);
  const browser = await chromium.launch();
  const shot = (page, nome) => page.screenshot({ path: new URL(`${nome}.jpg`, OUT).pathname, type: 'jpeg', quality: 82 });
  try {
    const ctx = await browser.newContext(contextOptions({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 }));
    const page = await ctx.newPage();
    await page.goto(URL_APP);
    await page.fill('#loginEmail', 'marina@exemplo.com.br');
    await page.fill('#loginPassword', PASS);
    await page.click('#loginButton');
    await page.waitForSelector('#authGate', { state: 'hidden', timeout: 20000 });
    await page.waitForFunction(() => document.getElementById('badgeAlunos')?.textContent === '6');
    await page.waitForTimeout(800);
    await shot(page, 'painel');
    await page.evaluate(() => window.showSection('agenda'));
    await page.waitForTimeout(1200);
    await shot(page, 'agenda');
    await page.evaluate(() => window.showSection('financeiro'));
    await page.waitForTimeout(800);
    await shot(page, 'financeiro');
    await page.evaluate(() => window.showSection('crm'));
    await page.waitForTimeout(600);
    await shot(page, 'crm');
    await ctx.close();

    const mob = await browser.newContext(contextOptions({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }));
    const fp = await mob.newPage();
    await fp.goto(URL_APP);
    await fp.click('#personaFamilia');
    await fp.fill('#loginEmail', 'responsavel@exemplo.com.br');
    await fp.fill('#loginPassword', PASS);
    await fp.click('#loginButton');
    await fp.waitForSelector('#familyApp', { state: 'visible', timeout: 20000 });
    await fp.waitForFunction(() => document.getElementById('familyStudentName')?.textContent === 'Lucas Ribeiro');
    await fp.waitForTimeout(600);
    await shot(fp, 'portal-familia');
    await mob.close();
    console.log('Capturas geradas em site/img/');
  } finally {
    await browser.close(); server.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
