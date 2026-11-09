/* ProfGestor V5 — módulos operacionais que faltavam em produção.
 *
 * O index.html V4 referencia este arquivo, mas ele não estava publicado: o painel inicial
 * mostrava zeros fixos e o CRM e a "Sala da aula" não funcionavam (renderCRM e
 * renderAulasOperacao indefinidos).
 *
 * Os cálculos ficam em ProfGestorMetrics (funções puras, testadas em tests/unit).
 * Definições dos indicadores (todas sobre aulas com statusAula diferente de 'cancelada'):
 *   - Aulas hoje: início na data local de hoje.
 *   - Em atraso: soma de `valor` das aulas com status de pagamento 'pendente' cujo início
 *     já passou (mesma regra de "pendente" do módulo Financeiro, restrita ao passado).
 *   - Despesas do mês: soma de `valor` das despesas com `data` no mês corrente.
 *   - Resultado do mês: aulas pagas com data no mês corrente − despesas do mês
 *     (regime de competência pela data da aula, igual ao Financeiro V4).
 *   - Relatórios pendentes: aulas já terminadas sem presença nem registro pós-aula.
 */
(function () {
  'use strict';

  var ATIVA = function (a) { return (a.statusAula || 'agendada') !== 'cancelada'; };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  // Horários são gravados como hora local "flutuante" (AAAA-MM-DDTHH:mm:ss, sem fuso).
  function parseLocal(iso) {
    if (!iso) return null;
    var parts = String(iso).split('T');
    var d = parts[0].split('-').map(Number);
    var t = (parts[1] || '00:00:00').split(':').map(Number);
    if (!d[0] || !d[1] || !d[2]) return null;
    return new Date(d[0], d[1] - 1, d[2], t[0] || 0, t[1] || 0, t[2] || 0);
  }
  function startOfWeek(now) { // segunda-feira 00:00 local
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var diff = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  }
  function relatorioPendente(a, now) {
    var fim = parseLocal(a.end) || parseLocal(a.start);
    return ATIVA(a) && !!fim && fim < now && !a.presenca && !a.registradoEm;
  }
  var num = function (v) { var n = Number(v); return Number.isFinite(n) ? n : 0; };

  var Metrics = {
    parseLocal: parseLocal,
    ymd: ymd,
    dashboard: function (state, now) {
      now = now || new Date();
      var hoje = ymd(now), mes = hoje.slice(0, 7);
      var aulas = (state.eventos || []).filter(ATIVA);
      var aulasHoje = aulas.filter(function (a) { return String(a.start || '').slice(0, 10) === hoje; }).length;
      var emAtraso = aulas.filter(function (a) {
        var ini = parseLocal(a.start);
        return (a.status || 'pendente') === 'pendente' && ini && ini < now;
      }).reduce(function (s, a) { return s + num(a.valor); }, 0);
      var recebidoMes = aulas.filter(function (a) { return a.status === 'pago' && String(a.start || '').slice(0, 7) === mes; })
        .reduce(function (s, a) { return s + num(a.valor); }, 0);
      var despesasMes = (state.despesas || []).filter(function (d) { return String(d.data || '').slice(0, 7) === mes; })
        .reduce(function (s, d) { return s + num(d.valor); }, 0);
      var relatoriosPendentes = (state.eventos || []).filter(function (a) { return relatorioPendente(a, now); }).length;
      return { aulasHoje: aulasHoje, emAtraso: emAtraso, recebidoMes: recebidoMes, despesasMes: despesasMes,
        resultadoMes: recebidoMes - despesasMes, relatoriosPendentes: relatoriosPendentes };
    },
    aulasOperacao: function (state, filtro, now) {
      now = now || new Date();
      var hoje = ymd(now);
      var ini = startOfWeek(now), fim = new Date(ini); fim.setDate(fim.getDate() + 7);
      var todas = (state.eventos || []).slice();
      var byStart = function (a, b) { return (parseLocal(a.start) || 0) - (parseLocal(b.start) || 0); };
      var lista;
      if (filtro === 'hoje') lista = todas.filter(function (a) { return ATIVA(a) && String(a.start || '').slice(0, 10) === hoje; }).sort(byStart);
      else if (filtro === 'pendentes') lista = todas.filter(function (a) { return relatorioPendente(a, now); }).sort(byStart).reverse();
      else if (filtro === 'todas') lista = todas.sort(byStart).reverse().slice(0, 150);
      else lista = todas.filter(function (a) { var s = parseLocal(a.start); return ATIVA(a) && s && s >= now; }).sort(byStart).slice(0, 60);
      return {
        lista: lista,
        hoje: todas.filter(function (a) { return ATIVA(a) && String(a.start || '').slice(0, 10) === hoje; }).length,
        semana: todas.filter(function (a) { var s = parseLocal(a.start); return ATIVA(a) && s && s >= ini && s < fim; }).length,
        relatoriosPendentes: todas.filter(function (a) { return relatorioPendente(a, now); }).length
      };
    },
    crm: function (leads, filtro) {
      leads = leads || [];
      var etapa = function (l) { return l.etapa || 'lead'; };
      var conta = function (e) { return leads.filter(function (l) { return etapa(l) === e; }).length; };
      var ordem = { lead: 0, experimental: 1, proposta: 2, convertido: 3, perdido: 4 };
      var lista = leads.filter(function (l) { return !filtro || filtro === 'todos' || etapa(l) === filtro; })
        .sort(function (a, b) {
          return (ordem[etapa(a)] ?? 9) - (ordem[etapa(b)] ?? 9)
            || String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));
        });
      return {
        lista: lista,
        abertos: leads.filter(function (l) { return ['lead', 'experimental', 'proposta'].indexOf(etapa(l)) >= 0; }).length,
        experimentais: conta('experimental'), propostas: conta('proposta'), convertidos: conta('convertido'),
        taxaConversao: (conta('convertido') + conta('perdido')) ? conta('convertido') / (conta('convertido') + conta('perdido')) : null
      };
    }
  };
  if (typeof window !== 'undefined') window.ProfGestorMetrics = Metrics;
  if (typeof document === 'undefined') return; // ambiente de teste

  // ---------------- interface ----------------
  function esc(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; }
  function money(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num(v)); }
  function dataHora(iso) {
    var d = parseLocal(iso); if (!d) return '—';
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d);
  }
  function state() { return (window.__gestaoV4 && window.__gestaoV4.getState && window.__gestaoV4.getState()) || { eventos: [], despesas: [], leads: [], alunos: [] }; }
  function setText(id, value) { var el = document.getElementById(id); if (el) el.textContent = value; }
  function toast(msg, type) { if (window.pgToast) window.pgToast(msg, type); }

  function renderDashboardV4() {
    var m = Metrics.dashboard(state());
    setText('v4HeroDate', new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date()));
    setText('v4TodayLessons', String(m.aulasHoje));
    setText('v4OverdueAmount', money(m.emAtraso));
    setText('v4ExpensesMonth', money(m.despesasMes));
    setText('v4NetMonth', money(m.resultadoMes));
    setText('v4ReportsPending', String(m.relatoriosPendentes));
  }

  var STATUS_AULA = { agendada: 'Agendada', realizada: 'Realizada', faltou: 'Faltou', cancelada: 'Cancelada', reposicao: 'Reposição' };
  window.renderAulasOperacao = function () {
    var body = document.getElementById('v4AulasOperacaoBody'); if (!body) return;
    var filtro = (document.getElementById('v4AulaFiltro') || {}).value || 'proximas';
    var r = Metrics.aulasOperacao(state(), filtro);
    setText('v4AulasHoje', String(r.hoje)); setText('v4AulasSemana', String(r.semana)); setText('v4AulasRelPend', String(r.relatoriosPendentes));
    if (!r.lista.length) { body.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Nenhuma aula neste filtro.</td></tr>'; return; }
    var agora = new Date();
    body.innerHTML = r.lista.map(function (a) {
      var pago = a.status === 'pago';
      var pend = relatorioPendente(a, agora);
      var id = esc(a.id);
      return '<tr><td style="white-space:nowrap">' + esc(dataHora(a.start)) + '</td>' +
        '<td><strong>' + esc(a.alunoNome || 'Aluno') + '</strong></td>' +
        '<td>' + esc(STATUS_AULA[a.statusAula || 'agendada'] || a.statusAula) + '</td>' +
        '<td><span class="badge ' + (pago ? 'bg-success' : 'bg-warning text-dark') + '">' + (pago ? 'Pago' : 'Pendente') + '</span> ' + esc(money(a.valor)) + '</td>' +
        '<td>' + (a.registradoEm || a.presenca ? '<span class="text-success"><i class="fas fa-check me-1"></i>Registrado</span>' : (pend ? '<span class="text-danger">Pendente</span>' : '<span class="text-muted">—</span>')) + '</td>' +
        '<td class="text-end" style="white-space:nowrap">' +
          '<button type="button" class="btn btn-sm btn-outline-primary me-1" data-pg-action="registrar" data-id="' + id + '"><i class="fas fa-clipboard-check me-1"></i>Pós-aula</button>' +
          (pago || !ATIVA(a) ? '' : '<button type="button" class="btn btn-sm btn-outline-success" data-pg-action="pagar" data-id="' + id + '"><i class="fas fa-check me-1"></i>Pago</button>') +
        '</td></tr>';
    }).join('');
  };

  var ETAPAS = [['lead', 'Lead'], ['experimental', 'Aula experimental'], ['proposta', 'Proposta'], ['convertido', 'Convertido'], ['perdido', 'Perdido']];
  window.renderCRM = function () {
    var body = document.getElementById('v4CrmBody'); if (!body) return;
    var filtro = (document.getElementById('v4CrmFiltro') || {}).value || 'todos';
    var r = Metrics.crm(state().leads, filtro);
    setText('v4CrmOpen', String(r.abertos)); setText('v4CrmTrial', String(r.experimentais));
    setText('v4CrmProposal', String(r.propostas)); setText('v4CrmWon', String(r.convertidos));
    if (!r.lista.length) { body.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Nenhum interessado nesta etapa.</td></tr>'; return; }
    body.innerHTML = r.lista.map(function (l) {
      var id = esc(l.id), tel = String(l.tel || '').replace(/\D/g, '').replace(/^55/, '');
      var etapa = l.etapa || 'lead';
      var opts = ETAPAS.map(function (e) { return '<option value="' + e[0] + '"' + (e[0] === etapa ? ' selected' : '') + '>' + e[1] + '</option>'; }).join('');
      return '<tr><td><strong>' + esc(l.nome || '—') + '</strong>' + (tel ? '<div class="small"><a target="_blank" rel="noopener" href="https://wa.me/55' + esc(tel) + '"><i class="fab fa-whatsapp me-1"></i>' + esc(tel) + '</a></div>' : '') + '</td>' +
        '<td>' + esc(l.interesse || '—') + '</td><td>' + esc(l.origem || '—') + '</td>' +
        '<td><select class="form-select form-select-sm" aria-label="Etapa de ' + esc(l.nome || 'lead') + '" data-pg-action="etapa" data-id="' + id + '">' + opts + '</select></td>' +
        '<td class="text-end" style="white-space:nowrap">' +
          (l.alunoId ? '<span class="badge bg-success me-1">Aluno criado</span>' : '<button type="button" class="btn btn-sm btn-outline-success me-1" data-pg-action="converter" data-id="' + id + '"><i class="fas fa-user-check me-1"></i>Matricular</button>') +
          '<button type="button" class="btn btn-sm btn-outline-danger" aria-label="Excluir lead" data-pg-action="excluir-lead" data-id="' + id + '"><i class="fas fa-trash"></i></button>' +
        '</td></tr>';
    }).join('');
  };

  // Delegação de eventos (sem onclick com dados interpolados).
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('[data-pg-action]');
    if (!btn || btn.tagName === 'SELECT') return;
    var id = btn.getAttribute('data-id'), action = btn.getAttribute('data-pg-action');
    if (action === 'registrar' && window.v4GoPedagogico) window.v4GoPedagogico(id);
    if (action === 'pagar' && window.alternarPagamento) window.alternarPagamento(id, 'pago');
    if (action === 'converter' && window.v4ConvertLead) {
      btn.disabled = true;
      window.v4ConvertLead(id).then(function () { toast('Lead matriculado: aluno criado em Alunos.', 'success'); })
        .catch(function (e) { console.error(e); toast('Não foi possível matricular o lead.', 'error'); btn.disabled = false; });
    }
    if (action === 'excluir-lead' && window.v4DeleteLead) {
      var run = function () { window.v4DeleteLead(id).then(function () { toast('Lead excluído.', 'success'); }).catch(function (e) { console.error(e); toast('Não foi possível excluir.', 'error'); }); };
      if (window.pgConfirm) window.pgConfirm('Excluir lead', 'Excluir este interessado do CRM?', run); else run();
    }
  });
  document.addEventListener('change', function (ev) {
    var sel = ev.target;
    if (!sel || sel.getAttribute('data-pg-action') !== 'etapa' || !window.v4UpdateLead) return;
    window.v4UpdateLead(sel.getAttribute('data-id'), { etapa: sel.value })
      .then(function () { toast('Etapa atualizada.', 'success'); })
      .catch(function (e) { console.error(e); toast('Não foi possível atualizar a etapa.', 'error'); });
  });

  function bindCrmForm() {
    var form = document.getElementById('v4CrmForm'); if (!form || form.dataset.pgBound) return;
    form.dataset.pgBound = '1';
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.reportValidity() || !window.v4CreateLead) return;
      var val = function (id) { return (document.getElementById(id) || {}).value || ''; };
      var btn = form.querySelector('[type=submit]'); if (btn) btn.disabled = true;
      window.v4CreateLead({ nome: val('v4CrmNome'), tel: val('v4CrmTel'), interesse: val('v4CrmInteresse'), origem: val('v4CrmOrigem'), etapa: val('v4CrmEtapa') || 'lead' })
        .then(function () { form.reset(); toast('Lead salvo.', 'success'); })
        .catch(function (e) { console.error(e); toast('Não foi possível salvar o lead.', 'error'); })
        .then(function () { if (btn) btn.disabled = false; });
    });
  }

  function renderAll() { renderDashboardV4(); window.renderAulasOperacao(); window.renderCRM(); }
  function boot() {
    bindCrmForm(); renderAll();
    document.addEventListener('profgestor:data', renderAll);
    setInterval(renderDashboardV4, 60000); // vira o dia / horários passam sem novos dados
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
