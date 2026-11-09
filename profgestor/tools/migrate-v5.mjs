#!/usr/bin/env node
// Migração V4 → V5 (fundação multitenant), com inventário, backup verificável,
// dry-run por padrão, verificação de integridade e rollback exato.
//
// O que a migração faz (somente adiciona campos/documentos; nada é apagado):
//   1. cria organizations/org_jair (conta original) com billingExempt: true;
//   2. preenche organizationId = org_jair nos perfis V4 que não têm o campo;
//   3. opcional (--adopt-orphans): atribui org_jair a registros sem organizationId,
//      que eram invisíveis no V4 (as consultas filtram por organizationId);
//   4. registra platformMigrations/v5-org com contagens e o hash do plano aplicado.
//
// Uso (emulador por padrão; produção exige flags explícitas — ver docs/MIGRACAO.md):
//   node tools/migrate-v5.mjs inventory
//   node tools/migrate-v5.mjs backup  --out backups/2026-11-10
//   node tools/migrate-v5.mjs plan    --backup backups/2026-11-10
//   node tools/migrate-v5.mjs apply   --backup backups/2026-11-10
//   node tools/migrate-v5.mjs verify  --backup backups/2026-11-10
//   node tools/migrate-v5.mjs rollback --backup backups/2026-11-10 [--apply]
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { exportAll, writeBackup, readBackup, commitInChunks, digest } from './lib/firestore-io.mjs';

export const LEGACY_ORG = 'org_jair';
export const TENANT_COLLECTIONS = ['alunos', 'aulas', 'despesas', 'pacotes', 'leads', 'solicitacoes', 'materiais', 'convites'];
const MIGRATION_DOC = 'platformMigrations/v5-org';
const hasOrg = (d) => typeof d.organizationId === 'string' && d.organizationId !== '';

async function docsOf(db, col) {
  const snap = await db.collection(col).get();
  return snap.docs.map((d) => ({ id: d.id, path: d.ref.path, data: d.data() }));
}

// ---------------- inventário (somente leitura) ----------------
export async function inventory(db) {
  const report = { collections: {}, usuarios: {}, integrity: {} };
  const data = {};
  for (const col of [...TENANT_COLLECTIONS, 'usuarios']) data[col] = await docsOf(db, col);
  for (const col of TENANT_COLLECTIONS) {
    const docs = data[col];
    const byOrg = {};
    for (const d of docs) { const k = hasOrg(d.data) ? d.data.organizationId : '(sem organizationId)'; byOrg[k] = (byOrg[k] || 0) + 1; }
    report.collections[col] = { total: docs.length, byOrg };
  }
  const users = data.usuarios;
  report.usuarios = {
    total: users.length,
    byRole: users.reduce((m, u) => ({ ...m, [u.data.role || '(sem papel)']: (m[u.data.role || '(sem papel)'] || 0) + 1 }), {}),
    semOrganizationId: users.filter((u) => !hasOrg(u.data)).map((u) => u.id),
    inativos: users.filter((u) => u.data.ativo !== true).length,
  };
  const alunoIds = new Set(data.alunos.map((a) => a.id));
  const aulas = data.aulas;
  const dupKey = (a) => `${a.data.organizationId}|${a.data.alunoId}|${a.data.start}`;
  const seen = new Map();
  for (const a of aulas.filter((x) => (x.data.statusAula || 'agendada') !== 'cancelada' && x.data.start)) {
    const k = dupKey(a); seen.set(k, [...(seen.get(k) || []), a.id]);
  }
  const consumoPorPacote = {};
  for (const a of aulas) if (a.data.creditoConsumidoPacoteId) consumoPorPacote[a.data.creditoConsumidoPacoteId] = (consumoPorPacote[a.data.creditoConsumidoPacoteId] || 0) + 1;
  report.integrity = {
    aulasSemAlunoExistente: aulas.filter((a) => a.data.alunoId && !alunoIds.has(a.data.alunoId)).map((a) => a.id),
    pacotesSemAlunoExistente: data.pacotes.filter((p) => p.data.alunoId && !alunoIds.has(p.data.alunoId)).map((p) => p.id),
    perfisFamiliaSemAluno: users.filter((u) => ['aluno', 'responsavel'].includes(u.data.role) && !alunoIds.has(u.data.alunoId)).map((u) => u.id),
    aulasPossivelmenteDuplicadas: [...seen.values()].filter((ids) => ids.length > 1),
    aulasComValorNaoNumerico: aulas.filter((a) => a.data.valor != null && typeof a.data.valor !== 'number').map((a) => a.id),
    pacotesComSaldoInvalido: data.pacotes.filter((p) => Number(p.data.creditosUsados || 0) < 0 || Number(p.data.creditosUsados || 0) > Number(p.data.creditosTotal || 0)).map((p) => p.id),
    pacotesComConsumoDivergente: data.pacotes
      .filter((p) => (consumoPorPacote[p.id] || 0) !== Number(p.data.creditosUsados || 0))
      .map((p) => ({ id: p.id, creditosUsados: Number(p.data.creditosUsados || 0), aulasVinculadas: consumoPorPacote[p.id] || 0 })),
  };
  const cfg = await db.doc('sistema/configuracao').get();
  report.legacy = { adminUid: cfg.exists ? cfg.data().adminUid || null : null, orgExists: (await db.doc(`organizations/${LEGACY_ORG}`).get()).exists };
  return report;
}

