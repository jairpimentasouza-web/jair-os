// Regras REAIS de produção (capturadas em 12/11/2026, publicadas em 07/09/2026), executadas no
// emulador com dados fictícios: demonstra a brecha de autocadastro de administrador e o efeito
// da correção emergencial (criação de sistema/configuracao).
import { describe, it, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDocs, collection } from 'firebase/firestore';

let env;
before(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-profgestor-legado',
    firestore: { rules: readFileSync(new URL('../../docs/evidencias/firestore.rules.producao-2026-09-07.rules', import.meta.url), 'utf8'), host, port: Number(port) },
  });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'usuarios/dono'), { role: 'admin', ativo: true, organizationId: 'org_jair' });
    await setDoc(doc(db, 'alunos/menor1'), { nome: 'Aluno fictício', organizationId: 'org_jair' });
  });
});

const atacante = () => env.authenticatedContext('estranho', { email: 'qualquer@exemplo.com' }).firestore();
const virarAdmin = (db) => setDoc(doc(db, 'usuarios/estranho'), { role: 'admin', ativo: true });

describe('Regras legadas de produção', () => {
  it('SEM sistema/configuracao: qualquer conta vira admin e lê todos os alunos (brecha)', async () => {
    const db = atacante();
    await assertSucceeds(virarAdmin(db));
    await assertSucceeds(getDocs(collection(db, 'alunos')));
  });
  it('COM sistema/configuracao (correção emergencial): autocadastro como admin é negado', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'sistema/configuracao'), { adminUid: 'dono' }));
    const db = atacante();
    await assertFails(virarAdmin(db));
    await assertFails(getDocs(collection(db, 'alunos')));
  });
  it('a correção não afeta o proprietário', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'sistema/configuracao'), { adminUid: 'dono' }));
    const dono = env.authenticatedContext('dono', { email: 'dono@exemplo.com' }).firestore();
    await assertSucceeds(getDocs(collection(dono, 'alunos')));
  });
});
