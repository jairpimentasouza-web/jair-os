// Matriz de isolamento e permissões (Firestore). Executa contra o emulador local.
import { describe, it, before, after, beforeEach } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, query, where, getDocs,
  writeBatch, serverTimestamp, runTransaction, increment, orderBy, limit,
} from 'firebase/firestore';
import { createEnv, seed, as, daysFromNow } from './helpers.js';

let env;
before(async () => { env = await createEnv(); });
after(async () => { await env?.cleanup(); });
beforeEach(async () => { await seed(env); });

const byOrg = (db, col, org) => query(collection(db, col), where('organizationId', '==', org));

describe('Isolamento entre tenants (professor A × professor B)', () => {
  it('A lista os próprios alunos com a consulta usada pelo cliente V4', async () => {
    const db = as(env, 'profA');
    for (const col of ['alunos', 'aulas', 'despesas', 'pacotes', 'leads', 'solicitacoes']) {
      await assertSucceeds(getDocs(byOrg(db, col, 'org_a')));
    }
  });
  it('A não lista dados de B nem consulta sem filtro de tenant', async () => {
    const db = as(env, 'profA');
    for (const col of ['alunos', 'aulas', 'despesas', 'pacotes', 'leads', 'solicitacoes', 'materiais']) {
      await assertFails(getDocs(byOrg(db, col, 'org_b')));
      await assertFails(getDocs(collection(db, col)));
    }
  });
  it('A não lê documento de B mesmo conhecendo o ID', async () => {
    const db = as(env, 'profA');
    await assertFails(getDoc(doc(db, 'alunos/alunoB1')));
    await assertFails(getDoc(doc(db, 'aulas/aulaB1')));
    await assertFails(getDoc(doc(db, 'despesas/despB')));
    await assertFails(getDoc(doc(db, 'pacotes/pacB1')));
    await assertFails(getDoc(doc(db, 'leads/leadB')));
  });
  it('B não altera nem exclui registros de A', async () => {
    const db = as(env, 'profB');
    await assertFails(updateDoc(doc(db, 'aulas/aulaA1'), { status: 'pago' }));
    await assertFails(updateDoc(doc(db, 'alunos/alunoA1'), { nome: 'invadido' }));
    await assertFails(deleteDoc(doc(db, 'despesas/despA')));
    await assertFails(deleteDoc(doc(db, 'alunos/alunoA1')));
    await assertFails(setDoc(doc(db, 'aulas/aulaA1'), { organizationId: 'org_b', alunoId: 'alunoB1' }));
  });
  it('A não grava documento marcado com o tenant de B', async () => {
    const db = as(env, 'profA');
    await assertFails(addDoc(collection(db, 'alunos'), { organizationId: 'org_b', nome: 'X' }));
    await assertFails(addDoc(collection(db, 'aulas'), { organizationId: 'org_b', alunoId: 'alunoB1', valor: 1 }));
  });
  it('A não move um registro próprio para o tenant de B', async () => {
    const db = as(env, 'profA');
    await assertFails(updateDoc(doc(db, 'aulas/aulaA1'), { organizationId: 'org_b' }));
  });
  it('A opera normalmente no próprio tenant', async () => {
    const db = as(env, 'profA');
    await assertSucceeds(addDoc(collection(db, 'alunos'), { organizationId: 'org_a', nome: 'Novo', tel: '', materia: 'Física' }));
    await assertSucceeds(updateDoc(doc(db, 'aulas/aulaA1'), { status: 'pago', pagoEm: '2026-11-10T15:00:00' }));
    await assertSucceeds(updateDoc(doc(db, 'aulas/aulaA1'), { start: '2026-11-10T16:00:00', end: '2026-11-10T17:00:00' }));
    await assertSucceeds(deleteDoc(doc(db, 'despesas/despA')));
  });
  it('atualização parcial de aula legada com valor em texto continua funcionando', async () => {
    const db = as(env, 'profA');
    await assertSucceeds(updateDoc(doc(db, 'aulas/aulaLegacyValor'), { status: 'pago' }));
    await assertFails(updateDoc(doc(db, 'aulas/aulaLegacyValor'), { valor: '90' }));
  });
});