// ---------------- plano (somente leitura) ----------------
export async function plan(db, { adoptOrphans = false, orgName = 'Conta original do proprietário', ownerUid = null } = {}) {
  const ops = [];
  const notes = [];
  const users = await docsOf(db, 'usuarios');
  const cfg = await db.doc('sistema/configuracao').get();
  const admins = users.filter((u) => u.data.role === 'admin' && (!hasOrg(u.data) || u.data.organizationId === LEGACY_ORG));
  const owner = ownerUid || (cfg.exists && cfg.data().adminUid) || (admins.length === 1 ? admins[0].id : null);
  if (!owner) throw new Error(`Não foi possível determinar o proprietário (admins candidatos: ${admins.map((a) => a.id).join(', ') || 'nenhum'}). Informe --owner-uid.`);

  const orgRef = db.doc(`organizations/${LEGACY_ORG}`);
  const org = await orgRef.get();
  if (!org.exists) {
    ops.push({ type: 'create', path: orgRef.path, data: { nome: orgName, ownerUid: owner, createdAt: '__now__', billingExempt: true, migratedFrom: 'v4', migratedAt: '__now__' } });
  } else if (org.data().billingExempt !== true) {
    notes.push(`${orgRef.path} já existe sem billingExempt; não será alterada automaticamente. A conta original ficará sujeita a cobrança até ajuste manual.`);
  }
  for (const u of users) {
    if (!hasOrg(u.data)) ops.push({ type: 'addOrg', path: u.path });
  }
  for (const col of TENANT_COLLECTIONS) {
    const orphans = (await docsOf(db, col)).filter((d) => !hasOrg(d.data));
    if (!orphans.length) continue;
    if (adoptOrphans) orphans.forEach((d) => ops.push({ type: 'addOrg', path: d.path }));
    else notes.push(`${orphans.length} documento(s) em ${col} sem organizationId (invisíveis no V4). Não alterados; use --adopt-orphans após revisão.`);
  }
  const body = { version: 'v5-org/1', legacyOrg: LEGACY_ORG, ownerUid: owner, adoptOrphans, ops, notes };
  return { ...body, sha256: createHash('sha256').update(JSON.stringify(body)).digest('hex') };
}

