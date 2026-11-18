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
    },
    // Espelho, para a interface, da regra orgWritable do firestore.rules (a decisão real é do servidor).
    direitoDeUso: function (org, now) {
      now = now || Date.now();
      var DAY = 864e5;
      if (!org) return { writable: true, tipo: 'legado' };
      if (org.billingExempt) return { writable: true, tipo: 'isenta' };
      var ent = org.entitlement || {};
      if ((ent.status === 'active' || ent.status === 'past_due') && now < num(ent.accessUntilMs)) {
        return { writable: true, tipo: ent.status === 'past_due' ? 'pagamento_pendente' : 'assinante', plano: ent.plan, ate: num(ent.accessUntilMs), cancelaNoFim: !!ent.cancelAtPeriodEnd };
      }
      var fimTeste = num(org.createdAtMs) + 14 * DAY;
      if (now < fimTeste) return { writable: true, tipo: 'teste', ate: fimTeste, diasRestantes: Math.max(1, Math.ceil((fimTeste - now) / DAY)) };
      return { writable: false, tipo: 'somente_leitura', motivo: ent.status === 'canceled' ? 'cancelada' : (ent.status === 'blocked' ? 'bloqueada' : 'teste_encerrado') };
    },
    // Onboarding progressivo (8 passos), derivado dos dados reais e de marcas locais de visita.
    onboarding: function (state, flags) {
      flags = flags || {};
      var cfg = state.config || {};
      var aulas = state.eventos || [];
      var passos = [
        { id: 'conta', label: 'Criar sua conta', done: true },
        { id: 'perfil', label: 'Configurar contato e Pix no perfil', done: !!cfg.contatoConfigurado, acao: 'config' },
        { id: 'aluno', label: 'Cadastrar o primeiro aluno', done: (state.alunos || []).length > 0, acao: 'alunos' },
        { id: 'aula', label: 'Agendar a primeira aula', done: aulas.length > 0, acao: 'agenda' },
        { id: 'preco', label: 'Definir o preço das aulas', done: aulas.some(function (a) { return num(a.valor) > 0; }), acao: 'agenda' },
        { id: 'financeiro', label: 'Conhecer o financeiro', done: !!flags.financeiro, acao: 'financeiro' },
        { id: 'relatorio', label: 'Gerar o primeiro relatório', done: !!flags.relatorio, acao: 'relatorios' },
        { id: 'integracoes', label: 'Explorar integrações (opcional)', done: !!flags.integracoes, acao: 'config' }
      ];
      var feitos = passos.filter(function (p) { return p.done; }).length;
      return { passos: passos, feitos: feitos, total: passos.length, completo: feitos === passos.length };
    }
  };
  // Vitrine dos planos. O valor efetivamente cobrado é decidido no servidor (functions/src/plans.js).
  var PLANOS = [
    { id: 'essencial', nome: 'Essencial', preco: 'R$ 29,90', detalhe: 'por mês · até 25 alunos ativos', vende: true },
    { id: 'profissional', nome: 'Profissional', preco: 'R$ 49,90', detalhe: 'por mês · alunos ilimitados', vende: true },
    { id: 'fundador', nome: 'Fundador', preco: 'R$ 39,90', detalhe: 'por mês nos 12 primeiros meses (recursos do Profissional) · vagas limitadas', vende: true },
    { id: 'equipe', nome: 'Equipe', preco: 'R$ 119,90', detalhe: 'em breve — multiusuário ainda não disponível', vende: false }
  ];
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

  // ---------------- Conta, plano, aviso de somente leitura e onboarding (V5) ----------------
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* armazenamento indisponível */ } }
  function dataCurta(ms) { return ms ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(ms)) : '—'; }
  var NOME_PLANO = { essencial: 'Essencial', profissional: 'Profissional', fundador: 'Fundador', equipe: 'Equipe' };

  function renderBanner() {
    var el = document.getElementById('v5Banner'); if (!el) return;
    var st = state(); if (!st.usuario || !st.perfil || ['aluno', 'responsavel'].indexOf(st.perfil.role) >= 0) { el.hidden = true; return; }
    var d = Metrics.direitoDeUso(st.organizacao);
    if (d.tipo === 'somente_leitura') {
      el.innerHTML = '<i class="fas fa-lock"></i><span><strong>Conta em modo somente leitura.</strong> ' +
        (d.motivo === 'cancelada' ? 'A assinatura foi encerrada.' : d.motivo === 'bloqueada' ? 'A assinatura não está ativa.' : 'O período de teste terminou.') +
        ' Seus dados continuam disponíveis para consulta e exportação; para voltar a registrar aulas, escolha um plano.</span>' +
        '<button type="button" class="btn btn-sm btn-primary" data-pg-action="ir" data-id="conta">Ver planos</button>';
      el.hidden = false;
    } else if (d.tipo === 'pagamento_pendente') {
      el.innerHTML = '<i class="fas fa-triangle-exclamation"></i><span><strong>Pagamento pendente.</strong> Atualize a forma de pagamento até ' + esc(dataCurta(d.ate)) + ' para manter o acesso completo.</span>' +
        '<button type="button" class="btn btn-sm btn-primary" data-pg-action="ir" data-id="conta">Resolver</button>';
      el.hidden = false;
    } else el.hidden = true;
  }

  function onboardingFlags() {
    return {
      financeiro: ls('pg_onb_visitou_financeiro') === '1',
      relatorio: ls('pg_onb_relatorio') === '1',
      integracoes: ls('pg_onb_integracoes') === '1' || ls('profgestor_google_conectado_antes') === '1'
    };
  }
  function renderOnboarding() {
    var el = document.getElementById('v5Onboarding'); if (!el) return;
    var st = state(), org = st.organizacao;
    // Apenas para contas novas do SaaS; a conta original isenta não recebe o roteiro.
    if (!org || org.billingExempt || ls('pg_onb_ocultar') === '1' || !st.perfil || st.perfil.role !== 'admin') { el.innerHTML = ''; return; }
    var o = Metrics.onboarding(st, onboardingFlags());
    if (o.completo) { el.innerHTML = ''; return; }
    el.innerHTML = '<section class="v5-onb" aria-label="Primeiros passos"><div class="v5-onb-head"><strong>Primeiros passos · ' + o.feitos + ' de ' + o.total + '</strong>' +
      '<button type="button" class="btn btn-sm btn-ghost" data-pg-action="onb-ocultar">Ocultar</button></div>' +
      '<div class="v5-onb-bar" aria-hidden="true"><span style="width:' + Math.round(o.feitos / o.total * 100) + '%"></span></div><ol>' +
      o.passos.map(function (p) {
        return '<li class="' + (p.done ? 'done' : '') + '"><i class="fas ' + (p.done ? 'fa-circle-check text-success' : 'fa-circle text-muted') + '" aria-hidden="true"></i>' +
          (p.done || !p.acao ? esc(p.label) : '<button type="button" data-pg-action="ir" data-id="' + esc(p.acao) + '">' + esc(p.label) + '</button>') +
          '<span class="visually-hidden">' + (p.done ? ' (concluído)' : ' (pendente)') + '</span></li>';
      }).join('') + '</ol></section>';
  }

  window.renderContaV5 = function () {
    var box = document.getElementById('v5ContaStatus'), planos = document.getElementById('v5Planos'); if (!box || !planos) return;
    var st = state(), org = st.organizacao, plat = st.plataforma || {};
    var d = Metrics.direitoDeUso(org);
    var pill = {
      legado: ['', 'Conta original (aguardando migração V5)'],
      isenta: ['ok', 'Conta isenta de cobrança'],
      teste: ['warn', 'Teste grátis · ' + (d.diasRestantes || 0) + ' dia(s) restante(s)'],
      assinante: ['ok', 'Plano ' + (NOME_PLANO[d.plano] || d.plano || '') + ' ativo'],
      pagamento_pendente: ['warn', 'Pagamento pendente'],
      somente_leitura: ['bad', 'Somente leitura']
    }[d.tipo] || ['', d.tipo];
    var linhas = [];
    if (org && org.nome) linhas.push('<div class="mb-2"><span class="text-muted small">Conta</span><div class="fw-semibold">' + esc(org.nome) + '</div></div>');
    linhas.push('<div class="mb-2"><span class="v5-status-pill ' + pill[0] + '" id="v5StatusPill">' + esc(pill[1]) + '</span></div>');
    if (d.tipo === 'teste') linhas.push('<p class="small text-muted mb-2">O teste vai até ' + esc(dataCurta(d.ate)) + '. Nada é cobrado durante o teste.</p>');
    if (d.tipo === 'assinante') linhas.push('<p class="small text-muted mb-2">' + (d.cancelaNoFim ? 'Cancelamento agendado. Acesso até ' : 'Acesso garantido até ') + esc(dataCurta(d.ate)) + '.</p>');
    if (d.tipo === 'somente_leitura') linhas.push('<p class="small mb-2">Leitura, exportação e exclusão de dados continuam disponíveis.</p>');
    if (plat.billingEnabled && org && org.entitlement && org.entitlement.temCliente && st.perfil && st.perfil.role === 'admin') {
      linhas.push('<button type="button" class="btn btn-outline-primary btn-sm" data-pg-action="portal"><i class="fas fa-credit-card me-1"></i>Gerenciar assinatura</button>');
    }
    box.innerHTML = linhas.join('');
    var regra = document.getElementById('v5RegraFaltaCobrada');
    if (regra) {
      regra.checked = !!(org && org.settings && org.settings.faltaCobradaConsomeCredito);
      regra.disabled = !org || !st.perfil || st.perfil.role !== 'admin';
      var info = document.getElementById('v5RegraFaltaInfo');
      if (info) info.textContent = (regra.checked ? 'Ligado: presença e falta cobrada consomem crédito.' : 'Desligado: só a presença consome crédito.') +
        (regra.disabled ? ' Somente o administrador da conta altera esta regra.' : ' A regra vale para os próximos registros; registros anteriores não são alterados.');
    }
    var podeAssinar = !!plat.billingEnabled && d.tipo !== 'isenta' && d.tipo !== 'legado' && st.perfil && st.perfil.role === 'admin' && d.tipo !== 'assinante' && d.tipo !== 'pagamento_pendente';
    planos.innerHTML = '<div class="v5-plans">' + PLANOS.map(function (p) {
      var atual = d.plano === p.id && (d.tipo === 'assinante' || d.tipo === 'pagamento_pendente');
      return '<div class="v5-plan' + (atual ? ' atual' : '') + '"><strong>' + esc(p.nome) + (atual ? ' <span class="badge bg-primary">atual</span>' : '') + '</strong>' +
        '<span class="preco">' + esc(p.preco) + '</span><small>' + esc(p.detalhe) + '</small>' +
        (p.vende && podeAssinar ? '<button type="button" class="btn btn-sm btn-primary mt-auto" data-pg-action="assinar" data-id="' + esc(p.id) + '">Assinar</button>' : '') + '</div>';
    }).join('') + '</div>' +
      (plat.billingEnabled ? '<p class="small text-muted mt-3 mb-0">Pagamento por cartão ou Pix Automático em página segura do provedor. O ProfGestor não armazena dados de cartão.</p>'
        : '<p class="small text-muted mt-3 mb-0">As assinaturas ainda não estão abertas. Durante o piloto nada é cobrado.</p>');
  };

  var ACOES = {
    'aula.pagamento': 'Pagamento de aula', 'aula.financeiro': 'Valor/status de aula alterado', 'aula.excluir': 'Aula excluída',
    'despesa.excluir': 'Despesa excluída', 'aluno.excluir': 'Aluno excluído', 'pacote.ajuste': 'Ajuste manual de crédito',
    'pacote.consumo': 'Crédito consumido', 'pacote.estorno': 'Crédito estornado', 'convite.liberar': 'Acesso ao portal liberado',
    'dados.exportar': 'Exportação de dados', 'regra.credito': 'Regra de pacotes alterada'
  };
  function detalheAuditoria(e) {
    var d = e.detalhes || {};
    if (e.action === 'aula.pagamento') return (d.de || '—') + ' → ' + (d.para || '—') + ' · ' + money(d.valor);
    if (e.action === 'aula.financeiro') return (d.de ? d.de.status + ' ' + money(d.de.valor) : '') + ' → ' + (d.para ? d.para.status + ' ' + money(d.para.valor) : '');
    if (e.action === 'aula.excluir' || e.action === 'despesa.excluir') return money(d.valor);
    if (e.action === 'pacote.ajuste') return (num(d.delta) < 0 ? 'consumo manual' : 'estorno manual');
    if (e.action === 'convite.liberar') return 'como ' + (d.papel || '');
    if (e.action === 'regra.credito') return d.faltaCobradaConsome ? 'falta cobrada consome crédito' : 'só presença consome crédito';
    if (e.action === 'dados.exportar') return Object.keys(d).map(function (k) { return k + ': ' + d[k]; }).join(', ');
    return '';
  }
  function carregarAuditoria() {
    var body = document.getElementById('v5Auditoria'); if (!body || !window.v5ListarAuditoria) return;
    body.innerHTML = '<tr><td colspan="3" class="text-muted text-center py-3">Carregando…</td></tr>';
    window.v5ListarAuditoria().then(function (itens) {
      body.innerHTML = itens.length ? itens.map(function (e) {
        return '<tr><td style="white-space:nowrap">' + esc(e.at ? new Date(e.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'agora') + '</td><td>' + esc(ACOES[e.action] || e.action) + '</td><td class="small">' + esc(detalheAuditoria(e)) + '</td></tr>';
      }).join('') : '<tr><td colspan="3" class="text-muted text-center py-3">Nenhuma alteração registrada ainda.</td></tr>';
    }).catch(function (err) {
      body.innerHTML = '<tr><td colspan="3" class="text-muted text-center py-3">' + (err && err.code === 'permission-denied' ? 'Disponível para o administrador da conta.' : 'Não foi possível carregar o histórico.') + '</td></tr>';
    });
  }

  document.addEventListener('show.bs.modal', function (ev) { if (ev.target && ev.target.id === 'modalConfig') lsSet('pg_onb_integracoes', '1'); });

  // Delegação de eventos (sem onclick com dados interpolados).
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('[data-pg-action]');
    if (!btn || btn.tagName === 'SELECT') return;
    var id = btn.getAttribute('data-id'), action = btn.getAttribute('data-pg-action');
    if (action === 'ir') {
      if (id === 'config') { var m = document.getElementById('modalConfig'); if (m && window.bootstrap) window.bootstrap.Modal.getOrCreateInstance(m).show(); }
      else if (window.showSection) window.showSection(id);
      renderOnboarding();
    }
    if (action === 'onb-ocultar') { lsSet('pg_onb_ocultar', '1'); renderOnboarding(); }
    if (action === 'auditoria') carregarAuditoria();
    if (action === 'exportar' && window.v5ExportarDados) {
      var st = document.getElementById('v5ExportStatus'); btn.disabled = true;
      window.v5ExportarDados().then(function (c) {
        if (st) st.textContent = 'Exportado: ' + Object.keys(c).map(function (k) { return c[k] + ' ' + k; }).join(', ') + '.';
        toast('Exportação concluída.', 'success');
      }).catch(function (e) { console.error(e); toast('Não foi possível exportar os dados.', 'error'); })
        .then(function () { btn.disabled = false; });
    }
    if ((action === 'assinar' || action === 'portal') && window.v5Assinar) {
      btn.disabled = true;
      (action === 'assinar' ? window.v5Assinar(id) : window.v5GerenciarAssinatura())
        .catch(function (e) { console.error(e); toast(e && e.message ? e.message : 'Não foi possível abrir a assinatura.', 'error'); btn.disabled = false; });
    }
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
    if (ev.target && ev.target.id === 'v5RegraFaltaCobrada' && window.v5SalvarRegraCredito) {
      var chk = ev.target; chk.disabled = true;
      window.v5SalvarRegraCredito(chk.checked).then(function () { toast('Regra de pacotes atualizada.', 'success'); })
        .catch(function (e) { console.error(e); chk.checked = !chk.checked; toast('Não foi possível alterar a regra.', 'error'); })
        .then(function () { chk.disabled = false; });
      return;
    }
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

  function renderAll() {
    renderDashboardV4(); window.renderAulasOperacao(); window.renderCRM();
    renderBanner(); renderOnboarding();
    var conta = document.getElementById('conta');
    if (conta && conta.classList.contains('active')) window.renderContaV5();
  }
  function boot() {
    bindCrmForm(); renderAll();
    document.addEventListener('profgestor:data', renderAll);
    setInterval(renderDashboardV4, 60000); // vira o dia / horários passam sem novos dados
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
