/* Escala 5x2 Inteligente — painel administrativo (só para administradores da plataforma). */
(function () {
  'use strict';
  var JA = window.JA, A = JA.A, V = JA.views, $ = JA.$, esc = JA.esc, brl = JA.brl;
  var TABS = [['resumo', 'Resumo'], ['leads', 'Leads'], ['clientes', 'Clientes'], ['planos', 'Planos e Kiwify'], ['pagamentos', 'Pagamentos'], ['config', 'Configurações']];
  var STATUS = { novo: 'Novo', contatado: 'Contatado', em_negociacao: 'Em negociação', ganho: 'Ganho', perdido: 'Perdido' };
  var PLAN_KEYS = ['gratuito', 'essencial', 'gestor', 'rede'];

  V.admin = function (tab) {
    if (!A.overview || !A.overview.is_admin) {
      $('#view').innerHTML = '<div class="auth"><div class="card stack"><h1 class="h2">Acesso restrito</h1><p class="muted">Esta área é exclusiva para administradores da plataforma.</p><a class="btn primary" href="#/app">Ir para o meu painel</a></div></div>';
      return;
    }
    if (TABS.map(function (t) { return t[0]; }).indexOf(tab) < 0) tab = 'resumo';
    $('#view').innerHTML = '<div class="wrap app"><header class="top"><span class="eyebrow">Administração</span><h1>Painel do Escala 5x2</h1></header>' +
      '<nav class="tabs" role="tablist">' + TABS.map(function (t) { return '<a role="tab" href="#/admin/' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + '</a>'; }).join('') + '</nav>' +
      '<div id="adminHost" class="stack"><p class="muted">Carregando...</p></div></div>';
    var el = $('#adminHost');
    ({ resumo: resumo, leads: leads, clientes: clientes, planos: planos, pagamentos: pagamentos, config: config })[tab](el);
  };
  function fail(el, e) { el.innerHTML = '<div class="alert bad">' + esc(JA.errMsg(e)) + '</div>'; }
  function kpi(label, val, sub) { return '<div class="card kpicard"><span class="muted small">' + label + '</span><b class="big2">' + val + '</b>' + (sub ? '<span class="small muted">' + sub + '</span>' : '') + '</div>'; }
  function num(v) { return (v == null ? 0 : v).toLocaleString('pt-BR'); }

  function resumo(el) {
    JA.rpc('e5_admin_overview').then(function (o) {
      var todo = [];
      if (!o.webhook_token_set) todo.push('Definir o token do webhook da Kiwify (aba Planos e Kiwify).');
      if (o.plans_without_product) todo.push(o.plans_without_product + ' plano(s) sem ID de produto Kiwify: pagamentos não serão associados.');
      if (o.plans_without_checkout) todo.push(o.plans_without_checkout + ' plano(s) sem link de checkout: o botão “Assinar” cai para o contato.');
      if (!(A.settings && A.settings.contact_whatsapp)) todo.push('Informar o WhatsApp de contato (aba Configurações).');
      var byStatus = Object.keys(STATUS).map(function (k) { return STATUS[k] + ': ' + ((o.leads_by_status || {})[k] || 0); }).join(' · ');
      var byPlan = Object.keys(o.workspaces_by_plan || {}).map(function (k) { return JA.planName(k) + ': ' + o.workspaces_by_plan[k]; }).join(' · ') || '-';
      el.innerHTML = (todo.length ? '<div class="card stack"><h2>Pendências de configuração</h2><ul class="todo">' + todo.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' : '<div class="alert good">Configuração completa: webhook, produtos e checkout definidos.</div>') +
        '<div class="grid3">' + kpi('Leads (total)', num(o.leads_total), num(o.leads_7d) + ' nos últimos 7 dias') + kpi('Usuários', num(o.users_total), num(o.users_7d) + ' nos últimos 7 dias') +
        kpi('Contas de empresa', num(o.workspaces_total), esc(byPlan)) + kpi('Assinantes ativos', num(o.paying), 'receita mensal estimada ' + brl(o.mrr_estimate)) +
        kpi('Eventos de pagamento (30 dias)', num(o.payments_30d), '') + kpi('Funil de leads', '', esc(byStatus)) + '</div>';
    }).catch(function (e) { fail(el, e); });
  }

  function leads(el) {
    var filter = '';
    function load() {
      JA.rpc('e5_admin_list_leads', { p_status: filter || null, p_limit: 200 }).then(function (rows) {
        rows = rows || [];
        el.innerHTML = '<div class="card stack"><div class="row" style="justify-content:space-between;align-items:center"><h2>Leads (' + rows.length + ')</h2>' +
          '<label class="f inline">Filtrar<select id="ld-f"><option value="">Todos</option>' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (filter === k ? ' selected' : '') + '>' + STATUS[k] + '</option>'; }).join('') + '</select></label></div>' +
          (rows.length ? rows.map(function (l) {
            var wa = String(l.whatsapp || '').replace(/\D/g, '');
            return '<div class="lead card2" data-id="' + l.id + '"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><b>' + esc(l.name) + '</b> · <a href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a>' +
              (wa ? ' · <a href="https://wa.me/' + (wa.length <= 11 ? '55' + wa : wa) + '" target="_blank" rel="noopener">' + esc(l.whatsapp) + '</a>' : '') +
              '<div class="small muted">' + esc([l.company, l.sector, l.employees ? l.employees + ' funcionários' : ''].filter(Boolean).join(' · ')) + ' · ' + JA.dtt(l.created_at) + ' · origem: ' + esc(l.source || '-') + '</div></div>' +
              '<select class="ld-status">' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (l.status === k ? ' selected' : '') + '>' + STATUS[k] + '</option>'; }).join('') + '</select></div>' +
              (l.message ? '<p class="small">“' + esc(l.message) + '”</p>' : '') +
              '<div class="row"><label class="f" style="flex:1 1 300px">Anotações<input class="ld-notes" maxlength="1000" value="' + esc(l.notes || '') + '"></label><button class="btn sm ld-save">Salvar</button></div></div>';
          }).join('') : '<p class="muted">Nenhum lead.</p>') + '</div>';
        $('#ld-f', el).addEventListener('change', function (ev) { filter = ev.target.value; load(); });
        el.onclick = function (ev) {
          var b = ev.target.closest('.ld-save'); if (!b) return;
          var box = b.closest('.lead');
          JA.rpc('e5_admin_update_lead', { p_id: box.dataset.id, p_status: $('.ld-status', box).value, p_notes: $('.ld-notes', box).value }).then(function () { JA.toast('Lead atualizado.'); }, function (e) { JA.toast(JA.errMsg(e), 'bad'); });
        };
      }).catch(function (e) { fail(el, e); });
    }
    load();
  }

  function clientes(el) {
    JA.rpc('e5_admin_list_workspaces', { p_limit: 300 }).then(function (rows) {
      rows = rows || [];
      el.innerHTML = '<div class="card stack"><h2>Contas de empresa (' + rows.length + ')</h2><p class="muted small">“Definir plano” concede acesso manual (por exemplo, pagamento fora da Kiwify ou cortesia) por um número de dias. 0 dias = sem vencimento.</p>' +
        '<div class="tablewrap"><table><thead><tr><th>Conta</th><th>Proprietário</th><th>Plano efetivo</th><th>Vence</th><th>Teste até</th><th class="r">Pessoas</th><th class="r">Escalas</th><th>Criada</th><th></th></tr></thead><tbody>' +
        rows.map(function (w) {
          return '<tr><td>' + esc(w.name) + '</td><td>' + esc(w.owner_email || '-') + '</td><td><span class="pill ' + (w.paid_plan_key ? 'good' : 'warn') + '">' + esc(JA.planName(w.plan)) + '</span></td><td>' + (w.paid_plan_key ? (w.paid_until ? JA.dt(w.paid_until) : 'sem vencimento') : '-') + '</td><td>' + JA.dt(w.trial_ends_at) + '</td><td class="r">' + num(w.people) + '</td><td class="r">' + num(w.schedules) + '</td><td>' + JA.dt(w.created_at) + '</td>' +
            '<td class="r"><button class="btn sm" data-ws="' + w.id + '" data-name="' + esc(w.name) + '">Definir plano</button></td></tr>';
        }).join('') + '</tbody></table></div></div>';
      el.onclick = function (ev) {
        var b = ev.target.closest('button[data-ws]'); if (!b) return;
        JA.modal({ title: 'Definir plano: ' + b.dataset.name, intro: 'Chaves: gratuito, essencial, gestor, rede. Dias: validade do acesso (0 = sem vencimento).', ok: 'Aplicar',
          fields: [{ name: 'plan', label: 'Plano (chave)', required: true, value: 'gestor', max: 20 }, { name: 'days', label: 'Dias de acesso', type: 'number', value: '30', max: 5 }],
          onSubmit: function (v) {
            if (PLAN_KEYS.indexOf(v.plan) < 0) throw new Error('Plano inválido. Use: ' + PLAN_KEYS.join(', '));
            return JA.rpc('e5_admin_set_workspace_plan', { p_ws: b.dataset.ws, p_plan: v.plan, p_days: parseInt(v.days, 10) || 0 }).then(function () { JA.toast('Plano aplicado.'); clientes(el); });
          } });
      };
    }).catch(function (e) { fail(el, e); });
  }

  function planos(el) {
    JA.rpc('e5_admin_get_plans').then(function (plans) {
      plans = plans || [];
      el.innerHTML = '<div class="card stack"><h2>Integração Kiwify</h2>' +
        '<ol class="small"><li>Na Kiwify, crie um produto (assinatura mensal) para cada plano pago: Essencial, Gestor e Rede.</li>' +
        '<li>Copie o <b>ID do produto</b> e o <b>link de checkout</b> de cada um para a tabela abaixo.</li>' +
        '<li>Em Kiwify › Apps › Webhooks, cadastre a URL abaixo, marque todos os eventos de compra, reembolso, atraso e cancelamento e use o mesmo token informado aqui.</li></ol>' +
        '<label class="f">URL do webhook (com o token no final)<div class="row" style="flex-wrap:nowrap"><input id="wh-url" readonly value="' + esc(JA.CFG.webhook + '?token=SEU_TOKEN') + '"><button class="btn" id="wh-copy">Copiar</button></div></label>' +
        '<form id="f-token" class="row"><label class="f" style="flex:1 1 300px">Token do webhook (guardado criptografado; não é exibido depois)<input name="token" type="password" autocomplete="off" minlength="16" maxlength="120" placeholder="mínimo de 16 caracteres"></label><button class="btn primary" type="submit">Salvar token</button><button class="btn" type="button" id="tk-gen">Gerar token</button></form></div>' +
        '<div class="card stack"><h2>Planos</h2><div class="tablewrap"><table><thead><tr><th>Plano</th><th>Preço/mês (R$)</th><th>ID do produto Kiwify</th><th>Link de checkout</th><th>Ativo</th><th></th></tr></thead><tbody>' +
        plans.map(function (p) {
          return '<tr data-k="' + p.key + '"><td><b>' + esc(p.name) + '</b><div class="small muted">' + p.max_people + ' pessoas · ' + p.max_teams + ' equipes · ' + p.max_companies + ' empresas</div></td>' +
            '<td><input class="pl-price" type="number" min="0" step="1" value="' + p.price_month + '" style="width:90px"></td>' +
            (p.key === 'gratuito' ? '<td class="muted">-</td><td class="muted">-</td>' : '<td><input class="pl-prod" value="' + esc(p.kiwify_product_id || '') + '" maxlength="120" style="min-width:210px"></td><td><input class="pl-url" value="' + esc(p.checkout_url || '') + '" maxlength="400" placeholder="https://pay.kiwify.com.br/..." style="min-width:260px"></td>') +
            '<td><input class="pl-act" type="checkbox"' + (p.active ? ' checked' : '') + ' style="width:auto"></td><td><button class="btn sm pl-save">Salvar</button></td></tr>';
        }).join('') + '</tbody></table></div></div>';
      $('#wh-copy', el).addEventListener('click', function () { JA.copy($('#wh-url').value, 'URL copiada'); });
      $('#tk-gen', el).addEventListener('click', function () {
        var a = new Uint8Array(24); crypto.getRandomValues(a);
        var t = Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
        var i = $('#f-token input', el); i.type = 'text'; i.value = t;
        $('#wh-url').value = JA.CFG.webhook + '?token=' + t;
      });
      $('#f-token', el).addEventListener('submit', function (ev) {
        ev.preventDefault(); var t = ev.target.token.value.trim();
        if (t.length < 16) { JA.toast('O token precisa ter ao menos 16 caracteres.', 'bad'); return; }
        JA.rpc('e5_admin_set_secret', { p_value: t }).then(function () { JA.toast('Token salvo. Cadastre a URL com este token na Kiwify.'); ev.target.token.value = ''; ev.target.token.type = 'password'; }, function (e) { JA.toast(JA.errMsg(e), 'bad'); });
      });
      el.addEventListener('click', function (ev) {
        var b = ev.target.closest('.pl-save'); if (!b) return;
        var tr = b.closest('tr'), k = tr.dataset.k, url = $('.pl-url', tr), prod = $('.pl-prod', tr);
        var u = url ? url.value.trim() : '';
        if (u && !/^https:\/\//i.test(u)) { JA.toast('O link de checkout deve começar com https://', 'bad'); return; }
        JA.rpc('e5_admin_set_plan', { p_key: k, p_price: parseFloat($('.pl-price', tr).value) || 0, p_checkout_url: u || null, p_product_id: prod ? prod.value.trim() || null : null, p_active: $('.pl-act', tr).checked })
          .then(function () { JA.toast('Plano salvo.'); loadPublic(); }, function (e) { JA.toast(JA.errMsg(e), 'bad'); });
      });
    }).catch(function (e) { fail(el, e); });
  }
  function loadPublic() { if (JA.loadPublicData) JA.loadPublicData(); }

  function pagamentos(el) {
    JA.rpc('e5_admin_list_payments', { p_limit: 200 }).then(function (rows) {
      rows = rows || [];
      el.innerHTML = '<div class="card stack"><h2>Eventos de pagamento (' + rows.length + ')</h2><p class="muted small">Cada notificação da Kiwify aparece aqui. “Não associado” indica produto desconhecido ou e-mail ausente: confira o ID do produto na aba Planos.</p>' +
        (rows.length ? '<div class="tablewrap"><table><thead><tr><th>Data</th><th>Evento</th><th>E-mail</th><th>Produto</th><th>Status</th><th>Processado</th><th>Nota</th></tr></thead><tbody>' +
          rows.map(function (r) {
            return '<tr><td>' + JA.dtt(r.created_at) + '</td><td>' + esc(r.event_type) + '</td><td>' + esc(r.email || '-') + '</td><td>' + esc(r.product_id || '-') + '</td><td>' + esc(r.status || '-') + '</td><td>' + (r.processed ? '<span class="pill good">sim</span>' : '<span class="pill warn">não associado</span>') + '</td><td class="small muted">' + esc(r.note || '') + '</td></tr>';
          }).join('') + '</tbody></table></div>' : '<p class="muted">Nenhum evento recebido ainda.</p>') + '</div>';
    }).catch(function (e) { fail(el, e); });
  }

  function config(el) {
    var s = A.settings || {};
    el.innerHTML = '<div class="card stack"><h2>Contato público</h2><p class="muted small">Usado nos botões “Falar com o Jair”, no rodapé e nas páginas legais.</p>' +
      '<form id="f-cfg" class="stack"><label class="f">WhatsApp (com DDD, só números)<input name="wa" value="' + esc(s.contact_whatsapp || '') + '" maxlength="20" inputmode="numeric" placeholder="21999999999"></label>' +
      '<label class="f">E-mail de contato<input name="mail" type="email" value="' + esc(s.contact_email || '') + '" maxlength="120"></label>' +
      '<div class="formmsg alert bad" hidden></div><div><button class="btn primary" type="submit">Salvar</button></div></form></div>';
    $('#f-cfg', el).addEventListener('submit', function (ev) {
      ev.preventDefault(); var f = ev.target, wa = f.wa.value.replace(/\D/g, ''), mail = f.mail.value.trim(), m = $('.formmsg', f);
      if (mail && !JA.validEmail(mail)) { m.hidden = false; m.textContent = 'E-mail inválido.'; return; }
      if (wa && (wa.length < 10 || wa.length > 13)) { m.hidden = false; m.textContent = 'WhatsApp deve ter DDD + número (10 a 13 dígitos).'; return; }
      Promise.all([JA.rpc('e5_admin_set_setting', { p_key: 'contact_whatsapp', p_value: wa }), JA.rpc('e5_admin_set_setting', { p_key: 'contact_email', p_value: mail })]).then(function () {
        A.settings.contact_whatsapp = wa; A.settings.contact_email = mail; m.hidden = true; JA.toast('Contato salvo.'); JA.renderChrome();
      }, function (e) { m.hidden = false; m.textContent = JA.errMsg(e); });
    });
  }
})();
