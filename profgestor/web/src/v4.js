const V4 = {
  money(v){ return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0)); },
  date(v, withTime=false){ if(!v) return '—'; const d=new Date(String(v).length===10?v+'T12:00:00':v); if(Number.isNaN(d.getTime())) return String(v); return new Intl.DateTimeFormat('pt-BR',withTime?{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}:{day:'2-digit',month:'short'}).format(d); },
  initials(name=''){ return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'AL'; },
  esc(s=''){ const d=document.createElement('div'); d.textContent=String(s??''); return d.innerHTML; },
  state(){ return window.__gestaoV4?.getState?.() || {alunos:[],eventos:[],despesas:[],pacotes:[],solicitacoes:[]}; }
};

function addNavGroups(){
  const ul=document.querySelector('#sidebar ul'); if(!ul || ul.dataset.v4Grouped) return; ul.dataset.v4Grouped='1';
  const before=(id,label)=>{ const a=document.getElementById(id); const li=a?.closest('li'); if(!li) return; const g=document.createElement('li'); g.className='v4-nav-group'; g.textContent=label; ul.insertBefore(g,li); };
  before('link-dashboard','Visão geral'); before('link-agenda','Operação'); before('link-financeiro','Negócio'); before('link-relatorios','Acompanhamento'); before('link-comunicacao','Comunicação');
  const pacote=document.getElementById('link-pacotes'); if(pacote) pacote.innerHTML='<span class="nav-icon"><i class="fas fa-layer-group"></i></span> Planos e Créditos';
  const com=document.getElementById('link-comunicacao'); if(com) com.innerHTML='<span class="nav-icon"><i class="fas fa-comments"></i></span> Mensagens & Portal';
  const brand=document.querySelector('.sidebar-brand span'); if(brand) brand.textContent='ProfGestor';
  const fbrand=document.querySelector('.family-brand'); if(fbrand) fbrand.innerHTML='<i class="fas fa-graduation-cap me-2"></i>ProfGestor · Portal';
}

function injectDashboardHero(){
  const dash=document.getElementById('dashboard'); if(!dash || dash.querySelector('.v4-dashboard-hero')) return;
  const now=new Date(); const hero=document.createElement('section'); hero.className='v4-dashboard-hero';
  hero.innerHTML=`<div><div class="v4-date">${new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).format(now)}</div><h1>Seu dia de aulas, em um só lugar.</h1><p>Agenda, pendências, recebimentos e acompanhamento pedagógico com prioridade clara.</p></div><div class="v4-hero-actions"><button class="btn btn-light btn-sm" onclick="abrirNovaAulaHoje()"><i class="fas fa-calendar-plus me-1"></i>Nova aula</button><button class="btn btn-outline-light btn-sm" onclick="showSection('alunos')"><i class="fas fa-user-plus me-1"></i>Alunos</button><button class="btn btn-outline-light btn-sm" onclick="showSection('financeiro')"><i class="fas fa-wallet me-1"></i>Financeiro</button></div>`;
  dash.insertBefore(hero,dash.firstChild);
  const strip=document.createElement('div'); strip.className='v4-kpi-strip'; strip.id='v4Kpis'; hero.after(strip);
}

