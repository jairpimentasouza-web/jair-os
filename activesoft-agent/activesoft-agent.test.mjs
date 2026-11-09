// Testes offline do agente ActiveSoft (dados sintéticos — nenhum aluno real).
// Rodar: node --test activesoft-agent/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { acharAlunos, acharFase, valorDoCampo, planejar, paraNumero, formatarValor, norm } from './activesoft-agent.mjs';

const gradePlana = {
  count: 3,
  results: [
    { aluno: 11, nome_aluno: 'Ana Teste Um', AV1: null, AV2: '7,5', EO: '1,0' },
    { aluno: 12, nome_aluno: 'Bruno Teste Dois', AV1: '3,6', AV2: null, EO: null },
    { aluno: 13, nome_aluno: 'Cecília Teste Três', AV1: '', AV2: null, EO: null },
  ],
};

const gradeAninhada = {
  alunos: [
    { aluno: { id: 21, nome: 'Davi Exemplo' }, nome: 'Davi Exemplo Silva', notas: [{ campo: 'AV1', valor: null }, { campo: 'EO', valor: 2 }] },
    { aluno: { id: 22, nome: 'Eva Exemplo' }, nome: 'Eva Exemplo Souza', notas: [{ campo: 'AV1', valor: 5.5 }, { campo: 'EO', valor: 1 }] },
  ],
};

const lote = { campo: 'AV1', bimestre: 4, valor_maximo: 8 };

test('normalização e números pt-BR', () => {
  assert.equal(norm('  Cecília  Teste '), 'cecilia teste');
  assert.equal(paraNumero('3,6'), 3.6);
  assert.equal(paraNumero(''), null);
  assert.equal(paraNumero('F'), null);
  assert.equal(formatarValor(3.6, 'virgula'), '3,6');
  assert.equal(formatarValor(4, 'virgula'), '4');
  assert.equal(formatarValor(4, 'ponto'), '4');
  assert.equal(formatarValor(2.8, 'numero'), 2.8);
});

test('acha alunos em grade plana e aninhada', () => {
  const g1 = acharAlunos(gradePlana);
  assert.equal(g1.itens.length, 3);
  assert.equal(g1.chaveNome, 'nome_aluno');
  assert.equal(g1.chaveId, 'aluno');
  const g2 = acharAlunos(gradeAninhada);
  assert.equal(g2.itens.length, 2);
  assert.equal(g2.chaveNome, 'nome');
  assert.equal(g2.chaveId, 'aluno.id');
});

test('lê valor da coluna em formatos diferentes', () => {
  assert.deepEqual(valorDoCampo(gradePlana.results[1], 'AV1'), { achou: true, valor: '3,6' });
  assert.deepEqual(valorDoCampo(gradeAninhada.alunos[1], 'av1'), { achou: true, valor: 5.5 });
  assert.equal(valorDoCampo({ x: 1 }, 'AV1').achou, false);
});

test('descobre a fase do bimestre', () => {
  const caps = [{ json: [{ id: 508, descricao: '3º BIMESTRE' }, { id: 509, descricao: '4º BIMESTRE' }, { id: 510, descricao: 'RECUPERAÇÃO FINAL' }] }];
  assert.deepEqual(acharFase(caps, 4), [{ id: 509, rotulo: '4º BIMESTRE' }]);
  assert.deepEqual(acharFase([{ json: { fases: [{ id: 1, nome: '4 Bim' }] } }], 4), [{ id: 1, rotulo: '4 Bim' }]);
  assert.deepEqual(acharFase(caps, 2), []);
});

test('plano: grava vazias, respeita preenchidas, pendentes e nomes ausentes', () => {
  const turma = {
    turma: 'T1',
    notas: [
      { nome: 'Ana Teste Um', nota: 4.4, vinculo: 'confirmado' },
      { nome: 'Bruno Teste Dois', nota: 3.6, vinculo: 'confirmado' },
      { nome: 'Cecilia Teste Tres', nota: 2.8, vinculo: 'pendente' },
    ],
  };
  const g = acharAlunos(gradePlana);
  const p = planejar({ lote, turma, grade: g, incluirPendentes: false, sobrescrever: false });
  assert.deepEqual(p.map((x) => x.acao), ['gravar', 'ja_lancada', 'pular']);
  const p2 = planejar({ lote, turma, grade: g, incluirPendentes: true, sobrescrever: false });
  assert.equal(p2[2].acao, 'gravar');
  assert.equal(p2[2].aluno_id, 13);

  const outra = { turma: 'T1', notas: [{ nome: 'Bruno Teste Dois', nota: 5, vinculo: 'confirmado' }, { nome: 'Fulano Inexistente', nota: 1, vinculo: 'confirmado' }, { nome: 'Ana Teste Um', nota: 9, vinculo: 'confirmado' }] };
  const p3 = planejar({ lote, turma: outra, grade: g, incluirPendentes: false, sobrescrever: false });
  assert.equal(p3[0].acao, 'pular');
  assert.equal(p3[1].acao, 'erro');
  assert.equal(p3[2].acao, 'erro');
  assert.equal(planejar({ lote, turma: outra, grade: g, incluirPendentes: false, sobrescrever: true })[0].acao, 'gravar');
});