describe('Usuários sem vínculo', () => {
  it('anônimo não lê nada', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'alunos/alunoA1')));
    await assertFails(getDocs(byOrg(db, 'aulas', 'org_a')));
    await assertFails(getDoc(doc(db, 'organizations/org_a')));
  });
  it('conta autenticada sem perfil não acessa nenhum tenant', async () => {
    const db = as(env, 'stranger');
    await assertFails(getDocs(byOrg(db, 'alunos', 'org_a')));
    await assertFails(getDoc(doc(db, 'aulas/aulaA1')));
    await assertFails(addDoc(collection(db, 'alunos'), { organizationId: 'org_a', nome: 'X' }));
  });
  it('perfil inativo perde o acesso', async () => {
    const db = as(env, 'inactiveA');
    await assertFails(getDocs(byOrg(db, 'alunos', 'org_a')));
  });
  it('colaborador lê, mas não grava', async () => {
    const db = as(env, 'colabA');
    await assertSucceeds(getDocs(byOrg(db, 'aulas', 'org_a')));
    await assertFails(updateDoc(doc(db, 'aulas/aulaA1'), { status: 'pago' }));
    await assertFails(addDoc(collection(db, 'despesas'), { organizationId: 'org_a', valor: 1 }));
  });
});

describe('Escalada de privilégio', () => {
  it('ninguém cria o próprio perfil de admin em tenant existente', async () => {
    const db = as(env, 'stranger');
    await assertFails(setDoc(doc(db, 'usuarios/stranger'), { email: 'stranger@example.com', nome: 'S', role: 'admin', organizationId: 'org_a', ativo: true }));
  });
  it('usuário não altera o próprio papel, tenant ou aluno vinculado', async () => {
    await assertFails(updateDoc(doc(as(env, 'famA'), 'usuarios/famA'), { role: 'admin' }));
    await assertFails(updateDoc(doc(as(env, 'famA'), 'usuarios/famA'), { alunoId: 'alunoA2' }));
    await assertFails(updateDoc(doc(as(env, 'profB'), 'usuarios/profB'), { organizationId: 'org_a' }));
    await assertFails(updateDoc(doc(as(env, 'inactiveA'), 'usuarios/inactiveA'), { ativo: true }));
    await assertSucceeds(updateDoc(doc(as(env, 'famA'), 'usuarios/famA'), { nome: 'Novo nome' }));
  });
  it('admin do tenant só ativa/desativa família, não promove', async () => {
    const db = as(env, 'profA');
    await assertSucceeds(updateDoc(doc(db, 'usuarios/famA'), { ativo: false }));
    await assertFails(updateDoc(doc(db, 'usuarios/famA'), { role: 'admin' }));
    await assertFails(updateDoc(doc(db, 'usuarios/colabA'), { ativo: false }));
    await assertFails(updateDoc(doc(as(env, 'profB'), 'usuarios/famA'), { ativo: false }));
  });
  it('admin do tenant não altera campos de cobrança da própria organização', async () => {
    const db = as(env, 'profB');
    await assertFails(updateDoc(doc(db, 'organizations/org_b'), { billingExempt: true }));
    await assertFails(updateDoc(doc(db, 'organizations/org_b'), { 'entitlement.status': 'active' }));
    await assertFails(updateDoc(doc(db, 'organizations/org_b'), { createdAt: daysFromNow(10) }));
    await assertSucceeds(updateDoc(doc(db, 'organizations/org_b'), { nome: 'Novo nome', settings: { timezone: 'America/Manaus' } }));
  });
  it('documentos da plataforma não são graváveis pelo cliente', async () => {
    for (const name of ['profA', 'platform']) {
      const db = as(env, name);
      await assertFails(setDoc(doc(db, 'billingEvents/x'), { a: 1 }));
      await assertFails(setDoc(doc(db, 'platformConfig/public'), { selfSignupOpen: true }));
      await assertFails(setDoc(doc(db, `platformAdmins/${name}`), { since: 1 }));
      await assertFails(getDoc(doc(db, 'sistema/configuracao')));
    }
  });
});