// ---------------- aplicação ----------------
export async function apply(db, p, { backupManifest }) {
  if (!backupManifest?.sha256) throw new Error('Aplicação exige um backup verificado.');
  if (!p.ops.length) return { applied: 0 };
  const now = Timestamp.now();
  const writes = [];
  for (const op of p.ops) {
    if (op.type === 'create') {
      const data = Object.fromEntries(Object.entries(op.data).map(([k, v]) => [k, v === '__now__' ? now : v]));
      const exists = (await db.doc(op.path).get()).exists;
      if (!exists) writes.push({ type: 'set', path: op.path, data });
    } else if (op.type === 'addOrg') {
      const cur = await db.doc(op.path).get();
      if (cur.exists && !hasOrg(cur.data())) writes.push({ type: 'update', path: op.path, data: { organizationId: p.legacyOrg } });
    }
  }
  writes.push({ type: 'set', path: MIGRATION_DOC, data: {
    appliedAt: now, planSha256: p.sha256, backupSha256: backupManifest.sha256,
    ops: p.ops.length, writes: writes.length, adoptOrphans: p.adoptOrphans, ownerUid: p.ownerUid,
  } });
  await commitInChunks(db, writes);
  return { applied: writes.length - 1 };
}

// ---------------- verificação ----------------
export async function verify(db, { backupManifest, backupRecords = [], plan: p }) {
  const problems = [];
  const org = await db.doc(`organizations/${LEGACY_ORG}`).get();
  if (!org.exists) problems.push('organizations/org_jair não existe.');
  else if (org.data().billingExempt !== true) problems.push('organizations/org_jair sem billingExempt: a conta original seria bloqueada pelas regras.');
  const users = await docsOf(db, 'usuarios');
  const semOrg = users.filter((u) => !hasOrg(u.data));
  if (semOrg.length) problems.push(`${semOrg.length} perfil(is) ainda sem organizationId: ${semOrg.map((u) => u.id).join(', ')}`);
  // Nenhum documento do backup pode ter desaparecido.
  const current = await exportAll(db);
  const currentPaths = new Set(current.map((r) => r.path));
  const lost = backupRecords.filter((r) => !currentPaths.has(r.path)).map((r) => r.path);
  if (lost.length) problems.push(`${lost.length} documento(s) do backup não existem mais: ${lost.slice(0, 20).join(', ')}`);
  for (const [col, n] of Object.entries(backupManifest.counts || {})) {
    const now = current.filter((r) => r.path.split('/')[0] === col && r.path.split('/').length === 2).length;
    if (!col.includes('*') && now < n) problems.push(`Contagem de ${col} caiu de ${n} para ${now}.`);
  }
  const mig = await db.doc(MIGRATION_DOC).get();
  if (!mig.exists) problems.push(`${MIGRATION_DOC} ausente.`);
  else if (p && mig.data().planSha256 !== p.sha256) problems.push('Plano aplicado difere do plano informado.');
  return { ok: problems.length === 0, problems };
}

// ---------------- rollback ----------------
// "migration" (padrão): desfaz exatamente o que o plano adicionou, preservando gravações
// posteriores. "full": volta ao backup inteiro (descarta tudo que veio depois).
export async function rollback(db, { backupDir, mode = 'migration', apply: doApply = false }) {
  const { records } = await readBackup(backupDir);
  const before = new Map(records.map((r) => [r.path, r]));
  const writes = [];
  if (mode === 'migration') {
    const p = JSON.parse(await readFile(join(backupDir, 'migration-plan.json'), 'utf8'));
    for (const op of p.ops) {
      const cur = await db.doc(op.path).get();
      if (op.type === 'create' && cur.exists && !before.has(op.path)) writes.push({ type: 'delete', path: op.path });
      if (op.type === 'addOrg' && cur.exists && cur.data().organizationId === p.legacyOrg && !hasOrg(before.get(op.path)?.data || {})) {
        writes.push({ type: 'update', path: op.path, data: { organizationId: FieldValue.delete() } });
      }
    }
    if ((await db.doc(MIGRATION_DOC).get()).exists && !before.has(MIGRATION_DOC)) writes.push({ type: 'delete', path: MIGRATION_DOC });
  } else if (mode === 'full') {
    const { decode } = await import('./lib/firestore-io.mjs');
    const current = await exportAll(db);
    for (const r of current) if (!before.has(r.path)) writes.push({ type: 'delete', path: r.path });
    for (const r of records) writes.push({ type: 'set', path: r.path, data: decode(r.data, db) });
  } else throw new Error(`Modo de rollback desconhecido: ${mode}`);
  if (doApply) await commitInChunks(db, writes);
  return { mode, applied: doApply, writes: writes.map((w) => ({ type: w.type, path: w.path })) };
}