function renderKpis(){
  const el=document.getElementById('v4Kpis'); if(!el) return; const s=V4.state(); const now=new Date(); const pad=n=>String(n).padStart(2,'0'); const today=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`; const month=today.slice(0,7);
  const aulasHoje=s.eventos.filter(e=>String(e.start||'').slice(0,10)===today && (e.statusAula||'agendada')!=='cancelada');
  const mes=s.eventos.filter(e=>String(e.start||'').slice(0,7)===month && (e.statusAula||'agendada')!=='cancelada');
  const recebido=mes.filter(e=>e.status==='pago').reduce((a,e)=>a+Number(e.valor||0),0); const pendente=mes.filter(e=>e.status!=='pago').reduce((a,e)=>a+Number(e.valor||0),0);
  const desp=s.despesas.filter(d=>String(d.data||'').slice(0,7)===month).reduce((a,d)=>a+Number(d.valor||0),0); const resultado=recebido-desp;
  const pendAcoes=s.solicitacoes.filter(x=>(x.status||'pendente')==='pendente').length;
  el.innerHTML=`<div class="v4-kpi"><span>Aulas hoje</span><strong>${aulasHoje.length}</strong><small>${aulasHoje.length?'operação do dia':'agenda livre'}</small></div><div class="v4-kpi"><span>Recebido no mês</span><strong>${V4.money(recebido)}</strong><small><span class="v4-status-dot"></span>caixa realizado</small></div><div class="v4-kpi"><span>A receber</span><strong>${V4.money(pendente)}</strong><small>previsto no mês</small></div><div class="v4-kpi"><span>Resultado</span><strong>${V4.money(resultado)}</strong><small>recebido − despesas</small></div><div class="v4-kpi"><span>Solicitações</span><strong>${pendAcoes}</strong><small>${pendAcoes?'aguardando ação':'tudo resolvido'}</small></div>`;
}

function ensureStudentModal(){
 if(document.getElementById('v4StudentModal')) return; const wrap=document.createElement('div'); wrap.innerHTML=`<div class="modal fade v4-student-modal" id="v4StudentModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"><div class="modal-content"><div id="v4StudentContent"></div></div></div></div>`; document.body.appendChild(wrap.firstElementChild);
}

window.abrirAluno360 = function(id){
  ensureStudentModal(); const s=V4.state(); const aluno=s.alunos.find(a=>a.id===id); if(!aluno) return;
  const lessons=s.eventos.filter(e=>e.alunoId===id).sort((a,b)=>String(a.start||'').localeCompare(String(b.start||''))); const now=new Date(); const futuras=lessons.filter(e=>new Date(e.start)>=now && (e.statusAula||'agendada')!=='cancelada'); const concluidas=lessons.filter(e=>e.statusAula==='realizada'); const presentes=lessons.filter(e=>e.presenca==='presente'||e.statusAula==='realizada'); const freq=concluidas.length?Math.round(presentes.length/concluidas.length*100):0;
  const pago=lessons.filter(e=>e.status==='pago'&&e.statusAula!=='cancelada').reduce((a,e)=>a+Number(e.valor||0),0); const pend=lessons.filter(e=>e.status!=='pago'&&e.statusAula!=='cancelada').reduce((a,e)=>a+Number(e.valor||0),0); const packs=s.pacotes.filter(p=>p.alunoId===id&&p.status==='ativo'); const saldo=packs.reduce((a,p)=>a+Math.max(0,Number(p.saldo??p.creditos??0)),0);
  const ultimos=[...lessons].reverse().filter(e=>e.conteudo||e.presenca||e.statusAula==='realizada').slice(0,4); const next=futuras[0]; const tel=String(aluno.tel||'').replace(/\D/g,'').replace(/^55/,'');
  document.getElementById('v4StudentContent').innerHTML=`<div class="v4-student-head"><div class="v4-student-head-row"><div class="v4-student-identity"><div class="v4-student-avatar">${V4.initials(aluno.nome)}</div><div><h2>${V4.esc(aluno.nome)}</h2><p>${V4.esc(aluno.materia||'Disciplina não informada')} · ${tel?V4.esc(tel):'sem telefone'}</p></div></div><button class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"></button></div></div><div class="v4-student-body"><div class="v4-360-grid"><div class="v4-360-metric"><span>Próxima aula</span><strong>${next?V4.date(next.start,true):'Sem agenda'}</strong></div><div class="v4-360-metric"><span>Frequência</span><strong>${freq}%</strong></div><div class="v4-360-metric"><span>Recebido</span><strong>${V4.money(pago)}</strong></div><div class="v4-360-metric"><span>Pendente</span><strong>${V4.money(pend)}</strong></div></div><div class="v4-360-cols"><div class="v4-360-card"><h3>Histórico recente</h3>${ultimos.length?ultimos.map(e=>`<div class="v4-timeline-item"><strong>${V4.date(e.start,true)} · ${V4.esc(e.statusAula||'aula')}</strong><small>${V4.esc(e.conteudo||e.obs||'Sem registro pedagógico')}</small></div>`).join(''):'<div class="text-muted small">Nenhum acompanhamento registrado.</div>'}</div><div class="v4-360-card"><h3>Ações rápidas</h3><button class="v4-action-link" onclick="window.v4AgendarAluno('${id}')"><i class="fas fa-calendar-plus me-2"></i>Agendar aula</button>${tel?`<a class="v4-action-link d-block text-decoration-none" target="_blank" href="https://wa.me/55${tel}"><i class="fab fa-whatsapp me-2"></i>Abrir WhatsApp</a>`:''}<button class="v4-action-link" onclick="window.v4FinanceiroAluno('${id}')"><i class="fas fa-wallet me-2"></i>Ver financeiro</button><button class="v4-action-link" onclick="window.v4PedagogicoAluno('${id}')"><i class="fas fa-graduation-cap me-2"></i>Acompanhamento</button><div class="mt-3 small text-muted"><strong>${lessons.length}</strong> aulas registradas · <strong>${saldo}</strong> créditos ativos</div></div></div></div>`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('v4StudentModal')).show();
};
window.v4AgendarAluno=(id)=>{ bootstrap.Modal.getInstance(document.getElementById('v4StudentModal'))?.hide(); window.abrirNovaAulaHoje?.(); setTimeout(()=>{const s=document.getElementById('eventoAluno'); if(s){s.value=id;s.dispatchEvent(new Event('change'));}},150); };
window.v4FinanceiroAluno=(id)=>{ bootstrap.Modal.getInstance(document.getElementById('v4StudentModal'))?.hide(); window.showSection?.('financeiro'); setTimeout(()=>{const s=document.getElementById('finAluno');if(s){s.value=id;window.renderFinanceiro?.();}},100); };
window.v4PedagogicoAluno=(id)=>{ bootstrap.Modal.getInstance(document.getElementById('v4StudentModal'))?.hide(); window.showSection?.('pedagogico'); setTimeout(()=>{const s=document.getElementById('pedAlunoFiltro');if(s){s.value=id;s.dispatchEvent(new Event('change'));}},100); };

function bootV4(){ addNavGroups(); injectDashboardHero(); ensureStudentModal(); renderKpis(); let tries=0; const warm=setInterval(()=>{renderKpis();tries++;const st=V4.state();if(st.alunos.length||tries>12)clearInterval(warm);},700); setInterval(renderKpis,30000); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bootV4); else bootV4();