describe('Portal da família (responsável do aluno A1)', () => {
  it('lê o próprio aluno e as consultas do portal V4', async () => {
    const db = as(env, 'famA');
    await assertSucceeds(getDoc(doc(db, 'alunos/alunoA1')));
    for (const col of ['aulas', 'pacotes', 'solicitacoes', 'materiais']) {
      await assertSucceeds(getDocs(query(collection(db, col), where('alunoId', '==', 'alunoA1'), where('organizationId', '==', 'org_a'))));
    }
  });
  it('não lê outro aluno do mesmo professor', async () => {
    const db = as(env, 'famA');
    await assertFails(getDoc(doc(db, 'alunos/alunoA2')));
    await assertFails(getDoc(doc(db, 'aulas/aulaA2')));
    await assertFails(getDoc(doc(db, 'materiais/matA2')));
    await assertFails(getDocs(query(collection(db, 'aulas'), where('alunoId', '==', 'alunoA2'), where('organizationId', '==', 'org_a'))));
    await assertFails(getDocs(byOrg(db, 'aulas', 'org_a')));
  });
  it('não vê financeiro do professor, CRM nem convites', async () => {
    const db = as(env, 'famA');
    await assertFails(getDocs(byOrg(db, 'despesas', 'org_a')));
    await assertFails(getDocs(byOrg(db, 'leads', 'org_a')));
    await assertFails(getDoc(doc(db, 'convites/novo.resp@example.com')));
  });
  it('não altera aulas, pacotes nem créditos', async () => {
    const db = as(env, 'famA');
    await assertFails(updateDoc(doc(db, 'aulas/aulaA1'), { status: 'pago' }));
    await assertFails(updateDoc(doc(db, 'pacotes/pacA1'), { creditosUsados: 0 }));
  });
  it('abre solicitação só para o próprio aluno e só como pendente', async () => {
    const db = as(env, 'famA');
    const base = { organizationId: 'org_a', alunoId: 'alunoA1', alunoNome: 'Aluno A1', aulaId: 'aulaA1', tipo: 'remarcar', mensagem: 'Podemos mudar?', status: 'pendente', criadoPorUid: 'famA', createdAt: '2026-11-09T10:00:00' };
    await assertSucceeds(addDoc(collection(db, 'solicitacoes'), base));
    await assertFails(addDoc(collection(db, 'solicitacoes'), { ...base, alunoId: 'alunoA2', aulaId: '' }));
    await assertFails(addDoc(collection(db, 'solicitacoes'), { ...base, aulaId: 'aulaA2' }));
    await assertFails(addDoc(collection(db, 'solicitacoes'), { ...base, status: 'aprovada' }));
    await assertFails(addDoc(collection(db, 'solicitacoes'), { ...base, criadoPorUid: 'profA' }));
    await assertFails(updateDoc(doc(db, 'solicitacoes/solA1'), { status: 'aprovada' }));
  });
});

describe('Ativação do portal por convite', () => {
  const profile = (email, extra = {}) => ({ email, nome: 'Resp', role: 'responsavel', alunoId: 'alunoA1', organizationId: 'org_a', ativo: true, createdAt: 'x', updatedAt: 'x', ...extra });
  it('e-mail convidado e verificado ativa o perfil (fluxo transacional do cliente)', async () => {
    const db = env.authenticatedContext('newResp', { email: 'novo.resp@example.com', email_verified: true }).firestore();
    await assertSucceeds(runTransaction(db, async (tx) => {
      const inv = await tx.get(doc(db, 'convites/novo.resp@example.com'));
      if (!inv.exists()) throw new Error('sem convite');
      tx.set(doc(db, 'usuarios/newResp'), profile('novo.resp@example.com'));
    }));
  });
  it('e-mail não verificado não ativa (impede sequestro do convite)', async () => {
    const db = env.authenticatedContext('newResp', { email: 'novo.resp@example.com', email_verified: false }).firestore();
    await assertFails(getDoc(doc(db, 'convites/novo.resp@example.com')));
    await assertFails(setDoc(doc(db, 'usuarios/newResp'), profile('novo.resp@example.com')));
  });
  it('perfil diferente do convite é recusado', async () => {
    const db = env.authenticatedContext('newResp', { email: 'novo.resp@example.com', email_verified: true }).firestore();
    await assertFails(setDoc(doc(db, 'usuarios/newResp'), profile('novo.resp@example.com', { alunoId: 'alunoA2' })));
    await assertFails(setDoc(doc(db, 'usuarios/newResp'), profile('novo.resp@example.com', { role: 'admin' })));
    await assertFails(setDoc(doc(db, 'usuarios/newResp'), profile('novo.resp@example.com', { organizationId: 'org_b' })));
  });
  it('convite inativo ou de outro e-mail não ativa', async () => {
    const off = env.authenticatedContext('u1', { email: 'inativo@example.com', email_verified: true }).firestore();
    await assertFails(setDoc(doc(off, 'usuarios/u1'), profile('inativo@example.com')));
    const other = env.authenticatedContext('u2', { email: 'outro@example.com', email_verified: true }).firestore();
    await assertFails(getDoc(doc(other, 'convites/novo.resp@example.com')));
    await assertFails(setDoc(doc(other, 'usuarios/u2'), profile('novo.resp@example.com')));
  });
  it('professor convida apenas para aluno do próprio tenant', async () => {
    const db = as(env, 'profA');
    const inv = { email: 'mae@example.com', alunoId: 'alunoA1', alunoNome: 'Aluno A1', role: 'responsavel', organizationId: 'org_a', ativo: true, createdBy: 'profA' };
    await assertSucceeds(setDoc(doc(db, 'convites/mae@example.com'), inv));
    await assertFails(setDoc(doc(db, 'convites/pai@example.com'), { ...inv, email: 'pai@example.com', alunoId: 'alunoB1' }));
    await assertFails(setDoc(doc(db, 'convites/tio@example.com'), { ...inv, email: 'tio@example.com', role: 'admin' }));
    await assertFails(setDoc(doc(db, 'convites/outro@example.com'), inv));
  });
  it('outro tenant não sobrescreve convite existente', async () => {
    const db = as(env, 'profB');
    await assertFails(setDoc(doc(db, 'convites/novo.resp@example.com'), { email: 'novo.resp@example.com', alunoId: 'alunoB1', role: 'responsavel', organizationId: 'org_b', ativo: true }));
    await assertFails(deleteDoc(doc(db, 'convites/novo.resp@example.com')));
  });
});