// ---------------- CLI ----------------
function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; out[k] = v; }
    else out._.push(a);
  }
  return out;
}

async function main() {
  const a = args(process.argv.slice(2));
  const cmd = a._[0];
  const emulator = !!process.env.FIRESTORE_EMULATOR_HOST;
  if (!emulator) {
    if (!a.production || !a.project) {
      console.error('Sem FIRESTORE_EMULATOR_HOST. Para produção use --production --project <id> (ver docs/MIGRACAO.md).');
      process.exit(2);
    }
    if (['apply', 'rollback'].includes(cmd) && (a.apply || cmd === 'apply') && a['i-have-verified-the-backup'] !== true) {
      console.error('Escrita em produção exige --i-have-verified-the-backup após restaurar o backup em homologação.');
      process.exit(2);
    }
  }
  initializeApp({ projectId: a.project || process.env.GCLOUD_PROJECT || 'demo-profgestor' });
  const db = getFirestore();
  const projectId = a.project || process.env.GCLOUD_PROJECT || 'demo-profgestor';
  const print = (o) => console.log(JSON.stringify(o, null, 2));

  if (cmd === 'inventory') return print(await inventory(db));
  if (cmd === 'backup') {
    if (!a.out) throw new Error('--out <dir> obrigatório');
    const records = await exportAll(db);
    return print(await writeBackup(a.out, records, { projectId, emulator }));
  }
  if (!a.backup) throw new Error('--backup <dir> obrigatório');
  const { manifest, records } = await readBackup(a.backup);
  if (manifest.projectId !== projectId) throw new Error(`Backup é do projeto ${manifest.projectId}, alvo é ${projectId}.`);
  const opts = { adoptOrphans: !!a['adopt-orphans'], ownerUid: a['owner-uid'] || null, orgName: a['org-name'] || undefined };

  if (cmd === 'plan') {
    const p = await plan(db, opts);
    await writeFile(join(a.backup, 'migration-plan.json'), JSON.stringify(p, null, 2));
    return print(p);
  }
  if (cmd === 'apply') {
    const ageMin = (Date.now() - Date.parse(manifest.createdAt)) / 60000;
    if (!emulator && ageMin > 60) throw new Error(`Backup tem ${Math.round(ageMin)} min; refaça o backup (máx. 60 min) antes de aplicar em produção.`);
    const saved = JSON.parse(await readFile(join(a.backup, 'migration-plan.json'), 'utf8'));
    const fresh = await plan(db, { adoptOrphans: saved.adoptOrphans, ownerUid: saved.ownerUid });
    if (fresh.sha256 !== saved.sha256) throw new Error('Os dados mudaram desde o plano revisado. Gere e revise o plano novamente.');
    return print(await apply(db, saved, { backupManifest: manifest }));
  }
  if (cmd === 'verify') {
    const p = JSON.parse(await readFile(join(a.backup, 'migration-plan.json'), 'utf8'));
    const r = await verify(db, { backupManifest: manifest, backupRecords: records, plan: p });
    print(r); if (!r.ok) process.exit(1); return;
  }
  if (cmd === 'rollback') return print(await rollback(db, { backupDir: a.backup, mode: a.mode || 'migration', apply: !!a.apply }));
  throw new Error(`Comando desconhecido: ${cmd}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
export { digest };
