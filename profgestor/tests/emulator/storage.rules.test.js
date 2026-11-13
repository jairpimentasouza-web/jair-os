// Isolamento de arquivos (Storage) entre tenants e no portal da família.
import { describe, it, before, after, beforeEach } from 'node:test';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { createEnv, seed, USERS } from './helpers.js';

let env;
before(async () => { env = await createEnv(); });
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await seed(env);
  await env.clearStorage();
  await env.withSecurityRulesDisabled((ctx) =>
    ctx.storage().ref('orgs/org_a/materiais/alunoA1/lista1.pdf').put(Buffer.from('%PDF-1.4 teste'), { contentType: 'application/pdf' }));
});

const st = (name) => env.authenticatedContext(name, USERS[name]).storage();
const pdf = Buffer.from('%PDF-1.4 conteudo');

describe('Storage por tenant', () => {
  it('equipe do tenant envia e lê materiais', async () => {
    await assertSucceeds(st('profA').ref('orgs/org_a/materiais/alunoA2/lista2.pdf').put(pdf, { contentType: 'application/pdf' }));
    await assertSucceeds(st('profA').ref('orgs/org_a/materiais/alunoA1/lista1.pdf').getMetadata());
    await assertSucceeds(st('colabA').ref('orgs/org_a/materiais/alunoA1/lista1.pdf').getMetadata());
  });
  it('outro tenant não lê, não envia e não apaga', async () => {
    await assertFails(st('profB').ref('orgs/org_a/materiais/alunoA1/lista1.pdf').getMetadata());
    await assertFails(st('profB').ref('orgs/org_a/materiais/alunoA1/x.pdf').put(pdf, { contentType: 'application/pdf' }));
    await assertFails(st('profB').ref('orgs/org_a/materiais/alunoA1/lista1.pdf').delete());
  });
  it('família lê apenas materiais do próprio aluno', async () => {
    await assertSucceeds(st('famA').ref('orgs/org_a/materiais/alunoA1/lista1.pdf').getMetadata());
    await assertFails(st('famA').ref('orgs/org_a/materiais/alunoA2/lista2.pdf').getMetadata());
    await assertFails(st('famA').ref('orgs/org_a/relatorios/financeiro.pdf').getMetadata());
    await assertFails(st('famA').ref('orgs/org_a/materiais/alunoA1/novo.pdf').put(pdf, { contentType: 'application/pdf' }));
  });
  it('colaborador e admin da plataforma não enviam; plataforma não lê conteúdo', async () => {
    await assertFails(st('colabA').ref('orgs/org_a/materiais/alunoA1/c.pdf').put(pdf, { contentType: 'application/pdf' }));
    await assertFails(st('platform').ref('orgs/org_a/materiais/alunoA1/lista1.pdf').getMetadata());
  });
  it('tipos e tamanhos inseguros são recusados', async () => {
    await assertFails(st('profA').ref('orgs/org_a/materiais/alunoA1/x.html').put(Buffer.from('<script>'), { contentType: 'text/html' }));
    await assertFails(st('profA').ref('orgs/org_a/materiais/alunoA1/x.exe').put(Buffer.from('MZ'), { contentType: 'application/octet-stream' }));
    await assertFails(st('profA').ref('orgs/org_a/materiais/alunoA1/grande.pdf').put(Buffer.alloc(15 * 1024 * 1024 + 1), { contentType: 'application/pdf' }));
  });
  it('caminhos fora do contrato são negados', async () => {
    await assertFails(st('profA').ref('publico/qualquer.pdf').put(pdf, { contentType: 'application/pdf' }));
    await assertFails(env.unauthenticatedContext().storage().ref('orgs/org_a/materiais/alunoA1/lista1.pdf').getMetadata());
  });
});
