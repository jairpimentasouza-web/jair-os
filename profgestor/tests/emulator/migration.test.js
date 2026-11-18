// Migração V4 → V5 com dados no formato V4: inventário, backup, dry-run, aplicação,
// verificação, idempotência e rollback (parcial e total). Somente no emulador.
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { inventory, plan, apply, verify, rollback } from '../../tools/migrate-v5.mjs';
import { exportAll, writeBackup, readBackup, digest } from '../../tools/lib/firestore-io.mjs';
import { createEnv } from './helpers.js';

let env, db;
before(async () => {
  env = await createEnv();
  if (!getApps().length) initializeApp({ projectId: 'demo-profgestor' });
  db = getFirestore();
});
after(async () => { await env?.cleanup(); });

async function seedV4() {
  await env.clearFirestore();
  const set = (p, d) => db.doc(p).set(d);
  await Promise.all([
    set('sistema/configuracao', { adminUid: 'owner', initializedAt: '2025-02-01T10:00:00' }),
    set('usuarios/owner', { email: 'owner@example.com', nome: 'Proprietário', role: 'admin', ativo: true }),
    set('usuarios/resp1', { email: 'resp1@example.com', nome: 'Resp', role: 'responsavel', alunoId: 'a1', organizationId: 'org_jair', ativo: true }),
    set('alunos/a1', { organizationId: 'org_jair', nome: 'Aluno 1', tel: '21999990001', materia: 'Física', criadoEmTs: Timestamp.fromDate(new Date('2025-03-01T12:00:00Z')), tags: ['enem', { nivel: 2 }] }),
    set('alunos/a2', { organizationId: 'org_jair', nome: 'Aluno 2', materia: 'Matemática' }),
    set('aulas/l1', { organizationId: 'org_jair', alunoId: 'a1', start: '2026-11-03T14:00:00', end: '2026-11-03T15:00:00', valor: 120, status: 'pago', statusAula: 'realizada', presenca: 'presente', creditoConsumidoPacoteId: 'p1' }),
    set('aulas/l4', { organizationId: 'org_jair', alunoId: 'a1', start: '2026-11-03T14:00:00', end: '2026-11-03T15:00:00', valor: 120, status: 'pendente' }),
    set('aulas/l2', { organizationId: 'org_jair', alunoId: 'a2', start: '2026-11-04T10:00:00', valor: '80,00', status: 'pendente' }),
    set('aulas/l3', { alunoId: 'a2', start: '2026-11-05T10:00:00', valor: 90, status: 'pendente', origem: 'agente externo' }),
    set('aulas/l5', { organizationId: 'org_jair', alunoId: 'fantasma', start: '2026-11-06T10:00:00', valor: 90 }),
    set('pacotes/p1', { organizationId: 'org_jair', alunoId: 'a1', nome: '4 aulas', creditosTotal: 4, creditosUsados: 2, status: 'ativo' }),
    set('despesas/d1', { organizationId: 'org_jair', descricao: 'Livro', valor: 80, data: '2026-11-02' }),
    set('convites/resp1@example.com', { email: 'resp1@example.com', organizationId: 'org_jair', alunoId: 'a1', role: 'responsavel', ativo: true }),
    set('alunos/a1/anotacoes/n1', { texto: 'subcoleção também entra no backup' }),
  ]);
}

const ownerDb = () => env.authenticatedContext('owner', { email: 'owner@example.com', email_verified: true }).firestore();
let dir;
beforeEach(async () => {
  await seedV4();
  dir = await mkdtemp(join(tmpdir(), 'pg-backup-'));
});

async function backupAndPlan(opts = {}) {
  const manifest = await writeBackup(dir, await exportAll(db), { projectId: 'demo-profgestor', emulator: true });
  const p = await plan(db, opts);
  await writeFile(join(dir, 'migration-plan.json'), JSON.stringify(p));
  return { manifest, p };
}