describe('Cadastro self-service de professor (SaaS)', () => {
  const signup = (db, u, orgId = `org_${u}`, orgExtra = {}, profExtra = {}) => {
    const b = writeBatch(db);
    b.set(doc(db, `organizations/${orgId}`), { nome: 'Minha escola', ownerUid: u, createdAt: serverTimestamp(), ...orgExtra });
    b.set(doc(db, `usuarios/${u}`), { email: `${u}@example.com`, nome: 'Novo', role: 'admin', organizationId: orgId, ativo: true, createdAt: 'x', updatedAt: 'x', ...profExtra });
    return b.commit();
  };
  const open = (flag) => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'platformConfig/public'), { selfSignupOpen: flag }));
  const ctx = (u, verified = true) => env.authenticatedContext(u, { email: `${u}@example.com`, email_verified: verified }).firestore();

  it('bloqueado enquanto a plataforma não abre o cadastro (feature flag no servidor)', async () => {
    await assertFails(signup(ctx('t1'), 't1'));
    await open(false);
    await assertFails(signup(ctx('t1'), 't1'));
  });
  it('com cadastro aberto, cria a própria organização em teste e opera nela', async () => {
    await open(true);
    const db = ctx('t1');
    await assertSucceeds(signup(db, 't1'));
    await assertSucceeds(addDoc(collection(db, 'alunos'), { organizationId: 'org_t1', nome: 'Primeiro aluno' }));
    await assertFails(getDocs(byOrg(db, 'alunos', 'org_a')));
  });
  it('não escolhe o ID da organização, não se isenta de cobrança e não forja datas', async () => {
    await open(true);
    await assertFails(signup(ctx('t1'), 't1', 'org_a'));
    await assertFails(signup(ctx('t1'), 't1', 'org_livre'));
    await assertFails(signup(ctx('t1'), 't1', 'org_t1', { billingExempt: true }));
    await assertFails(signup(ctx('t1'), 't1', 'org_t1', { entitlement: { status: 'active', accessUntil: daysFromNow(999) } }));
    await assertFails(signup(ctx('t1'), 't1', 'org_t1', { createdAt: daysFromNow(365) }));
    await assertFails(signup(ctx('t1'), 't1', 'org_t1', {}, { role: 'responsavel' }));
  });
  it('exige e-mail verificado e não cria segunda organização', async () => {
    await open(true);
    await assertFails(signup(ctx('t2', false), 't2'));
    const db = as(env, 'profB');
    await assertFails(setDoc(doc(db, 'organizations/org_profB'), { nome: 'Outra', ownerUid: 'profB', createdAt: serverTimestamp() }));
  });
});

