// Indicadores do painel, CRM e sala de aula (web/src/v4-features.js), sem navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const code = readFileSync(new URL('../../web/src/v4-features.js', import.meta.url), 'utf8');
const sandbox = { window: {}, Intl, Date, Number, String, Math };
vm.runInNewContext(code, sandbox);
const M = sandbox.window.ProfGestorMetrics;

// "Agora" fixo: segunda-feira, 09/11/2026 às 15:00 (hora local).
const NOW = new Date(2026, 10, 9, 15, 0, 0);
const aula = (start, extra = {}) => ({ start, end: start.replace(/T(\d\d)/, (_, h) => `T${String(+h + 1).padStart(2, '0')}`), valor: 100, status: 'pendente', statusAula: 'agendada', ...extra });

test('painel: aulas de hoje ignoram canceladas e outras datas', () => {
  const s = { eventos: [aula('2026-11-09T10:00:00'), aula('2026-11-09T18:00:00'), aula('2026-11-09T19:00:00', { statusAula: 'cancelada' }), aula('2026-11-10T10:00:00')], despesas: [] };
  assert.equal(M.dashboard(s, NOW).aulasHoje, 2);
});

test('painel: "em atraso" usa a regra do Financeiro (pendente, não cancelada) restrita ao passado', () => {
  const s = { eventos: [
    aula('2026-11-02T10:00:00', { valor: 120 }),                         // passada pendente → conta
    aula('2026-11-09T10:00:00', { valor: '80' }),                        // hoje, já começou → conta (texto legado)
    aula('2026-11-09T18:00:00', { valor: 999 }),                         // futura → não conta
    aula('2026-11-03T10:00:00', { valor: 50, status: 'pago' }),          // paga → não conta
    aula('2026-11-04T10:00:00', { valor: 70, statusAula: 'cancelada' }), // cancelada → não conta
  ], despesas: [] };
  assert.equal(M.dashboard(s, NOW).emAtraso, 200);
});

test('painel: resultado do mês = aulas pagas do mês − despesas do mês', () => {
  const s = {
    eventos: [aula('2026-11-03T10:00:00', { status: 'pago', valor: 300 }), aula('2026-10-30T10:00:00', { status: 'pago', valor: 999 })],
    despesas: [{ data: '2026-11-05', valor: 40 }, { data: '2026-10-05', valor: 500 }],
  };
  const m = M.dashboard(s, NOW);
  assert.equal(m.recebidoMes, 300);
  assert.equal(m.despesasMes, 40);
  assert.equal(m.resultadoMes, 260);
});

test('painel: data de hoje é local, não UTC (às 22h em São Paulo ainda é o mesmo dia)', () => {
  const late = new Date(2026, 10, 9, 22, 30, 0);
  const s = { eventos: [aula('2026-11-09T21:00:00')], despesas: [] };
  assert.equal(M.dashboard(s, late).aulasHoje, 1);
});

test('relatórios pendentes: aula terminada sem presença nem registro', () => {
  const s = { eventos: [
    aula('2026-11-06T10:00:00'),
    aula('2026-11-06T12:00:00', { presenca: 'presente', registradoEm: '2026-11-06T13:10:00' }),
    aula('2026-11-09T18:00:00'),
    aula('2026-11-05T10:00:00', { statusAula: 'cancelada' }),
  ], despesas: [] };
  assert.equal(M.dashboard(s, NOW).relatoriosPendentes, 1);
});

test('sala da aula: filtros e contagem da semana (segunda a domingo)', () => {
  const s = { eventos: [
    aula('2026-11-09T09:00:00'), aula('2026-11-09T18:00:00'), aula('2026-11-15T10:00:00'),
    aula('2026-11-16T10:00:00'), aula('2026-11-08T10:00:00'), aula('2026-11-12T10:00:00', { statusAula: 'cancelada' }),
  ] };
  const r = M.aulasOperacao(s, 'proximas', NOW);
  assert.equal(r.hoje, 2);
  assert.equal(r.semana, 3);
  assert.deepEqual(r.lista.map((a) => a.start), ['2026-11-09T18:00:00', '2026-11-15T10:00:00', '2026-11-16T10:00:00']);
  assert.equal(M.aulasOperacao(s, 'hoje', NOW).lista.length, 2);
  assert.equal(M.aulasOperacao(s, 'pendentes', NOW).lista.length, 2);
});

test('CRM: funil, filtros e taxa de conversão', () => {
  const leads = [{ etapa: 'lead' }, { etapa: 'experimental' }, { etapa: 'proposta' }, { etapa: 'convertido' }, { etapa: 'convertido' }, { etapa: 'perdido' }, {}];
  const r = M.crm(leads, 'todos');
  assert.equal(r.abertos, 4);
  assert.equal(r.experimentais, 1);
  assert.equal(r.propostas, 1);
  assert.equal(r.convertidos, 2);
  assert.equal(Math.round(r.taxaConversao * 100), 67);
  assert.equal(M.crm(leads, 'convertido').lista.length, 2);
  assert.equal(M.crm([], 'todos').taxaConversao, null);
});

const DAY = 864e5;
const T = NOW.getTime();
const plain = (x) => JSON.parse(JSON.stringify(x)); // objetos do vm têm protótipos de outro realm
test('direito de uso espelha a regra orgWritable do servidor', () => {
  assert.deepEqual(plain(M.direitoDeUso(null, T)), { writable: true, tipo: 'legado' });
  assert.equal(M.direitoDeUso({ billingExempt: true, createdAtMs: T - 900 * DAY }, T).tipo, 'isenta');
  const teste = M.direitoDeUso({ createdAtMs: T - 10 * DAY }, T);
  assert.deepEqual([teste.writable, teste.tipo, teste.diasRestantes], [true, 'teste', 4]);
  assert.deepEqual(plain(M.direitoDeUso({ createdAtMs: T - 15 * DAY }, T)), { writable: false, tipo: 'somente_leitura', motivo: 'teste_encerrado' });
  const pago = M.direitoDeUso({ createdAtMs: T - 60 * DAY, entitlement: { status: 'active', plan: 'profissional', accessUntilMs: T + DAY } }, T);
  assert.deepEqual([pago.writable, pago.tipo, pago.plano], [true, 'assinante', 'profissional']);
  assert.equal(M.direitoDeUso({ createdAtMs: T - 60 * DAY, entitlement: { status: 'past_due', accessUntilMs: T + DAY } }, T).tipo, 'pagamento_pendente');
  assert.equal(M.direitoDeUso({ createdAtMs: T - 60 * DAY, entitlement: { status: 'active', accessUntilMs: T - 1 } }, T).writable, false);
  assert.equal(M.direitoDeUso({ createdAtMs: T - 60 * DAY, entitlement: { status: 'canceled', accessUntilMs: T + DAY } }, T).motivo, 'cancelada');
});

test('onboarding: 8 passos derivados dos dados e das visitas', () => {
  const vazio = M.onboarding({ alunos: [], eventos: [], config: {} }, {});
  assert.equal(vazio.total, 8);
  assert.equal(vazio.feitos, 1);
  const cheio = M.onboarding({ alunos: [{}], eventos: [{ valor: 100 }], config: { contatoConfigurado: true } }, { financeiro: true, relatorio: true, integracoes: true });
  assert.equal(cheio.completo, true);
  const semPreco = M.onboarding({ alunos: [{}], eventos: [{ valor: 0 }], config: {} }, {});
  assert.deepEqual(plain(semPreco.passos.filter((p) => !p.done).map((p) => p.id)), ['perfil', 'preco', 'financeiro', 'relatorio', 'integracoes']);
});