describe('Migração V4 → V5', () => {
  it('inventário aponta perfis sem tenant, órfãos, duplicidades e inconsistências', async () => {
    const r = await inventory(db);
    assert.deepEqual(r.usuarios.semOrganizationId, ['owner']);
    assert.equal(r.collections.aulas.byOrg['(sem organizationId)'], 1);
    assert.deepEqual(r.integrity.aulasPossivelmenteDuplicadas, [['l1', 'l4']]);
    assert.deepEqual(r.integrity.aulasComValorNaoNumerico, ['l2']);
    assert.deepEqual(r.integrity.aulasSemAlunoExistente, ['l5']);
    assert.deepEqual(r.integrity.pacotesComConsumoDivergente, [{ id: 'p1', creditosUsados: 2, aulasVinculadas: 1 }]);
    assert.equal(r.legacy.adminUid, 'owner');
    assert.equal(r.legacy.orgExists, false);
  });

  it('sem migração, as regras V5 bloqueiam a conta original (por isso a ordem: migrar → publicar regras)', async () => {
    await assertFails(getDocs(query(collection(ownerDb(), 'alunos'), where('organizationId', '==', 'org_jair'))));
  });

  it('backup é verificável e detecta adulteração', async () => {
    const { manifest } = await backupAndPlan();
    assert.equal(manifest.counts.aulas, 5);
    assert.equal(manifest.counts['alunos/*/anotacoes'], 1);
    const { records } = await readBackup(dir);
    assert.equal(records.length, manifest.documents);
    const raw = await readFile(join(dir, 'documents.ndjson'), 'utf8');
    await writeFile(join(dir, 'documents.ndjson'), raw.replace('Aluno 1', 'Aluno X'));
    await assert.rejects(readBackup(dir), /corrompido/);
  });

  it('plano é dry-run: descreve as mudanças sem gravar nada', async () => {
    const before = digest(await exportAll(db));
    const { p } = await backupAndPlan();
    assert.deepEqual(p.ops.map((o) => [o.type, o.path]), [['create', 'organizations/org_jair'], ['addOrg', 'usuarios/owner']]);
    assert.match(p.notes.join(' '), /1 documento\(s\) em aulas sem organizationId/);
    assert.equal(digest(await exportAll(db)), before);
  });

  it('aplicação preserva todo o histórico, isenta a conta original e libera o proprietário', async () => {
    const { manifest, p } = await backupAndPlan();
    const { records } = await readBackup(dir);
    await apply(db, p, { backupManifest: manifest });
    const org = (await db.doc('organizations/org_jair').get()).data();
    assert.equal(org.billingExempt, true);
    assert.equal(org.ownerUid, 'owner');
    assert.equal((await db.doc('usuarios/owner').get()).data().organizationId, 'org_jair');
    assert.equal((await db.doc('aulas/l3').get()).data().organizationId, undefined, 'órfão não é adotado sem --adopt-orphans');
    const v = await verify(db, { backupManifest: manifest, backupRecords: records, plan: p });
    assert.deepEqual(v, { ok: true, problems: [] });
    // Tipos preservados (timestamp, arrays e mapas aninhados) e nada perdido.
    const a1 = (await db.doc('alunos/a1').get()).data();
    assert.ok(a1.criadoEmTs instanceof Timestamp);
    assert.deepEqual(a1.tags, ['enem', { nivel: 2 }]);
    // O proprietário volta a operar sob as regras V5.
    const odb = ownerDb();
    await assertSucceeds(getDocs(query(collection(odb, 'alunos'), where('organizationId', '==', 'org_jair'))));
    await assertSucceeds(addDoc(collection(odb, 'aulas'), { organizationId: 'org_jair', alunoId: 'a1', valor: 100 }));
    const fam = env.authenticatedContext('resp1', { email: 'resp1@example.com', email_verified: true }).firestore();
    await assertSucceeds(getDocs(query(collection(fam, 'aulas'), where('alunoId', '==', 'a1'), where('organizationId', '==', 'org_jair'))));
  });

  it('é idempotente: reaplicar não muda nada', async () => {
    const { manifest, p } = await backupAndPlan();
    await apply(db, p, { backupManifest: manifest });
    const again = await plan(db);
    assert.deepEqual(again.ops, []);
    assert.deepEqual(await apply(db, again, { backupManifest: manifest }), { applied: 0 });
  });

  it('--adopt-orphans atribui o tenant aos registros invisíveis no V4', async () => {
    const { manifest, p } = await backupAndPlan({ adoptOrphans: true });
    assert.ok(p.ops.some((o) => o.path === 'aulas/l3'));
    await apply(db, p, { backupManifest: manifest });
    assert.equal((await db.doc('aulas/l3').get()).data().organizationId, 'org_jair');
  });

  it('rollback da migração desfaz só o que ela fez e preserva gravações posteriores', async () => {
    const { manifest, p } = await backupAndPlan();
    await apply(db, p, { backupManifest: manifest });
    await db.doc('aulas/depois').set({ organizationId: 'org_jair', alunoId: 'a1', valor: 100 });
    const dry = await rollback(db, { backupDir: dir });
    assert.equal(dry.applied, false);
    assert.ok((await db.doc('organizations/org_jair').get()).exists, 'dry-run não altera');
    await rollback(db, { backupDir: dir, apply: true });
    const now = await exportAll(db);
    assert.ok(now.some((r) => r.path === 'aulas/depois'));
    const { records } = await readBackup(dir);
    assert.equal(digest(now.filter((r) => r.path !== 'aulas/depois')), digest(records));
  });

  it('organização legada já existente (formato real de produção): acrescenta isenção e dono sem mexer no resto', async () => {
    await db.doc('organizations/org_jair').set({ name: 'Jair Aulas', plan: 'founder', status: 'active', slug: 'jair', createdAt: '2026-09-07T05:00:00' });
    await db.doc('usuarios/owner').update({ organizationId: 'org_jair' });
    const { manifest, p } = await backupAndPlan();
    assert.deepEqual(p.ops, [{ type: 'addFields', path: 'organizations/org_jair', data: { billingExempt: true, ownerUid: 'owner', nome: 'Jair Aulas' } }]);
    await apply(db, p, { backupManifest: manifest });
    const org = (await db.doc('organizations/org_jair').get()).data();
    assert.deepEqual([org.billingExempt, org.ownerUid, org.nome, org.name, org.plan, org.status, org.slug], [true, 'owner', 'Jair Aulas', 'Jair Aulas', 'founder', 'active', 'jair']);
    const { records } = await readBackup(dir);
    assert.deepEqual(await verify(db, { backupManifest: manifest, backupRecords: records, plan: p }), { ok: true, problems: [] });
    await assertSucceeds(addDoc(collection(ownerDb(), 'aulas'), { organizationId: 'org_jair', alunoId: 'a1', valor: 100 }));
    await rollback(db, { backupDir: dir, apply: true });
    const depois = (await db.doc('organizations/org_jair').get()).data();
    assert.deepEqual(Object.keys(depois).sort(), ['createdAt', 'name', 'plan', 'slug', 'status']);
  });

  it('rollback total restaura exatamente o backup', async () => {
    const { manifest, p } = await backupAndPlan();
    await apply(db, p, { backupManifest: manifest });
    await db.doc('aulas/depois').set({ organizationId: 'org_jair', valor: 1 });
    await db.doc('alunos/a1').update({ nome: 'alterado depois' });
    await rollback(db, { backupDir: dir, mode: 'full', apply: true });
    assert.equal(digest(await exportAll(db)), manifest.sha256);
  });
});
