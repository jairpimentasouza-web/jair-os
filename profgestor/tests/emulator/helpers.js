// Ambiente de teste das regras: emulador local, nunca produção.
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

export const PROJECT_ID = 'demo-profgestor';
const DAY = 24 * 60 * 60 * 1000;
export const daysFromNow = (n) => Timestamp.fromMillis(Date.now() + n * DAY);

export async function createEnv() {
  const fsHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  const stHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199';
  const [fh, fp] = fsHost.split(':');
  const [sh, sp] = stHost.replace(/^https?:\/\//, '').split(':');
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: fh, port: Number(fp) },
    storage: { rules: readFileSync(new URL('../../storage.rules', import.meta.url), 'utf8'), host: sh, port: Number(sp) },
  });
}

// Identidades de teste. Todos com e-mail verificado, exceto quando indicado.
export const USERS = {
  profA: { email: 'prof.a@example.com', email_verified: true },
  profB: { email: 'prof.b@example.com', email_verified: true },
  colabA: { email: 'colab.a@example.com', email_verified: true },
  famA: { email: 'fam.a@example.com', email_verified: true },
  inactiveA: { email: 'inactive.a@example.com', email_verified: true },
  expiredT: { email: 'expired@example.com', email_verified: true },
  paidT: { email: 'paid@example.com', email_verified: true },
  platform: { email: 'owner@example.com', email_verified: true },
  stranger: { email: 'stranger@example.com', email_verified: true },
};

export function as(env, name, overrides = {}) {
  return env.authenticatedContext(name, { ...USERS[name], ...overrides }).firestore();
}

export async function seed(env) {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const put = (path, data) => setDoc(doc(db, path), data);
    const old = daysFromNow(-400);
    await Promise.all([
      put('organizations/org_a', { nome: 'Org A (proprietário)', ownerUid: 'profA', createdAt: old, billingExempt: true }),
      put('organizations/org_b', { nome: 'Org B (em teste)', ownerUid: 'profB', createdAt: daysFromNow(-2) }),
      put('organizations/org_expired', { nome: 'Org vencida', ownerUid: 'expiredT', createdAt: daysFromNow(-30) }),
      put('organizations/org_paid', { nome: 'Org paga', ownerUid: 'paidT', createdAt: daysFromNow(-60),
        entitlement: { plan: 'profissional', status: 'active', accessUntil: daysFromNow(25) } }),

      put('usuarios/profA', { email: USERS.profA.email, nome: 'Prof A', role: 'admin', organizationId: 'org_a', ativo: true }),
      put('usuarios/profB', { email: USERS.profB.email, nome: 'Prof B', role: 'admin', organizationId: 'org_b', ativo: true }),
      put('usuarios/colabA', { email: USERS.colabA.email, nome: 'Colab A', role: 'colaborador', organizationId: 'org_a', ativo: true }),
      put('usuarios/famA', { email: USERS.famA.email, nome: 'Resp A1', role: 'responsavel', organizationId: 'org_a', alunoId: 'alunoA1', ativo: true }),
      put('usuarios/inactiveA', { email: USERS.inactiveA.email, nome: 'Inativo', role: 'admin', organizationId: 'org_a', ativo: false }),
      put('usuarios/expiredT', { email: USERS.expiredT.email, nome: 'Vencido', role: 'admin', organizationId: 'org_expired', ativo: true }),
      put('usuarios/paidT', { email: USERS.paidT.email, nome: 'Pagante', role: 'admin', organizationId: 'org_paid', ativo: true }),
      put('platformAdmins/platform', { since: old }),

      put('alunos/alunoA1', { organizationId: 'org_a', nome: 'Aluno A1', tel: '21999990001', materia: 'Física' }),
      put('alunos/alunoA2', { organizationId: 'org_a', nome: 'Aluno A2', tel: '21999990002', materia: 'Matemática' }),
      put('alunos/alunoB1', { organizationId: 'org_b', nome: 'Aluno B1', tel: '11999990001', materia: 'Química' }),
      put('alunos/alunoExp', { organizationId: 'org_expired', nome: 'Aluno Exp', materia: 'Física' }),

      put('aulas/aulaA1', { organizationId: 'org_a', alunoId: 'alunoA1', alunoNome: 'Aluno A1', start: '2026-11-10T14:00:00', end: '2026-11-10T15:00:00', valor: 120, status: 'pendente', statusAula: 'agendada' }),
      put('aulas/aulaA2', { organizationId: 'org_a', alunoId: 'alunoA2', alunoNome: 'Aluno A2', start: '2026-11-11T14:00:00', end: '2026-11-11T15:00:00', valor: 100, status: 'pago', statusAula: 'agendada' }),
      put('aulas/aulaB1', { organizationId: 'org_b', alunoId: 'alunoB1', alunoNome: 'Aluno B1', start: '2026-11-10T14:00:00', end: '2026-11-10T15:00:00', valor: 90, status: 'pendente' }),
      put('aulas/aulaLegacyValor', { organizationId: 'org_a', alunoId: 'alunoA2', valor: '80,00', status: 'pendente' }),

      put('pacotes/pacA1', { organizationId: 'org_a', alunoId: 'alunoA1', nome: '10 aulas', creditosTotal: 10, creditosUsados: 2, status: 'ativo' }),
      put('pacotes/pacB1', { organizationId: 'org_b', alunoId: 'alunoB1', nome: '4 aulas', creditosTotal: 4, creditosUsados: 0, status: 'ativo' }),
      put('despesas/despA', { organizationId: 'org_a', descricao: 'Material', valor: 50, data: '2026-11-01' }),
      put('despesas/despB', { organizationId: 'org_b', descricao: 'Transporte', valor: 30, data: '2026-11-01' }),
      put('leads/leadA', { organizationId: 'org_a', nome: 'Lead A', etapa: 'lead' }),
      put('leads/leadB', { organizationId: 'org_b', nome: 'Lead B', etapa: 'lead' }),
      put('materiais/matA1', { organizationId: 'org_a', alunoId: 'alunoA1', titulo: 'Lista 1' }),
      put('materiais/matA2', { organizationId: 'org_a', alunoId: 'alunoA2', titulo: 'Lista 2' }),
      put('solicitacoes/solA1', { organizationId: 'org_a', alunoId: 'alunoA1', status: 'pendente', mensagem: 'Remarcar' }),
      put('convites/novo.resp@example.com', { email: 'novo.resp@example.com', organizationId: 'org_a', alunoId: 'alunoA1', role: 'responsavel', ativo: true, createdBy: 'profA' }),
      put('convites/inativo@example.com', { email: 'inativo@example.com', organizationId: 'org_a', alunoId: 'alunoA1', role: 'responsavel', ativo: false, createdBy: 'profA' }),
      put('billingEvents/mp_1', { provider: 'mercadopago', orgId: 'org_paid' }),
      put('sistema/configuracao', { adminUid: 'profA' }),
    ]);
  });
}
