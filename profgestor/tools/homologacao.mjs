#!/usr/bin/env node
// Ferramentas de homologação. NUNCA operam no projeto de produção.
//
//   node tools/homologacao.mjs copiar   --backup DIR --para PROJETO [--apply]
//   node tools/homologacao.mjs conta    --para PROJETO --uid UID --email EMAIL --saida ARQUIVO
//   node tools/homologacao.mjs criar-banco --para PROJETO [--local southamerica-east1]
//   node tools/homologacao.mjs verificar --para PROJETO --credencial ARQUIVO --saida ARQUIVO
//
// Credenciais do Admin SDK: GOOGLE_APPLICATION_CREDENTIALS (ADC).
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readBackup, decode, commitInChunks } from './lib/firestore-io.mjs';

const PRODUCAO = 'gestao-aulas-jair';
const a = {}; const argv = process.argv.slice(2); const cmd = argv[0];
for (let i = 1; i < argv.length; i++) if (argv[i].startsWith('--')) { const k = argv[i].slice(2); a[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; }
if (!a.para) { console.error('--para PROJETO obrigatório'); process.exit(2); }
if (a.para === PRODUCAO) { console.error('Recusado: estas ferramentas não operam em produção.'); process.exit(2); }

async function copiar() {
  const { manifest, records } = await readBackup(a.backup);
  if (manifest.projectId !== PRODUCAO) throw new Error(`Backup é de ${manifest.projectId}, esperado ${PRODUCAO}.`);
  initializeApp({ projectId: a.para });
  const db = getFirestore();
  const resumo = { documentos: records.length, contagens: manifest.counts, sha256: manifest.sha256, aplicado: !!a.apply };
  if (a.apply) await commitInChunks(db, records.map((r) => ({ type: 'set', path: r.path, data: decode(r.data, db) })));
  return resumo;
}

async function conta() {
  initializeApp({ projectId: a.para });
  const auth = getAuth();
  const senha = randomBytes(12).toString('base64url');
  let user;
  try { user = await auth.updateUser(a.uid, { email: a.email, password: senha, emailVerified: true }); }
  catch (e) { if (e.code !== 'auth/user-not-found') throw e; user = await auth.createUser({ uid: a.uid, email: a.email, password: senha, emailVerified: true }); }
  await writeFile(a.saida, `Homologação ${a.para}\nURL: https://${a.para}.web.app\nE-mail: ${a.email}\nSenha: ${senha}\n`, { mode: 0o600 });
  return { uid: user.uid, credencialSalvaEm: a.saida };
}

async function criarBanco() {
  initializeApp({ projectId: a.para });
  const token = (await (await import('firebase-admin/app')).getApp().options.credential.getAccessToken()).access_token;
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${a.para}/databases?databaseId=(default)`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-goog-user-project': a.para },
    body: JSON.stringify({ type: 'FIRESTORE_NATIVE', locationId: a.local || 'southamerica-east1' }),
  });
  return { status: r.status, resposta: await r.json().catch(() => ({})) };
}

// Verifica as regras no Firebase real, como um cliente do app (REST com token de usuário).
async function verificar() {
  const cfg = await (await fetch(`https://${a.para}.web.app/__/firebase/init.json`)).json();
  const cred = Object.fromEntries((await readFile(a.credencial, 'utf8')).split('\n').filter((l) => l.includes(': ')).map((l) => [l.split(': ')[0], l.split(': ').slice(1).join(': ')]));
  const idt = (p, body) => fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${p}?key=${cfg.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
  const fsBase = `https://firestore.googleapis.com/v1/projects/${a.para}/databases/(default)/documents`;
  const fsReq = (tk, path, opts = {}) => fetch(`${fsBase}${path}`, { ...opts, headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' } });
  const consulta = (tk, colecao, org) => fsReq(tk, ':runQuery', { method: 'POST', body: JSON.stringify({ structuredQuery: { from: [{ collectionId: colecao }], where: { fieldFilter: { field: { fieldPath: 'organizationId' }, op: 'EQUAL', value: { stringValue: org } } }, limit: 500 } }) });
  const r = { projeto: a.para, em: new Date().toISOString(), proprietario: {}, atacante: {} };

  const dono = await idt('signInWithPassword', { email: cred['E-mail'], password: cred.Senha, returnSecureToken: true });
  if (!dono.idToken) throw new Error(`Login do proprietário falhou: ${dono.error?.message}`);
  for (const col of ['alunos', 'aulas', 'pacotes', 'despesas']) {
    const res = await consulta(dono.idToken, col, 'org_jair');
    const j = await res.json();
    r.proprietario[`le_${col}`] = { http: res.status, documentos: Array.isArray(j) ? j.filter((x) => x.document).length : 0 };
  }
  const nova = await fsReq(dono.idToken, '/aulas', { method: 'POST', body: JSON.stringify({ fields: { organizationId: { stringValue: 'org_jair' }, alunoId: { stringValue: 'homolog-teste' }, valor: { integerValue: '1' }, obs: { stringValue: 'teste de homologação' } } }) });
  r.proprietario.grava_aula = nova.status;
  const novaDoc = await nova.json().catch(() => ({}));
  if (novaDoc.name) r.proprietario.apaga_aula_teste = (await fsReq(dono.idToken, `/${novaDoc.name.split('/documents/')[1]}`, { method: 'DELETE' })).status;

  const email = `atacante-${Date.now()}@exemplo.invalid`;
  const atk = await idt('signUp', { email, password: randomBytes(12).toString('hex'), returnSecureToken: true });
  if (!atk.idToken) throw new Error(`Cadastro do atacante falhou: ${atk.error?.message}`);
  r.atacante.vira_admin = (await fsReq(atk.idToken, `/usuarios/${atk.localId}`, { method: 'PATCH', body: JSON.stringify({ fields: { email: { stringValue: email }, role: { stringValue: 'admin' }, organizationId: { stringValue: 'org_jair' }, ativo: { booleanValue: true } } }) })).status;
  r.atacante.le_alunos = (await consulta(atk.idToken, 'alunos', 'org_jair')).status;
  r.atacante.le_sem_filtro = (await fsReq(atk.idToken, '/alunos?pageSize=1')).status;
  r.atacante.cria_sistema = (await fsReq(atk.idToken, '/sistema/configuracao2', { method: 'PATCH', body: JSON.stringify({ fields: { adminUid: { stringValue: atk.localId } } }) })).status;
  r.atacante.conta_removida = !!(await idt('delete', { idToken: atk.idToken }));
  r.aprovado = r.proprietario.le_alunos.http === 200 && r.proprietario.grava_aula === 200
    && [r.atacante.vira_admin, r.atacante.le_alunos, r.atacante.le_sem_filtro, r.atacante.cria_sistema].every((s) => s === 403);
  await writeFile(a.saida, JSON.stringify(r, null, 2));
  return r;
}

const run = { copiar, conta, 'criar-banco': criarBanco, verificar }[cmd];
if (!run) { console.error(`Comando desconhecido: ${cmd}`); process.exit(2); }
run().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error('FALHA', e.message); process.exit(1); });