describe('Direito de uso (assinatura) aplicado no servidor', () => {
  it('teste de 14 dias vigente permite gravar', async () => {
    await assertSucceeds(addDoc(collection(as(env, 'profB'), 'alunos'), { organizationId: 'org_b', nome: 'X' }));
  });
  it('assinatura ativa confirmada pelo backend permite gravar', async () => {
    await assertSucceeds(addDoc(collection(as(env, 'paidT'), 'alunos'), { organizationId: 'org_paid', nome: 'X' }));
  });
  it('teste vencido sem assinatura: somente leitura, exportação e exclusão', async () => {
    const db = as(env, 'expiredT');
    await assertFails(addDoc(collection(db, 'alunos'), { organizationId: 'org_expired', nome: 'X' }));
    await assertFails(updateDoc(doc(db, 'alunos/alunoExp'), { nome: 'Y' }));
    await assertSucceeds(getDocs(byOrg(db, 'alunos', 'org_expired')));
    await assertSucceeds(deleteDoc(doc(db, 'alunos/alunoExp')));
  });
  it('assinatura cancelada após o fim do período bloqueia gravação', async () => {
    await env.withSecurityRulesDisabled((c) => updateDoc(doc(c.firestore(), 'organizations/org_paid'), { entitlement: { plan: 'profissional', status: 'canceled', accessUntil: daysFromNow(-1) } }));
    await assertFails(addDoc(collection(as(env, 'paidT'), 'alunos'), { organizationId: 'org_paid', nome: 'X' }));
  });
  it('organização isenta (conta original do proprietário) grava sem assinatura', async () => {
    await assertSucceeds(addDoc(collection(as(env, 'profA'), 'aulas'), { organizationId: 'org_a', alunoId: 'alunoA1', valor: 120 }));
  });
});

describe('Administração da plataforma separada do conteúdo dos clientes', () => {
  it('admin da plataforma vê organizações e eventos de cobrança', async () => {
    const db = as(env, 'platform');
    await assertSucceeds(getDocs(collection(db, 'organizations')));
    await assertSucceeds(getDoc(doc(db, 'billingEvents/mp_1')));
  });
  it('admin da plataforma não lê alunos, aulas nem financeiro dos tenants', async () => {
    const db = as(env, 'platform');
    await assertFails(getDoc(doc(db, 'alunos/alunoB1')));
    await assertFails(getDocs(byOrg(db, 'aulas', 'org_b')));
    await assertFails(getDocs(byOrg(db, 'despesas', 'org_a')));
  });
  it('professor comum não vê organizações alheias nem eventos de cobrança', async () => {
    const db = as(env, 'profA');
    await assertSucceeds(getDoc(doc(db, 'organizations/org_a')));
    await assertFails(getDoc(doc(db, 'organizations/org_b')));
    await assertFails(getDocs(collection(db, 'organizations')));
    await assertFails(getDoc(doc(db, 'billingEvents/mp_1')));
  });
});

describe('Pacotes e créditos', () => {
  it('consumo transacional respeita limites', async () => {
    const db = as(env, 'profA');
    await assertSucceeds(updateDoc(doc(db, 'pacotes/pacA1'), { creditosUsados: increment(1) }));
    await assertFails(updateDoc(doc(db, 'pacotes/pacA1'), { creditosUsados: 11 }));
    await assertFails(updateDoc(doc(db, 'pacotes/pacA1'), { creditosUsados: -1 }));
    await assertFails(addDoc(collection(db, 'pacotes'), { organizationId: 'org_a', alunoId: 'alunoA1', creditosTotal: 0, creditosUsados: 0 }));
  });
});

describe('Trilha de auditoria', () => {
  it('histórico: o admin consulta a do próprio tenant; colaborador e outro tenant não', async () => {
    const q = (db, org) => getDocs(query(collection(db, 'auditLogs'), where('organizationId', '==', org), orderBy('at', 'desc'), limit(30)));
    await assertSucceeds(q(as(env, 'profA'), 'org_a'));
    await assertFails(q(as(env, 'colabA'), 'org_a'));
    await assertFails(q(as(env, 'profB'), 'org_a'));
    await assertFails(q(as(env, 'famA'), 'org_a'));
  });
  it('somente inserção, com autor e horário do servidor', async () => {
    const db = as(env, 'profA');
    const ref = doc(collection(db, 'auditLogs'));
    await assertSucceeds(setDoc(ref, { organizationId: 'org_a', actorUid: 'profA', at: serverTimestamp(), action: 'aula.update' }));
    await assertFails(setDoc(doc(collection(db, 'auditLogs')), { organizationId: 'org_a', actorUid: 'profB', at: serverTimestamp(), action: 'x' }));
    await assertFails(updateDoc(ref, { action: 'apagado' }));
    await assertFails(deleteDoc(ref));
    await assertFails(getDoc(doc(as(env, 'profB'), ref.path)));
  });
});
