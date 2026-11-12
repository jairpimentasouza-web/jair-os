import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
        import { getFirestore, connectFirestoreEmulator, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, onSnapshot } 
        from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
        import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, sendEmailVerification, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
        import { getFunctions, httpsCallable, connectFunctionsEmulator } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-functions.js";
        import { getDoc, runTransaction, writeBatch, serverTimestamp, limit } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

        // Homologação local: em localhost com ?emulator=1 o app usa os emuladores e um projeto "demo-",
        // que o Firebase garante não corresponder a nenhum recurso real. Produção nunca é contatada.
        const USE_EMULATORS = ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).has('emulator');
        const firebaseConfig = USE_EMULATORS ? { apiKey: 'demo-key', authDomain: 'demo-profgestor.firebaseapp.com', projectId: 'demo-profgestor', appId: '1:000000000000:web:demo' } : {
          apiKey: "AIzaSyBA6M3uG6oqFmS8NEzoltlEqVwMnmXv13M",
          authDomain: "gestao-aulas-jair.firebaseapp.com",
          projectId: "gestao-aulas-jair",
          storageBucket: "gestao-aulas-jair.firebasestorage.app",
          messagingSenderId: "597994541414",
          appId: "1:597994541414:web:a57f2851372e4592f438a7",
          measurementId: "G-RZ0HZ8E1K0"
        };

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const auth = getAuth(app);
        const functions = getFunctions(app);
        if(USE_EMULATORS) {
            connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
            connectFirestoreEmulator(db, '127.0.0.1', 8080);
            connectFunctionsEmulator(functions, '127.0.0.1', 5001);
            document.title = '[EMULADOR] ' + document.title;
        }
        let usuarioAtual = null;
        let perfilAtual = null;
        // Flags públicas da plataforma (platformConfig/public, gravadas só pelo backend).
        let plataforma = { selfSignupOpen: false, billingEnabled: false, pixAulaEnabled: false };
        let organizacaoAtual = null;
        let organizacaoUnsub = null;
        const SIGNUP_KEY = 'profgestor_cadastro_pendente';
        let cadastroEmAndamento = false;
        // V5: o tenant vem do perfil. O fallback cobre apenas o perfil-admin legado do V4, criado antes
        // de organizationId existir; a migração V5 preenche o campo e torna o fallback inócuo.
        function currentOrgId() {
            if(perfilAtual?.organizationId) return perfilAtual.organizationId;
            return perfilAtual?.role === 'admin' ? 'org_jair' : '__sem_organizacao__';
        }

        let alunos = [];
        let eventos = [];
        let despesas = [];
        let pacotes = [];
        let solicitacoes = [];
        let leads = [];
        let calendar;
        let googleAccessToken = '';
        let googleTokenExpiresAt = 0;
        let googleTokenClient = null;
        let googleCalendarEvents = [];
        let googleCalendarLoading = false;
        let googleAutoRefreshTimer = null;
        let googleLastRefreshAt = 0;
        let googleLastError = '';
        const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
        const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
        const GOOGLE_CALENDAR_TIMEZONE = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'; } catch { return 'America/Sao_Paulo'; } })();
        const GOOGLE_HINT_KEY = 'profgestor_google_conectado_antes';
        const HORARIOS_PRESOS_KEY = 'gestaoAulas_horariosPresos_v1';
        const ORDEM_DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 0];
        const NOMES_DIAS_SEMANA = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb' };
        let horariosPresos = carregarHorariosPresos();
        let ultimoFinanceiroFiltrado = [];
        const initialDataLoads = new Set(['alunos', 'aulas', 'despesas']);
        let resolveInitialData;
        const initialDataReady = new Promise(resolve => { resolveInitialData = resolve; });
        function markInitialDataLoaded(collectionName) {
            initialDataLoads.delete(collectionName);
            if(initialDataLoads.size === 0) resolveInitialData?.();
        }

        // ============================
        // TOAST SYSTEM
        // ============================
        const toastIcons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
            warning: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };

        function showToast(msg, type = 'info', duration = 3500) {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = `custom-toast ${type}`;
            toast.innerHTML = `
                <i class="toast-icon ${toastIcons[type]}"></i>
                <span>${escapeHtml(msg)}</span>
                <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
            `;
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        // ============================
        // CONFIRM DIALOG
        // ============================
        function showConfirm(title, msg, onConfirm, type = 'danger') {
            const icons = { danger: 'fas fa-exclamation-triangle text-danger', warning: 'fas fa-question-circle text-warning', info: 'fas fa-info-circle text-primary' };
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-box">
                    <div class="confirm-icon"><i class="${icons[type] || icons.danger}"></i></div>
                    <div class="confirm-title">${title}</div>
                    <div class="confirm-msg">${msg}</div>
                    <div class="confirm-actions">
                        <button class="btn btn-ghost" id="confirmCancel">Cancelar</button>
                        <button class="btn btn-${type === 'danger' ? 'danger' : 'primary'}" id="confirmOk">Confirmar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.querySelector('#confirmCancel').onclick = () => overlay.remove();
            overlay.querySelector('#confirmOk').onclick = () => { overlay.remove(); onConfirm(); };
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        }

        // ============================
        // SIDEBAR / NAVIGATION
        // ============================
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('sidebarOverlay').classList.toggle('active');
        }
        function closeSidebar() {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebarOverlay').classList.remove('active');
        }
        window.toggleSidebar = toggleSidebar;
        window.closeSidebar = closeSidebar;

        // ============================
        // PREMIUM UX: THEME, COMMANDS AND GLOBAL SEARCH
        // ============================
        const THEME_KEY = 'gestaoAulas_theme_v1';
        function applyTheme(theme) {
            const dark = theme === 'dark';
            document.body.classList.toggle('theme-dark', dark);
            const icon = document.getElementById('themeIcon');
            if(icon) icon.className = dark ? 'fas fa-sun' : 'fas fa-moon';
            const button = icon?.closest('button');
            if(button) button.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
        }
        window.toggleTheme = () => {
            const next = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
            localStorage.setItem(THEME_KEY, next);
            applyTheme(next);
        };

        function executeCommand(command) {
            const palette = bootstrap.Modal.getInstance(document.getElementById('modalComandos'));
            palette?.hide();
            if(command === 'new-lesson') return window.abrirNovaAulaHoje();
            if(command === 'agenda') return window.showSection('agenda');
            if(command === 'student') {
                window.showSection('alunos');
                return setTimeout(() => document.getElementById('alunoNome')?.focus(), 120);
            }
            if(command === 'finance') return window.showSection('financeiro');
        }

        function openCommandPalette() {
            const modal = new bootstrap.Modal(document.getElementById('modalComandos'));
            modal.show();
        }

        function runGlobalSearch() {
            const field = document.getElementById('globalSearch');
            const term = (field?.value || '').trim();
            if(!term) return openCommandPalette();
            const normalized = normalizeSearch(term);
            const section = Object.entries(sectionTitles).find(([id, label]) => normalizeSearch(`${id} ${label}`).includes(normalized));
            if(section) { window.showSection(section[0]); field.value = ''; return; }
            const aluno = alunos.find(a => normalizeSearch(`${a.nome} ${a.materia}`).includes(normalized));
            if(aluno) {
                window.showSection('alunos');
                const busca = document.getElementById('buscaAluno');
                if(busca) { busca.value = aluno.nome; renderAlunos(); busca.focus(); }
                field.value = '';
                return;
            }
            const aula = eventos.find(e => normalizeSearch(`${e.alunoNome} ${e.title} ${e.local} ${e.obs}`).includes(normalized));
            if(aula) {
                window.showSection('agenda');
                const busca = document.getElementById('calBuscaFiltro');
                if(busca) { busca.value = term; renderCalendario(); busca.focus(); }
                field.value = '';
                return;
            }
            showToast('Nenhum resultado encontrado. Tente aluno, disciplina ou seção.', 'info');
        }

        function initPremiumInteractions() {
            applyTheme(localStorage.getItem(THEME_KEY) || 'light');
            document.querySelectorAll('[data-command]').forEach(el => el.addEventListener('click', () => executeCommand(el.dataset.command)));
            const globalSearch = document.getElementById('globalSearch');
            globalSearch?.addEventListener('keydown', event => { if(event.key === 'Enter') { event.preventDefault(); runGlobalSearch(); } });
            document.addEventListener('keydown', event => {
                const activeTag = document.activeElement?.tagName;
                const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag);
                if((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openCommandPalette(); }
                if(!typing && event.key.toLowerCase() === 'n') { event.preventDefault(); window.abrirNovaAulaHoje(); }
            });
        }

        const sectionTitles = {
            dashboard: 'Início',
            agenda: 'Agenda de Aulas',
            'aulas-operacao': 'Sala da Aula',
            alunos: 'Alunos',
            financeiro: 'Financeiro',
            crm: 'CRM de Novos Alunos',
            pedagogico: 'Central Pedagógica',
            pacotes: 'Planos e Pacotes',
            comunicacao: 'Mensagens & Automações',
            relatorios: 'Relatórios',
            conta: 'Conta e plano'
        };

        window.showSection = (id) => {
            document.querySelectorAll('.section-view').forEach(el => el.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            document.querySelectorAll('#sidebar a').forEach(el => el.classList.remove('active'));
            const link = document.getElementById('link-' + id);
            if (link) link.classList.add('active');
            document.getElementById('pageTitle').textContent = sectionTitles[id] || '';
            try { localStorage.setItem(`pg_onb_visitou_${id}`, '1'); } catch(e) {}
            if (id === 'conta') window.renderContaV5?.();
            closeSidebar();
            if (id === 'agenda' && calendar) { calendar.render(); if(hasValidGoogleToken()) refreshGoogleCalendarEvents({ silent: true }); }
            if (id === 'dashboard') renderDashboard();
            if (id === 'aulas-operacao') window.renderAulasOperacao?.();
            if (id === 'financeiro') renderFinanceiro();
            if (id === 'crm') window.renderCRM?.();
            if (id === 'pedagogico') renderPedagogico();
            if (id === 'pacotes') renderPacotes();
            if (id === 'comunicacao') { atualizarMensagem(); }
        }
        window.navKey = (event, id) => {
            if(event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                window.showSection(id);
            }
        }

        // ============================
        // CLOCK
        // ============================
        function updateClock() {
            const now = new Date();
            const opts = { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' };
            document.getElementById('clockDisplay').textContent = now.toLocaleDateString('pt-BR', opts);
        }
        setInterval(updateClock, 30000);

        // ============================
        // CONFIG (LocalStorage)
        // ============================
        const CONFIG_KEY = 'gestaoAulas_config_v1';

        function getConfig() {
            const raw = localStorage.getItem(CONFIG_KEY);
            const base = { escola: 'Aulas Particulares', professor: 'Professor', whatsapp: '', email: '', pix: '', msg: 'Qualquer dúvida, estou à disposição. Obrigado!', googleClientId: '', googleCalendarId: 'primary', googleAutoSync: true, googleBlockExternal: true, googleAutoRefreshMin: 5 };
            try { return raw ? { ...base, ...JSON.parse(raw) } : base; } catch(e) { return base; }
        }
        function setConfig(cfg) { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); }

        function preencherModalConfig() {
            const cfg = getConfig();
            const m = (id, key) => { const el = document.getElementById(id); if(el) el.value = cfg[key] || ''; };
            m('cfgEscola','escola'); m('cfgProfessor','professor'); m('cfgWhats','whatsapp'); m('cfgEmail','email'); m('cfgPix','pix'); m('cfgMsg','msg'); m('cfgGoogleClientId','googleClientId'); m('cfgGoogleCalendarId','googleCalendarId');
            const autoRefresh = document.getElementById('cfgGoogleAutoRefresh');
            if(autoRefresh) autoRefresh.value = String(cfg.googleAutoRefreshMin ?? 5);
            const autoSync = document.getElementById('cfgGoogleAutoSync');
            if(autoSync) autoSync.checked = cfg.googleAutoSync !== false;
            const blockExternal = document.getElementById('cfgGoogleBlockExternal');
            if(blockExternal) blockExternal.checked = cfg.googleBlockExternal !== false;
        }

        window.salvarConfig = () => {
            const cfg = getConfig();
            cfg.escola = (document.getElementById('cfgEscola')?.value || '').trim() || 'Aulas Particulares';
            cfg.professor = (document.getElementById('cfgProfessor')?.value || '').trim() || 'Professor';
            cfg.whatsapp = (document.getElementById('cfgWhats')?.value || '').replace(/\D/g,'');
            cfg.email = (document.getElementById('cfgEmail')?.value || '').trim();
            cfg.pix = (document.getElementById('cfgPix')?.value || '').trim();
            cfg.msg = (document.getElementById('cfgMsg')?.value || '').trim() || 'Qualquer dúvida, estou à disposição. Obrigado!';
            cfg.googleClientId = (document.getElementById('cfgGoogleClientId')?.value || '').trim();
            cfg.googleCalendarId = (document.getElementById('cfgGoogleCalendarId')?.value || '').trim() || 'primary';
            cfg.googleAutoSync = !!document.getElementById('cfgGoogleAutoSync')?.checked;
            cfg.googleBlockExternal = !!document.getElementById('cfgGoogleBlockExternal')?.checked;
            cfg.googleAutoRefreshMin = Math.max(0, Number(document.getElementById('cfgGoogleAutoRefresh')?.value || 0));
            setConfig(cfg);
            googleTokenClient = null;
            updateGoogleCalendarStatus();
            configureGoogleAutoRefresh();
            if(calendar) renderCalendario();
            try { bootstrap.Modal.getInstance(document.getElementById('modalConfig')).hide(); } catch(e) {}
            showToast('Configurações salvas!', 'success');
        }

        function initConfigBindings() {
            const el = document.getElementById('modalConfig');
            if(el) el.addEventListener('show.bs.modal', preencherModalConfig);
        }

        // ============================
        // INIT
        // ============================
        async function iniciarAplicacao() {
            initPremiumInteractions();
            initConfigBindings();
            initRecurrenceBindings();
            initQuickDefaults();
            initHorariosPresos();
            initCalendar();
            updateGoogleCalendarStatus();
            configureGoogleAutoRefresh();
            updateClock();
            carregarDados();
            initOperationalCollections();
            // onSnapshot é contínuo; aguarde seus primeiros retornos, mas não mantenha a tela bloqueada em caso de rede indisponível.
            await Promise.race([initialDataReady, new Promise(resolve => setTimeout(resolve, 8000))]);
            document.getElementById('loading').style.display = 'none';
        }

        function showLoginMessage(message) {
            const el = document.getElementById('loginMessage');
            if(el) { el.textContent = message; el.style.display = 'block'; }
        }
        function setAuthGate(open) {
            const gate = document.getElementById('authGate');
            if(gate) gate.style.display = open ? 'flex' : 'none';
        }
        function clearSensitiveUi() {
            alunos = []; eventos = []; despesas = []; pacotes = []; solicitacoes = [];
            calendar?.removeAllEvents();
            renderAlunos(); renderFinanceiro(); renderPacotes(); renderPedagogico();
        }
        let authPersona = 'professor';
        let modoCadastro = false;
        window.setAuthPersona = (persona) => {
            authPersona = persona === 'familia' ? 'familia' : 'professor';
            modoCadastro = false;
            document.getElementById('personaProfessor')?.classList.toggle('active', authPersona === 'professor');
            document.getElementById('personaFamilia')?.classList.toggle('active', authPersona === 'familia');
            atualizarModoAuth();
        };
        async function ativarPerfilFamilia(user, nome) {
            const email = String(user.email || '').trim().toLowerCase();
            const inviteRef = doc(db, 'convites', email);
            const profileRef = doc(db, 'usuarios', user.uid);
            await runTransaction(db, async transaction => {
                const convite = await transaction.get(inviteRef);
                if(!convite.exists() || convite.data().ativo !== true) throw new Error('Este e-mail ainda não foi liberado pelo professor.');
                const dados = convite.data();
                if(!['aluno','responsavel'].includes(dados.role) || !dados.alunoId) throw new Error('Convite inválido.');
                transaction.set(profileRef, { email, nome, role: dados.role, alunoId: dados.alunoId, organizationId: dados.organizationId || 'org_jair', ativo: true, createdAt: nowLocalISO(), updatedAt: nowLocalISO() });
            });
        }
        // O convite só vira acesso depois que o dono do e-mail confirma o link de verificação.
        // Isso impede que alguém que apenas saiba o e-mail convidado ative o portal antes do responsável.
        async function tentarAtivarFamiliaVerificada() {
            const user = auth.currentUser;
            if(!user) return false;
            try { await user.reload(); } catch(e) { console.warn(e); }
            if(!auth.currentUser?.emailVerified) {
                await signOut(auth);
                showLoginMessage('Confirme seu e-mail pelo link que enviamos e depois entre novamente.');
                return false;
            }
            try {
                await auth.currentUser.getIdToken(true);
                const emailAtual = String(auth.currentUser.email || '').toLowerCase();
                const convite = await getDoc(doc(db, 'convites', emailAtual)).catch(() => null);
                if(convite?.exists() && convite.data().ativo === true) {
                    await ativarPerfilFamilia(auth.currentUser, auth.currentUser.displayName || '');
                    return true;
                }
                if(authPersona === 'professor' && plataforma.selfSignupOpen === true) {
                    await criarOrganizacaoPropria(auth.currentUser);
                    return true;
                }
                throw new Error('Este e-mail ainda não foi liberado pelo professor.');
            } catch(error) {
                console.error(error);
                await signOut(auth);
                showLoginMessage(error?.message?.includes('liberado') ? error.message : 'Sua conta ainda não possui permissão de acesso.');
                return false;
            }
        }
        async function handleAuthState(user) {
            if(!user) {
                usuarioAtual = null; perfilAtual = null; organizacaoAtual = null;
                if(organizacaoUnsub) { organizacaoUnsub(); organizacaoUnsub = null; }
                clearSensitiveUi();
                document.getElementById('familyApp').style.display = 'none';
                document.getElementById('wrapper').style.display = 'flex';
                document.getElementById('loading').style.display = 'none';
                setAuthGate(true); return;
            }
            try {
                let profile = await getDoc(doc(db, 'usuarios', user.uid));
                if(auth.currentUser?.uid !== user.uid) return; // sessão mudou durante a leitura (ex.: logout após cadastro)
                if(!profile.exists()) {
                    if(cadastroEmAndamento) return;
                    if(!(await tentarAtivarFamiliaVerificada())) return;
                    profile = await getDoc(doc(db, 'usuarios', user.uid));
                }
                if(!profile.exists() || profile.data().ativo === false) {
                    await signOut(auth); showLoginMessage('Sua conta ainda não possui permissão de acesso.'); return;
                }
                const perfil = profile.data();
                if(!perfil.role || perfil.ativo !== true) { await signOut(auth); showLoginMessage('Perfil sem permissão.'); return; }
                usuarioAtual = user; perfilAtual = perfil; setAuthGate(false);
                if(['aluno','responsavel'].includes(perfil.role)) {
                    document.getElementById('wrapper').style.display = 'none';
                    document.getElementById('familyApp').style.display = 'block';
                    document.getElementById('loading').style.display = 'none';
                    await iniciarPortalFamilia(perfil, user); return;
                }
                document.getElementById('familyApp').style.display = 'none';
                document.getElementById('wrapper').style.display = 'flex';
                document.getElementById('userName').textContent = `${perfil.nome || user.email} · ${perfil.role}`;
                acompanharOrganizacao();
                await iniciarAplicacao();
            } catch(error) {
                console.error(error); if(cadastroEmAndamento || auth.currentUser?.uid !== user.uid) return;
                await signOut(auth); showLoginMessage('Não foi possível validar suas permissões. Tente novamente.');
            }
        }
        function atualizarModoAuth() {
            const family = authPersona === 'familia';
            const professorPodeCadastrar = !family && plataforma.selfSignupOpen === true;
            if(!family && !professorPodeCadastrar) modoCadastro = false;
            document.getElementById('registerNameGroup').hidden = !modoCadastro;
            document.getElementById('registerSchoolGroup').hidden = !(modoCadastro && !family);
            document.getElementById('authToggle').style.display = (family || professorPodeCadastrar) ? '' : 'none';
            if(!family && modoCadastro) {
                document.getElementById('authTitle').textContent = 'Criar conta de professor';
                document.getElementById('authSubtitle').textContent = '14 dias grátis, sem cartão. Enviaremos um link para confirmar o e-mail.';
                document.getElementById('loginButton').innerHTML = '<i class="fas fa-user-plus me-1"></i>Criar conta';
                document.getElementById('authToggle').textContent = 'Já tenho conta';
            } else if(!family) {
                document.getElementById('authToggle').textContent = 'Criar conta de professor — 14 dias grátis';
            }
            if(family) {
                document.getElementById('authTitle').textContent = modoCadastro ? 'Ativar acesso' : 'Aluno / Responsável';
                document.getElementById('authSubtitle').textContent = modoCadastro ? 'Use exatamente o e-mail liberado pelo professor e crie sua senha.' : 'Entre para consultar somente o acompanhamento do aluno vinculado.';
                document.getElementById('loginButton').innerHTML = modoCadastro ? '<i class="fas fa-user-plus me-1"></i>Criar senha e ativar' : '<i class="fas fa-lock me-1"></i>Entrar no portal';
                document.getElementById('authToggle').textContent = modoCadastro ? 'Já tenho acesso' : 'Ativar meu acesso';
            } else if(!modoCadastro) {
                document.getElementById('authTitle').textContent = 'Acesso do professor';
                document.getElementById('authSubtitle').textContent = 'Entre no painel administrativo para gerenciar agenda, alunos, financeiro e relatórios.';
                document.getElementById('loginButton').innerHTML = '<i class="fas fa-lock me-1"></i>Entrar como professor';
            }
            document.getElementById('loginPassword').autocomplete = modoCadastro ? 'new-password' : 'current-password';
        }
        function initAuthUi() {
            document.getElementById('loginForm').addEventListener('submit', async event => {
                event.preventDefault();
                const button = document.getElementById('loginButton');
                const email = document.getElementById('loginEmail').value.trim().toLowerCase();
                const password = document.getElementById('loginPassword').value;
                const nome = document.getElementById('registerName').value.trim();
                const escola = (document.getElementById('registerSchool')?.value || '').trim();
                if(modoCadastro && (!nome || password.length < 8)) { showLoginMessage('Informe seu nome e uma senha de ao menos 8 caracteres.'); return; }
                button.disabled = true; document.getElementById('loginMessage').style.display = 'none';
                try {
                    if(modoCadastro) {
                        cadastroEmAndamento = true;
                        if(authPersona === 'professor') { try { localStorage.setItem(SIGNUP_KEY, JSON.stringify({ email, nome, escola })); } catch(e) {} }
                        const credential = await createUserWithEmailAndPassword(auth, email, password);
                        await updateProfile(credential.user, { displayName: nome });
                        await sendEmailVerification(credential.user);
                        await signOut(auth);
                        cadastroEmAndamento = false; modoCadastro = false;
                        showLoginMessage(`Enviamos um link de confirmação para ${email}. Confirme o e-mail e depois entre com a senha criada.`);
                    } else { await signInWithEmailAndPassword(auth, email, password); }
                } catch(error) {
                    cadastroEmAndamento = false; console.error(error);
                    const msg = error?.message?.includes('liberado') ? error.message : 'Não foi possível concluir o acesso. Confira e-mail, senha e liberação.';
                    if(modoCadastro && auth.currentUser) await signOut(auth);
                    showLoginMessage(msg);
                } finally { button.disabled = false; atualizarModoAuth(); }
            });
            document.getElementById('authToggle').addEventListener('click', () => {
                if(authPersona !== 'familia' && !plataforma.selfSignupOpen) return;
                modoCadastro = !modoCadastro; atualizarModoAuth();
            });
            atualizarModoAuth(); onAuthStateChanged(auth, handleAuthState);
            carregarPlataforma();
        }
        window.sairDoSistema = () => signOut(auth);
        let authBootstrapStarted = false;
        function bootAuthUi() {
            if(authBootstrapStarted) return;
            authBootstrapStarted = true;
            try { initAuthUi(); } catch(error) {
                console.error('Falha no bootstrap de autenticação', error);
                document.getElementById('loading').style.display = 'none';
                setAuthGate(true);
                showLoginMessage('Não foi possível iniciar o login. Recarregue a página.');
            }
        }
        if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootAuthUi, { once:true });
        else queueMicrotask(bootAuthUi);
        setTimeout(() => {
            const loading = document.getElementById('loading');
            if(loading && getComputedStyle(loading).display !== 'none') {
                loading.style.display = 'none';
                setAuthGate(true);
            }
        }, 4500);

        async function iniciarPortalFamilia(perfil, user) {
            const alunoId = perfil.alunoId;
            const alunoSnap = await getDoc(doc(db, 'alunos', alunoId));
            if(!alunoSnap.exists()) throw new Error('Aluno vinculado não encontrado.');
            const aluno = { id: alunoSnap.id, ...alunoSnap.data() };
            const [aulasSnap, pacotesSnap, reqSnap, materiaisSnap] = await Promise.all([
                getDocs(query(collection(db, 'aulas'), where('alunoId', '==', alunoId), where('organizationId','==',currentOrgId()))),
                getDocs(query(collection(db, 'pacotes'), where('alunoId', '==', alunoId), where('organizationId','==',currentOrgId()))),
                getDocs(query(collection(db, 'solicitacoes'), where('alunoId', '==', alunoId), where('organizationId','==',currentOrgId()))),
                getDocs(query(collection(db, 'materiais'), where('alunoId', '==', alunoId), where('organizationId','==',currentOrgId())))
            ]);
            const aulas = aulasSnap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b)=>(parseLocalISO(a.start)||0)-(parseLocalISO(b.start)||0));
            const packs = pacotesSnap.docs.map(d => ({ id:d.id, ...d.data() }));
            const materiais = materiaisSnap.docs.map(d => ({ id:d.id, ...d.data() }));
            const requests = reqSnap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
            const now = new Date();
            const concluidas = aulas.filter(a => a.presenca || a.statusAula === 'realizada');
            const presentes = concluidas.filter(a => a.presenca === 'presente' || (a.statusAula === 'realizada' && !a.presenca));
            const frequencia = concluidas.length ? Math.round(presentes.length / concluidas.length * 100) : 0;
            const proximas = aulas.filter(a => parseLocalISO(a.start) >= now && (a.statusAula || 'agendada') !== 'cancelada');
            const pendentes = aulas.filter(a => a.status !== 'pago' && (a.statusAula || 'agendada') !== 'cancelada');
            const totalPendente = pendentes.reduce((sum,a)=>sum+Number(a.valor||0),0);
            const totalPago = aulas.filter(a => a.status === 'pago' && a.statusAula !== 'cancelada').reduce((sum,a)=>sum+Number(a.valor||0),0);
            const saldoCreditos = packs.filter(p => p.status === 'ativo').reduce((sum,p)=>sum+Math.max(0,Number(p.creditosTotal||0)-Number(p.creditosUsados||0)),0);
            window._familyAlunoNome = aluno.nome || 'Aluno';
            document.getElementById('familyUserName').textContent = `${perfil.nome || user.email} · ${perfil.role}`;
            document.getElementById('familyStudentName').textContent = aluno.nome || 'Aluno';
            document.getElementById('familyStudentSubject').textContent = `${aluno.materia || 'Acompanhamento'} · acesso individual e seguro`;
            document.getElementById('familyMetrics').innerHTML = `
                <div class="family-card"><div class="small text-muted">Frequência</div><strong class="h4">${frequencia}%</strong></div>
                <div class="family-card"><div class="small text-muted">Aulas concluídas</div><strong class="h4">${concluidas.length}</strong></div>
                <div class="family-card"><div class="small text-muted">Créditos ativos</div><strong class="h4">${saldoCreditos}</strong></div>`;
            const lessonHtml = (list) => list.length ? list.map(a => `<div class="family-list-item"><strong>${escapeHtml(formatData(String(a.start||'').split('T')[0]))} · ${escapeHtml(isoToHHMM(a.start))}</strong><div class="small text-muted">${escapeHtml(a.modalidade || 'aula')} ${a.local ? '· '+escapeHtml(a.local) : ''}</div><span class="badge bg-light text-dark mt-1">${escapeHtml(a.statusAula || 'agendada')}</span></div>`).join('') : '<p class="text-muted mb-0">Nenhuma aula encontrada.</p>';
            document.getElementById('familyNextLessons').innerHTML = lessonHtml(proximas.slice(0,4));
            document.getElementById('familyAgenda').innerHTML = lessonHtml(aulas.slice().reverse().slice(0,20));
            const registros = aulas.filter(a => a.conteudo || a.tarefa || a.proximaAcao).slice().reverse().slice(0,10);
            document.getElementById('familyProgress').innerHTML = registros.length ? registros.map(a => `<div class="family-list-item"><strong>${escapeHtml(formatData(String(a.start||'').split('T')[0]))}</strong>${a.conteudo?`<div><b>Conteúdo:</b> ${escapeHtml(a.conteudo)}</div>`:''}${a.tarefa?`<div><b>Tarefa:</b> ${escapeHtml(a.tarefa)}</div>`:''}${a.proximaAcao?`<div><b>Próximo passo:</b> ${escapeHtml(a.proximaAcao)}</div>`:''}</div>`).join('') : '<p class="text-muted mb-0">Ainda não há registros pedagógicos publicados.</p>';
            document.getElementById('familyMaterials').innerHTML = materiais.length ? materiais.map(m => `<div class="family-list-item"><strong>${escapeHtml(m.titulo||m.nome||'Material')}</strong>${m.descricao?`<div class="small text-muted">${escapeHtml(m.descricao)}</div>`:''}${m.url?`<a class="btn btn-sm btn-outline-primary mt-2" target="_blank" rel="noopener" href="${escapeHtml(m.url)}">Abrir material</a>`:''}</div>`).join('') : '<p class="text-muted mb-0">Nenhum material publicado.</p>';
            const tarefas = aulas.filter(a=>String(a.tarefa||'').trim()).slice().reverse();
            document.getElementById('familyTasks').innerHTML = tarefas.length ? tarefas.slice(0,20).map(a=>`<div class="family-list-item"><strong>${escapeHtml(formatData(String(a.start||'').split('T')[0]))}</strong><div>${escapeHtml(a.tarefa)}</div></div>`).join('') : '<p class="text-muted mb-0">Nenhuma tarefa pendente.</p>';
            document.getElementById('familyFinanceMetrics').innerHTML = `<div class="family-card"><div class="small text-muted">Pago</div><strong class="h4 text-success">${formatMoney(totalPago)}</strong></div><div class="family-card"><div class="small text-muted">Pendente</div><strong class="h4 text-warning">${formatMoney(totalPendente)}</strong></div><div class="family-card"><div class="small text-muted">Aulas pendentes</div><strong class="h4">${pendentes.length}</strong></div>`;
            document.getElementById('familyFinanceList').innerHTML = aulas.slice().reverse().slice(0,20).map(a => `<div class="family-list-item d-flex justify-content-between gap-2"><div><strong>${escapeHtml(formatData(String(a.start||'').split('T')[0]))}</strong><div class="small text-muted">${escapeHtml(a.statusAula || 'agendada')}</div></div><div class="text-end"><strong>${formatMoney(Number(a.valor||0))}</strong><div class="small ${a.status==='pago'?'text-success':'text-warning'}">${a.status==='pago'?'Pago':'Pendente'}</div></div></div>`).join('') || '<p class="text-muted mb-0">Sem lançamentos.</p>';
            const reqSelect = document.getElementById('familyRequestLesson');
            reqSelect.innerHTML = '<option value="">Selecione uma aula</option>' + proximas.slice(0,12).map(a => `<option value="${escapeHtml(a.id)}">${escapeHtml(formatData(String(a.start||'').split('T')[0]))} · ${escapeHtml(isoToHHMM(a.start))}</option>`).join('');
            document.getElementById('familyRequests').innerHTML = requests.length ? requests.slice(0,10).map(r => `<div class="family-list-item"><strong>${escapeHtml(String(r.tipo||'solicitação').replace('_',' '))}</strong><div class="small text-muted">${escapeHtml(r.status||'pendente')} ${r.mensagem?'· '+escapeHtml(r.mensagem):''}</div></div>`).join('') : '<p class="text-muted mb-0">Nenhuma solicitação enviada.</p>';
            document.querySelectorAll('.family-tab').forEach(btn => btn.onclick = () => {
                document.querySelectorAll('.family-tab').forEach(x=>x.classList.remove('active')); btn.classList.add('active');
                document.querySelectorAll('.family-pane').forEach(x=>x.classList.remove('active'));
                document.getElementById('family-'+btn.dataset.familyTab)?.classList.add('active');
            });
        }
        window.enviarSolicitacaoFamilia = async () => {
            if(!usuarioAtual || !perfilAtual?.alunoId) return;
            const aulaId = document.getElementById('familyRequestLesson').value;
            const tipo = document.getElementById('familyRequestType').value;
            const mensagem = document.getElementById('familyRequestMessage').value.trim();
            if(!aulaId) { alert('Selecione uma aula.'); return; }
            await addDoc(collection(db,'solicitacoes'), { organizationId: currentOrgId(), alunoId:perfilAtual.alunoId, alunoNome:window._familyAlunoNome || 'Aluno', aulaId, tipo, mensagem, status:'pendente', criadoPorUid:usuarioAtual.uid, createdAt:nowLocalISO() });
            document.getElementById('familyRequestMessage').value='';
            await iniciarPortalFamilia(perfilAtual, usuarioAtual);
        };
        function initCalendar() {
            const calendarEl = document.getElementById('calendar');
            calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'timeGridWeek',
                locale: 'pt-br',
                headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
                slotMinTime: '07:00:00',
                slotMaxTime: '22:00:00',
                allDaySlot: false,
                editable: true,
                selectable: true,
                height: 'auto',
                buttonText: { today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia' },
                select: (info) => tratarSelecaoCalendario(info),
                eventClick: (info) => {
                    if(info.event.extendedProps.horarioPreso) abrirHorariosPresos(info.event.extendedProps.horarioPresoId);
                    else if(info.event.extendedProps.googleExternal) {
                        const link = info.event.extendedProps.htmlLink;
                        if(link) window.open(link, '_blank', 'noopener');
                    } else window.abrirModalEvento(info.event);
                },
                eventDrop: async (info) => await atualizarDataEvento(info),
                eventResize: async (info) => await atualizarDataEvento(info),
                datesSet: () => { if(hasValidGoogleToken()) refreshGoogleCalendarEvents({ silent: true }); }
            });
            calendar.render();
        }

        // ============================
        // GOOGLE CALENDAR INTEGRATION
        // O Firestore continua sendo a fonte principal das aulas.
        // O Google Calendar funciona como espelho + camada de indisponibilidade.
        // ============================
        function googleCalendarConfig() {
            const cfg = getConfig();
            return { clientId: String(cfg.googleClientId || '').trim(), calendarId: String(cfg.googleCalendarId || 'primary').trim() || 'primary' };
        }

        function googleReconnectNeeded() {
            try { return localStorage.getItem(GOOGLE_HINT_KEY) === '1' && !!googleCalendarConfig().clientId; } catch(e) { return false; }
        }
        function hasValidGoogleToken() {
            return !!googleAccessToken && Date.now() < (googleTokenExpiresAt - 60_000);
        }

        function googleOperationsSummary() {
            const linked = eventos.filter(aula => !!aula.googleCalendarEventId && aula.googleCalendarSyncStatus !== 'erro');
            const errors = eventos.filter(aula => aula.googleCalendarSyncStatus === 'erro');
            const linkedIds = new Set(eventos.map(aula => aula.googleCalendarEventId).filter(Boolean));
            const external = googleCalendarEvents.filter(item => !linkedIds.has(item.id) && !isGoogleEventLinkedToAula(item));
            const now = new Date();
            const conflicts = eventos.filter(aula => {
                if((aula.statusAula || 'agendada') === 'cancelada') return false;
                const start = parseLocalISO(aula.start);
                const end = parseLocalISO(aula.end);
                if(!start || !end || end < now) return false;
                const externalConflict = external.some(item => {
                    const interval = googleEventInterval(item);
                    return interval && start < interval.end && end > interval.start;
                });
                return externalConflict || findFixedScheduleConflicts(start, end).length > 0;
            }).length;
            const latestLessonSync = eventos.reduce((latest, aula) => Math.max(latest, new Date(aula.googleCalendarSyncAt || 0).getTime() || 0), 0);
            return { linked: linked.length, errors: errors.length, external: external.length, localBlocks: horariosPresos.length, conflicts, lastSyncAt: Math.max(googleLastRefreshAt, latestLessonSync) };
        }

        function formatGoogleSyncMoment(timestamp) {
            if(!timestamp) return 'Ainda não atualizada';
            const date = new Date(timestamp);
            if(isNaN(date.getTime())) return '—';
            return date.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
        }

        function renderGoogleCalendarOperations() {
            const connected = hasValidGoogleToken();
            const summary = googleOperationsSummary();
            const status = document.getElementById('dashGoogleStatus');
            const statusText = document.getElementById('dashGoogleStatusText');
            const note = document.getElementById('dashGoogleNote');
            const connect = document.getElementById('btnDashGoogleConnect');
            const refresh = document.getElementById('btnDashGoogleRefresh');
            const sync = document.getElementById('btnDashGoogleSync');
            const recover = document.getElementById('btnDashGoogleRecover');
            document.getElementById('dashGoogleLastSync')?.replaceChildren(document.createTextNode(formatGoogleSyncMoment(summary.lastSyncAt)));
            document.getElementById('dashGoogleSynced')?.replaceChildren(document.createTextNode(String(summary.linked)));
            document.getElementById('dashGoogleBlocks')?.replaceChildren(document.createTextNode(String(summary.external + summary.localBlocks)));
            document.getElementById('dashGoogleAlerts')?.replaceChildren(document.createTextNode(`${summary.conflicts} / ${summary.errors}`));
            status?.classList.toggle('connected', connected);
            status?.classList.toggle('attention', connected && !!(summary.errors || googleLastError));
            if(statusText) statusText.textContent = connected ? (summary.errors || googleLastError ? 'Conectado — atenção necessária' : 'Google conectado') : (googleReconnectNeeded() ? 'Google: reconexão necessária' : 'Google desconectado');
            if(connect) connect.innerHTML = connected ? '<i class="fas fa-unlink me-1"></i>Desconectar' : '<i class="fab fa-google me-1"></i>Conectar Google';
            if(refresh) refresh.style.display = connected ? '' : 'none';
            if(sync) sync.style.display = connected ? '' : 'none';
            if(recover) recover.style.display = connected && summary.errors ? '' : 'none';
            if(note) {
                if(!connected) note.textContent = 'Conecte sua conta para atualizar indisponibilidades e sincronizar aulas futuras.';
                else if(googleLastError) note.textContent = `Última tentativa: ${googleLastError}`;
                else if(summary.errors) note.textContent = `${summary.errors} aula(s) com falha registrada. Use “Recuperar falhas” para tentar novamente.`;
                else note.textContent = `${summary.external} compromisso(s) externo(s) e ${summary.localBlocks} bloqueio(s) local(is) considerados na agenda.`;
            }
        }

        function updateGoogleCalendarStatus() {
            const connected = hasValidGoogleToken();
            const status = document.getElementById('googleCalendarStatus');
            const text = document.getElementById('googleCalendarStatusText');
            const btnConnect = document.getElementById('btnGoogleConnect');
            const btnSync = document.getElementById('btnGoogleSync');
            const btnRefresh = document.getElementById('btnGoogleRefresh');
            const btnMigrate = document.getElementById('btnMigrarHorariosGoogle');
            const externalCount = googleCalendarFullCalendarEvents().length;
            status?.classList.toggle('connected', connected);
            if(text) text.textContent = connected ? `Google conectado${externalCount ? ` • ${externalCount} bloqueio(s)` : ''}` : (googleReconnectNeeded() ? 'Google: reconexão necessária' : 'Google desconectado');
            if(btnConnect) btnConnect.innerHTML = connected ? '<i class="fab fa-google me-1"></i>Desconectar' : '<i class="fab fa-google me-1"></i>Conectar Google';
            if(btnSync) btnSync.style.display = connected ? '' : 'none';
            if(btnRefresh) btnRefresh.style.display = connected ? '' : 'none';
            if(btnMigrate) btnMigrate.style.display = connected && horariosPresos.length ? '' : 'none';
            renderGoogleCalendarOperations();
        }

        function configureGoogleAutoRefresh() {
            if(googleAutoRefreshTimer) {
                clearInterval(googleAutoRefreshTimer);
                googleAutoRefreshTimer = null;
            }
            if(!hasValidGoogleToken()) return;
            const cfg = getConfig();
            const minutes = Math.max(0, Number(cfg.googleAutoRefreshMin || 0));
            if(!minutes) return;
            googleAutoRefreshTimer = setInterval(() => {
                if(document.visibilityState === 'visible' && hasValidGoogleToken()) {
                    refreshGoogleCalendarEvents({ silent: true });
                }
            }, minutes * 60_000);
        }

        async function refreshGoogleCalendarWhenRelevant() {
            if(!hasValidGoogleToken()) return;
            const cfg = getConfig();
            const minGap = Math.max(30_000, Math.min(120_000, Number(cfg.googleAutoRefreshMin || 5) * 30_000));
            if(Date.now() - googleLastRefreshAt < minGap) return;
            await refreshGoogleCalendarEvents({ silent: true });
        }

        document.addEventListener('visibilitychange', () => {
            if(document.visibilityState === 'visible') refreshGoogleCalendarWhenRelevant();
        });
        window.addEventListener('focus', () => refreshGoogleCalendarWhenRelevant());

        function waitForGoogleIdentity(timeoutMs = 10_000) {
            return new Promise((resolve, reject) => {
                const started = Date.now();
                const timer = setInterval(() => {
                    if(window.google?.accounts?.oauth2) { clearInterval(timer); resolve(window.google.accounts.oauth2); return; }
                    if(Date.now() - started > timeoutMs) { clearInterval(timer); reject(new Error('Google Identity Services não carregou.')); }
                }, 80);
            });
        }

        async function requestGoogleAccessToken(prompt = 'consent') {
            const { clientId } = googleCalendarConfig();
            if(!clientId) throw new Error('Configure o OAuth Client ID do Google em Configurações.');
            const oauth2 = await waitForGoogleIdentity();
            if(!googleTokenClient) {
                googleTokenClient = oauth2.initTokenClient({
                    client_id: clientId,
                    scope: GOOGLE_CALENDAR_SCOPE,
                    callback: () => {}
                });
            }
            return new Promise((resolve, reject) => {
                googleTokenClient.callback = response => {
                    if(response?.error) { reject(new Error(response.error_description || response.error)); return; }
                    googleAccessToken = response.access_token || '';
                    googleTokenExpiresAt = Date.now() + (Number(response.expires_in || 3600) * 1000);
                    try { localStorage.setItem(GOOGLE_HINT_KEY, '1'); } catch(e) {}
                    updateGoogleCalendarStatus();
                    resolve(googleAccessToken);
                };
                googleTokenClient.error_callback = error => reject(new Error(error?.message || error?.type || 'Falha na autorização do Google.'));
                googleTokenClient.requestAccessToken({ prompt });
            });
        }

        async function googleApiFetch(path, options = {}, retry = true) {
            if(!hasValidGoogleToken()) throw new Error('Google Calendar não conectado.');
            const response = await fetch(`${GOOGLE_CALENDAR_API}${path}`, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${googleAccessToken}`,
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                }
            });
            if(response.status === 401 && retry) {
                googleAccessToken = '';
                googleTokenExpiresAt = 0;
                updateGoogleCalendarStatus();
                await requestGoogleAccessToken('');
                return googleApiFetch(path, options, false);
            }
            if(response.status === 204) return null;
            const body = await response.json().catch(() => ({}));
            if(!response.ok) {
                const message = body?.error?.message || `Google Calendar respondeu ${response.status}.`;
                throw new Error(message);
            }
            return body;
        }

        function googleEventInterval(item) {
            if(!item?.start || !item?.end) return null;
            const start = item.start.dateTime ? new Date(item.start.dateTime) : new Date(`${item.start.date}T00:00:00`);
            const end = item.end.dateTime ? new Date(item.end.dateTime) : new Date(`${item.end.date}T00:00:00`);
            if(isNaN(start.getTime()) || isNaN(end.getTime())) return null;
            return { start, end };
        }

        function isGoogleEventLinkedToAula(item, aulaId = '') {
            const linked = item?.extendedProperties?.private?.firebaseAulaId || '';
            if(!linked) return false;
            if(aulaId) return linked === aulaId;
            return eventos.some(aula => aula.id === linked);
        }

        async function listGoogleEvents(start, end) {
            const { calendarId } = googleCalendarConfig();
            const params = new URLSearchParams({
                timeMin: start.toISOString(),
                timeMax: end.toISOString(),
                singleEvents: 'true',
                orderBy: 'startTime',
                showDeleted: 'false',
                maxResults: '2500'
            });
            const data = await googleApiFetch(`/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`, { method: 'GET' });
            return Array.isArray(data?.items) ? data.items.filter(item => item.status !== 'cancelled') : [];
        }

        async function refreshGoogleCalendarEvents({ silent = false } = {}) {
            if(!hasValidGoogleToken() || !calendar || googleCalendarLoading) return;
            googleCalendarLoading = true;
            try {
                const start = calendar.view?.activeStart || new Date();
                const end = calendar.view?.activeEnd || new Date(Date.now() + 7 * 86400000);
                googleCalendarEvents = await listGoogleEvents(start, end);
                googleLastRefreshAt = Date.now();
                googleLastError = '';
                updateGoogleCalendarStatus();
                renderCalendario();
            } catch(error) {
                console.error('Google Calendar:', error);
                googleLastError = String(error?.message || error).slice(0, 180);
                updateGoogleCalendarStatus();
                if(!silent) showToast(`Google Calendar: ${error.message}`, 'error', 6000);
                if(!silent) throw error;
            } finally {
                googleCalendarLoading = false;
            }
        }

        async function findGoogleCalendarConflictsRemote(start, end, ignoreAulaId = '') {
            if(!hasValidGoogleToken() || getConfig().googleBlockExternal === false) return [];
            try {
                const items = await listGoogleEvents(start, end);
                return items.flatMap(item => {
                    if(isGoogleEventLinkedToAula(item, ignoreAulaId)) return [];
                    const interval = googleEventInterval(item);
                    if(!interval || !(start < interval.end && end > interval.start)) return [];
                    return [{
                        conflictType: 'googleCalendar',
                        googleEventId: item.id,
                        title: item.summary || 'Compromisso no Google Calendar',
                        start: interval.start,
                        end: interval.end
                    }];
                });
            } catch(error) {
                console.warn('Não foi possível consultar conflitos no Google Calendar.', error);
                return [];
            }
        }

        function googlePayloadFromAula(aula) {
            const cfg = getConfig();
            const aluno = alunos.find(item => item.id === aula.alunoId);
            const descricao = [
                `Aula particular${aluno?.materia ? ` de ${aluno.materia}` : ''}.`,
                aula.modalidade ? `Modalidade: ${aula.modalidade}.` : '',
                aula.obs ? `Observações: ${aula.obs}` : '',
                `Gerenciado pelo sistema de aulas particulares${cfg.professor ? ` de ${cfg.professor}` : ''}.`
            ].filter(Boolean).join('\n');
            return {
                summary: `Aula particular — ${aula.alunoNome || aluno?.nome || 'Aluno'}`,
                description: descricao,
                location: aula.local || '',
                start: { dateTime: parseLocalISO(aula.start)?.toISOString(), timeZone: GOOGLE_CALENDAR_TIMEZONE },
                end: { dateTime: parseLocalISO(aula.end)?.toISOString(), timeZone: GOOGLE_CALENDAR_TIMEZONE },
                extendedProperties: { private: { firebaseAulaId: aula.id, origem: 'gestao-aulas-jair' } },
                reminders: { useDefault: true }
            };
        }

        async function deleteGoogleEventById(eventId) {
            if(!eventId || !hasValidGoogleToken()) return false;
            const { calendarId } = googleCalendarConfig();
            try {
                await googleApiFetch(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=none`, { method: 'DELETE' });
                return true;
            } catch(error) {
                if(/not found|404/i.test(error.message)) return true;
                throw error;
            }
        }

        async function syncAulaToGoogle(aula, { interactive = false } = {}) {
            if(!aula?.id) return { synced: false, reason: 'Aula sem ID.' };
            if(!hasValidGoogleToken()) {
                if(!interactive) return { synced: false, reason: 'Google desconectado.' };
                await requestGoogleAccessToken('consent');
            }
            const docRef = doc(db, 'aulas', aula.id);
            try {
                if((aula.statusAula || 'agendada') === 'cancelada') {
                    if(aula.googleCalendarEventId) await deleteGoogleEventById(aula.googleCalendarEventId);
                    await updateDoc(docRef, {
                        googleCalendarEventId: null,
                        googleCalendarHtmlLink: null,
                        googleCalendarSyncAt: nowLocalISO(),
                        googleCalendarSyncStatus: 'cancelada',
                        googleCalendarSyncError: null
                    });
                    return { synced: true, deleted: true };
                }
                const payload = googlePayloadFromAula(aula);
                if(!payload.start.dateTime || !payload.end.dateTime) throw new Error('Data da aula inválida para o Google Calendar.');
                const { calendarId } = googleCalendarConfig();
                let result;
                if(aula.googleCalendarEventId) {
                    result = await googleApiFetch(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(aula.googleCalendarEventId)}?sendUpdates=none`, { method: 'PATCH', body: JSON.stringify(payload) });
                } else {
                    result = await googleApiFetch(`/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=none`, { method: 'POST', body: JSON.stringify(payload) });
                }
                await updateDoc(docRef, {
                    googleCalendarEventId: result.id,
                    googleCalendarHtmlLink: result.htmlLink || null,
                    googleCalendarSyncAt: nowLocalISO(),
                    googleCalendarSyncStatus: 'sincronizado',
                    googleCalendarSyncError: null
                });
                googleLastError = '';
                return { synced: true, eventId: result.id };
            } catch(error) {
                googleLastError = String(error?.message || error).slice(0, 180);
                try {
                    await updateDoc(docRef, {
                        googleCalendarSyncAt: nowLocalISO(),
                        googleCalendarSyncStatus: 'erro',
                        googleCalendarSyncError: String(error?.message || error).slice(0, 240)
                    });
                } catch(markError) {
                    console.warn('Não foi possível registrar o erro de sincronização.', markError);
                }
                throw error;
            }
        }

        function googleCalendarFullCalendarEvents() {
            if(getConfig().googleBlockExternal === false) return [];
            const linkedIds = new Set(eventos.map(e => e.googleCalendarEventId).filter(Boolean));
            return googleCalendarEvents.flatMap(item => {
                if(linkedIds.has(item.id) || isGoogleEventLinkedToAula(item)) return [];
                const interval = googleEventInterval(item);
                if(!interval) return [];
                return [{
                    id: `google-${item.id}`,
                    title: `G • ${item.summary || 'Compromisso'}`,
                    start: interval.start,
                    end: interval.end,
                    allDay: !!item.start?.date,
                    editable: false,
                    startEditable: false,
                    durationEditable: false,
                    overlap: false,
                    backgroundColor: '#15aabf',
                    borderColor: '#1098ad',
                    textColor: '#ffffff',
                    classNames: ['google-calendar-event'],
                    extendedProps: { googleExternal: true, googleEventId: item.id, htmlLink: item.htmlLink || '' }
                }];
            });
        }

        const GOOGLE_RRULE_DAYS = { 0:'SU', 1:'MO', 2:'TU', 3:'WE', 4:'TH', 5:'FR', 6:'SA' };

        function primeiraDataValidaHorarioPreso(horario) {
            const hoje = parseYMD(ymdLocal(new Date()));
            const base = horario.startDate ? parseYMD(horario.startDate) : hoje;
            const cursor = base < hoje ? new Date(hoje.getTime()) : new Date(base.getTime());
            for(let i = 0; i < 14; i++) {
                const ymd = ymdLocal(cursor);
                if(horario.days.includes(cursor.getDay()) && (!horario.endDate || ymd <= horario.endDate)) return ymd;
                cursor.setDate(cursor.getDate() + 1);
            }
            return '';
        }

        function rruleUntilFromYmd(ymd) {
            if(!ymd) return '';
            return `${ymd.replaceAll('-', '')}T235959Z`;
        }

        function googlePayloadFromHorarioPreso(horario) {
            const firstDate = primeiraDataValidaHorarioPreso(horario);
            if(!firstDate) throw new Error(`O bloqueio "${horario.title}" não possui próxima ocorrência válida.`);
            const byDay = horario.days.map(day => GOOGLE_RRULE_DAYS[day]).filter(Boolean).join(',');
            const rule = `RRULE:FREQ=WEEKLY;BYDAY=${byDay}${horario.endDate ? `;UNTIL=${rruleUntilFromYmd(horario.endDate)}` : ''}`;
            return {
                summary: `Bloqueio — ${horario.title}`,
                description: 'Bloqueio recorrente migrado pelo sistema Gestão Aulas. Pode ser editado normalmente no Google Calendar.',
                start: { dateTime: new Date(`${firstDate}T${horario.startTime}:00`).toISOString(), timeZone: GOOGLE_CALENDAR_TIMEZONE },
                end: { dateTime: new Date(`${firstDate}T${horario.endTime}:00`).toISOString(), timeZone: GOOGLE_CALENDAR_TIMEZONE },
                recurrence: [rule],
                transparency: 'opaque',
                extendedProperties: { private: { origem: 'gestao-aulas-jair-bloqueio', horarioPresoId: horario.id } },
                reminders: { useDefault: true }
            };
        }

        async function createGoogleRecurringBlock(horario) {
            const { calendarId } = googleCalendarConfig();
            const payload = googlePayloadFromHorarioPreso(horario);
            return await googleApiFetch(`/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=none`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }

        window.migrarHorariosPresosParaGoogle = async () => {
            if(!horariosPresos.length) {
                showToast('Não há bloqueios locais para migrar.', 'info');
                return;
            }
            try {
                if(!hasValidGoogleToken()) await requestGoogleAccessToken('consent');
                const originais = horariosPresos.slice();
                const migrados = [];
                const falhas = [];
                for(const horario of originais) {
                    try {
                        await createGoogleRecurringBlock(horario);
                        migrados.push(horario.id);
                    } catch(error) {
                        console.error(`Falha ao migrar ${horario.title}`, error);
                        falhas.push(`${horario.title}: ${error.message}`);
                    }
                }
                if(migrados.length) {
                    persistirHorariosPresos(horariosPresos.filter(item => !migrados.includes(item.id)));
                    await refreshGoogleCalendarEvents({ silent: true });
                }
                updateGoogleCalendarStatus();
                showToast(
                    `${migrados.length} bloqueio(s) migrado(s) para o Google${falhas.length ? ` • ${falhas.length} falha(s) mantida(s) localmente` : ''}.`,
                    falhas.length ? 'warning' : 'success',
                    7000
                );
            } catch(error) {
                console.error(error);
                showToast(`Migração: ${error.message}`, 'error', 7000);
            }
        };

        window.atualizarGoogleAgora = async () => {
            try {
                if(!hasValidGoogleToken()) await requestGoogleAccessToken('consent');
                await refreshGoogleCalendarEvents({ silent: false });
                showToast('Agenda Google atualizada.', 'success');
            } catch(error) {
                console.error(error);
                showToast(`Google Calendar: ${error.message}`, 'error', 7000);
            }
        };

        window.conectarGoogleCalendar = async () => {
            if(hasValidGoogleToken()) {
                try { window.google?.accounts?.oauth2?.revoke?.(googleAccessToken, () => {}); } catch(e) {}
                googleAccessToken = ''; googleTokenExpiresAt = 0; googleTokenClient = null; googleCalendarEvents = [];
                googleLastError = '';
                try { localStorage.removeItem(GOOGLE_HINT_KEY); } catch(e) {}
                configureGoogleAutoRefresh();
                updateGoogleCalendarStatus(); renderCalendario();
                showToast('Google Calendar desconectado desta sessão.', 'info');
                return;
            }
            try {
                await requestGoogleAccessToken('consent');
                configureGoogleAutoRefresh();
                await refreshGoogleCalendarEvents({ silent: true });
                if(getConfig().googleAutoSync !== false) {
                    await window.sincronizarGoogleCalendar({ silent: true });
                }
                showToast('Google Calendar conectado e agenda atualizada!', 'success');
            } catch(error) {
                console.error(error);
                showToast(error.message || 'Não foi possível conectar ao Google Calendar.', 'error', 7000);
            }
        };

        window.sincronizarGoogleCalendar = async ({ silent = false } = {}) => {
            try {
                if(!hasValidGoogleToken()) await requestGoogleAccessToken('consent');
                const now = new Date();
                const limite = new Date(now.getTime()); limite.setFullYear(limite.getFullYear() + 1);
                const candidatas = eventos.filter(aula => {
                    const start = parseLocalISO(aula.start);
                    return start && start >= now && start <= limite;
                });
                if(!candidatas.length) { await refreshGoogleCalendarEvents({ silent: true }); if(!silent) showToast('Não há aulas futuras para sincronizar.', 'info'); return; }
                let ok = 0, falhas = 0;
                for(const aula of candidatas) {
                    try { await syncAulaToGoogle(aula); ok++; }
                    catch(error) { console.error(`Falha ao sincronizar aula ${aula.id}`, error); falhas++; }
                }
                await refreshGoogleCalendarEvents({ silent: true });
                updateGoogleCalendarStatus();
                if(!silent || falhas) showToast(`${ok} aula(s) sincronizada(s)${falhas ? ` • ${falhas} falha(s)` : ''}.`, falhas ? 'warning' : 'success', 6000);
            } catch(error) {
                console.error(error);
                googleLastError = String(error?.message || error).slice(0, 180);
                updateGoogleCalendarStatus();
                showToast(`Sincronização: ${error.message}`, 'error', 7000);
            }
        };

        window.recuperarFalhasGoogle = async () => {
            const pendentes = eventos.filter(aula => aula.googleCalendarSyncStatus === 'erro' && (aula.statusAula || 'agendada') !== 'cancelada');
            if(!pendentes.length) { showToast('Não há falhas de sincronização para recuperar.', 'info'); return; }
            try {
                if(!hasValidGoogleToken()) await requestGoogleAccessToken('consent');
                let recuperadas = 0;
                for(const aula of pendentes) {
                    try { await syncAulaToGoogle(aula); recuperadas++; }
                    catch(error) { console.error(`Falha persistente na aula ${aula.id}`, error); }
                }
                await refreshGoogleCalendarEvents({ silent: true });
                updateGoogleCalendarStatus();
                const restantes = pendentes.length - recuperadas;
                showToast(`${recuperadas} falha(s) recuperada(s)${restantes ? ` • ${restantes} ainda precisam de atenção` : ''}.`, restantes ? 'warning' : 'success', 6500);
            } catch(error) {
                console.error(error);
                googleLastError = String(error?.message || error).slice(0, 180);
                updateGoogleCalendarStatus();
                showToast(`Recuperação: ${error.message}`, 'error', 7000);
            }
        };

        // ============================
        // DATA LOADING
        // ============================
        function initOperationalCollections() {
            onSnapshot(query(collection(db, 'pacotes'), where('organizationId','==',currentOrgId())), snap => {
                pacotes = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderPacotes();
            }, error => { console.error('Falha ao carregar pacotes:', error); });
            onSnapshot(query(collection(db, 'solicitacoes'), where('organizationId','==',currentOrgId())), snap => {
                solicitacoes = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderDashboard();
            }, error => { console.error('Falha ao carregar solicitações:', error); });
            onSnapshot(query(collection(db, 'leads'), where('organizationId','==',currentOrgId())), snap => {
                leads = snap.docs.map(d => ({ id:d.id, ...d.data() })); window.renderCRM?.();
            }, error => { console.error('Falha ao carregar CRM:', error); });
        }

        async function carregarDados() {
            onSnapshot(query(collection(db, "alunos"), where('organizationId','==',currentOrgId())), (snap) => {
                alunos = snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR'));
                renderAlunos();
                renderSelectAlunos();
                document.getElementById('badgeAlunos').textContent = alunos.length;
                renderDashboard();
                markInitialDataLoaded('alunos');
            }, (error) => {
                console.error('Falha ao carregar alunos:', error);
                showToast('Não foi possível carregar os alunos. Verifique a conexão e as permissões.', 'error', 6000);
            });

            onSnapshot(query(collection(db, "aulas"), where('organizationId','==',currentOrgId())), (snap) => {
                eventos = snap.docs.map(d => ({id: d.id, ...d.data()}));
                renderCalendario();
                refreshFiltroMesFinOptions();
                renderFinanceiro();
                renderDashboard();
                renderPedagogico();
                markInitialDataLoaded('aulas');
            }, (error) => {
                console.error('Falha ao carregar aulas:', error);
                showToast('Não foi possível carregar as aulas. Verifique a conexão e as permissões.', 'error', 6000);
            });

            onSnapshot(query(collection(db, "despesas"), where('organizationId','==',currentOrgId())), (snap) => {
                despesas = snap.docs.map(d => ({id: d.id, ...d.data()}));
                refreshFiltroMesFinOptions();
                renderFinanceiro();
                renderDashboard();
                markInitialDataLoaded('despesas');
            }, (error) => {
                console.error('Falha ao carregar despesas:', error);
                showToast('Não foi possível carregar as despesas. Verifique a conexão e as permissões.', 'error', 6000);
            });
        }

        // ============================
        // DASHBOARD
        // ============================
        function renderCentralAcoes() {
            const box = document.getElementById('dashAcoes'); if(!box) return;
            const hoje = ymdLocal(new Date());
            const atrasados = eventos.filter(e => e.status !== 'pago' && (e.statusAula||'agendada') !== 'cancelada' && String(e.start||'').split('T')[0] < hoje);
            const pedidos = solicitacoes.filter(s => (s.status||'pendente') === 'pendente');
            const pedPend = eventos.filter(e => {
                const d = parseLocalISO(e.start); return d && d < new Date() && (e.statusAula === 'realizada' || e.presenca === 'presente') && !String(e.conteudo||'').trim();
            }).slice(0,5);
            const total = atrasados.length + pedidos.length + pedPend.length;
            const count = document.getElementById('dashAcoesCount'); if(count) count.textContent = `${total} pendência${total===1?'':'s'}`;
            const itens = [];
            atrasados.slice(0,4).forEach(e => itens.push(`<div class="d-flex justify-content-between align-items-center gap-2 py-2 border-bottom"><div><strong>Cobrança em atraso · ${escapeHtml(e.alunoNome||'Aluno')}</strong><div class="small text-muted">${escapeHtml(formatData(String(e.start||'').split('T')[0]))} · ${formatMoney(Number(e.valor||0))}</div></div><button class="btn btn-sm btn-ghost" onclick="showSection('financeiro')">Abrir</button></div>`));
            pedidos.slice(0,4).forEach(r => itens.push(`<div class="d-flex justify-content-between align-items-center gap-2 py-2 border-bottom"><div><strong>${escapeHtml(String(r.tipo||'Solicitação'))} · ${escapeHtml(r.alunoNome||'Aluno')}</strong><div class="small text-muted">Solicitação do portal</div></div><div class="d-flex gap-1"><button class="btn btn-sm btn-success" onclick="resolverSolicitacao('${r.id}','aprovada')">Aprovar</button><button class="btn btn-sm btn-ghost" onclick="resolverSolicitacao('${r.id}','recusada')">Recusar</button></div></div>`));
            pedPend.slice(0,3).forEach(e => itens.push(`<div class="d-flex justify-content-between align-items-center gap-2 py-2 border-bottom"><div><strong>Relatório pós-aula pendente · ${escapeHtml(e.alunoNome||'Aluno')}</strong><div class="small text-muted">${escapeHtml(formatData(String(e.start||'').split('T')[0]))}</div></div><button class="btn btn-sm btn-ghost" onclick="showSection('pedagogico')">Registrar</button></div>`));
            box.innerHTML = itens.length ? itens.join('') : '<div class="empty-state"><i class="fas fa-check-circle"></i><p>Nenhuma ação urgente.</p></div>';
        }
        function renderDashboard() {
            try { document.dispatchEvent(new Event('profgestor:data')); } catch(e) { console.warn(e); }
            const now = new Date();
            const mesKey = `${now.getFullYear()}-${pad2(now.getMonth()+1)}`;
            
            // Stats
            document.getElementById('dashAlunos').textContent = alunos.length;
            
            const aulasMes = eventos.filter(e => (e.start || '').startsWith(mesKey));
            document.getElementById('dashAulasMes').textContent = aulasMes.length;
            const realizadas = aulasMes.filter(e => e.statusAula === 'realizada').length;
            document.getElementById('dashAulasRealizadas').textContent = realizadas > 0 ? `${realizadas} realizadas` : '';

            const recebidoMes = aulasMes.filter(e => e.status === 'pago' && e.statusAula !== 'cancelada').reduce((s,e) => s + Number(e.valor||0), 0);
            const pendenteMes = aulasMes.filter(e => e.status !== 'pago' && e.statusAula !== 'cancelada').reduce((s,e) => s + Number(e.valor||0), 0);
            document.getElementById('dashRecebido').textContent = formatMoney(recebidoMes);
            document.getElementById('dashPendente').textContent = formatMoney(pendenteMes);
            renderCentralAcoes();

            // Próximas aulas
            const hoje = ymdLocal(now);
            const proximas = eventos
                .filter(e => {
                    const d = (e.start || '').split('T')[0];
                    return d >= hoje && (e.statusAula || 'agendada') !== 'cancelada';
                })
                .sort((a,b) => (parseLocalISO(a.start)||0) - (parseLocalISO(b.start)||0))
                .slice(0, 5);

            const divProx = document.getElementById('dashProximasAulas');
            if (proximas.length === 0) {
                divProx.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-day"></i><p>Nenhuma aula agendada</p></div>';
            } else {
                divProx.innerHTML = proximas.map(e => {
                    const dataStr = formatData((e.start||'').split('T')[0]);
                    const hora = isoToHHMM(e.start);
                    const sit = e.statusAula || 'agendada';
                    const color = getAvatarColor(e.alunoNome || '');
                    const initials = getInitials(e.alunoNome || '?');
                    return `<div class="d-flex align-items-center gap-3 py-2 border-bottom">
                        <span class="avatar-sm" style="background:${color}">${escapeHtml(initials)}</span>
                        <div class="flex-grow-1">
                            <div style="font-weight:600;font-size:0.88rem">${escapeHtml(e.alunoNome)}</div>
                            <div style="font-size:0.78rem;color:var(--gray-500)">${dataStr} às ${hora}</div>
                        </div>
                        <span class="badge-status ${sit}">${sit}</span>
                    </div>`;
                }).join('');
            }

            // Pendentes
            const pend = eventos
                .filter(e => e.status !== 'pago' && (e.statusAula || 'agendada') !== 'cancelada')
                .sort((a,b) => (parseLocalISO(a.start)||0) - (parseLocalISO(b.start)||0))
                .slice(0, 5);

            const divPend = document.getElementById('dashPendentes');
            if (pend.length === 0) {
                divPend.innerHTML = '<div class="empty-state"><i class="fas fa-check-double"></i><p>Tudo em dia!</p></div>';
            } else {
                divPend.innerHTML = pend.map(e => {
                    const dataStr = formatData((e.start||'').split('T')[0]);
                    return `<div class="d-flex align-items-center gap-3 py-2 border-bottom">
                        <div class="flex-grow-1">
                            <div style="font-weight:600;font-size:0.88rem">${escapeHtml(e.alunoNome)}</div>
                            <div style="font-size:0.78rem;color:var(--gray-500)">${dataStr}</div>
                        </div>
                        <span style="font-weight:700;color:var(--warning)">R$ ${Number(e.valor||0).toFixed(2)}</span>
                    </div>`;
                }).join('');
            }
            renderGoogleCalendarOperations();
        }

        // ============================
        // ALUNOS
        // ============================
        document.getElementById('formAluno').addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('alunoNome').value.trim();
            const telInput = document.getElementById('alunoTel').value;
            const materia = document.getElementById('alunoMateria').value.trim();

            let telDigits = String(telInput || '').replace(/\D/g,'');
            if(telDigits.startsWith('55')) telDigits = telDigits.slice(2);
            if(telDigits.length < 10 || telDigits.length > 11) {
                showToast('WhatsApp inválido. Use DDD + número.', 'error');
                return;
            }

            try {
                await addDoc(collection(db, "alunos"), { nome, tel: telDigits, materia, organizationId: currentOrgId(), createdAt: nowLocalISO(), updatedAt: nowLocalISO() });
                document.getElementById('formAluno').reset();
                showToast(`${nome} cadastrado com sucesso!`, 'success');
            } catch (err) {
                console.error(err);
                showToast('Erro ao salvar aluno.', 'error');
            }
        });

        function getAvatarColor(name) {
            const colors = ['#3b5bdb','#12b886','#f59f00','#fa5252','#7950f2','#15aabf','#e64980','#82c91e','#fd7e14','#845ef7'];
            let hash = 0;
            for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
            return colors[Math.abs(hash) % colors.length];
        }

        function getInitials(name) {
            return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
        }

        function formatWhatsApp(tel) {
            const d = String(tel || '').replace(/\D/g,'');
            if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
            if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
            return d;
        }

        function renderAlunos() {
            const tbody = document.getElementById('tabelaAlunos');
            const busca = normalizeSearch(document.getElementById('buscaAluno')?.value || '');
            
            const filtered = alunos.filter(a => {
                if (!busca) return true;
                return normalizeSearch(a.nome).includes(busca) || normalizeSearch(a.materia).includes(busca);
            });

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-users"></i><p>${busca ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}</p></div></td></tr>`;
                return;
            }

            tbody.innerHTML = filtered.map(aluno => {
                const color = getAvatarColor(aluno.nome);
                const initials = getInitials(aluno.nome);
                const qtd = eventos.filter(e => e.alunoId === aluno.id).length;
                const telDigits = String(aluno.tel||'').replace(/\D/g,'');
                let telDisplay = telDigits.startsWith('55') ? telDigits.slice(2) : telDigits;

                return `<tr>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <span class="avatar-sm" style="background:${color}">${escapeHtml(initials)}</span>
                            <span style="font-weight:600">${escapeHtml(aluno.nome)}</span>
                        </div>
                    </td>
                    <td>
                        <a href="https://wa.me/55${telDisplay}" target="_blank" style="color:var(--success);text-decoration:none;font-weight:500">
                            <i class="fab fa-whatsapp me-1"></i>${formatWhatsApp(telDisplay)}
                        </a>
                    </td>
                    <td>${escapeHtml(aluno.materia || '-')}</td>
                    <td><span class="badge bg-light text-dark">${qtd} aulas</span></td>
                    <td class="text-end">
                        <button class="btn btn-icon btn-ghost" onclick="window.editarAluno('${aluno.id}')" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="btn btn-icon btn-ghost" onclick="window.deletarAluno('${aluno.id}')" title="Excluir"><i class="fas fa-trash text-danger"></i></button>
                    </td>
                </tr>`;
            }).join('');
        }

        window.editarAluno = (id) => {
            const aluno = alunos.find(a => a.id === id);
            if (!aluno) return;
            document.getElementById('editAlunoId').value = id;
            document.getElementById('editAlunoNome').value = aluno.nome || '';
            document.getElementById('editAlunoTel').value = aluno.tel || '';
            document.getElementById('editAlunoMateria').value = aluno.materia || '';
            new bootstrap.Modal(document.getElementById('modalEditAluno')).show();
        }

        window.salvarEdicaoAluno = async () => {
            const id = document.getElementById('editAlunoId').value;
            const nome = document.getElementById('editAlunoNome').value.trim();
            let tel = document.getElementById('editAlunoTel').value.replace(/\D/g,'');
            if(tel.startsWith('55')) tel = tel.slice(2);
            const materia = document.getElementById('editAlunoMateria').value.trim();

            if(!nome) { showToast('Nome é obrigatório.', 'error'); return; }
            if(tel.length < 10 || tel.length > 11) { showToast('WhatsApp inválido.', 'error'); return; }

            try {
                await updateDoc(doc(db, "alunos", id), { nome, tel, materia });
                // Update aulas que referenciam este aluno
                const aulasDoAluno = eventos.filter(e => e.alunoId === id);
                for (const aula of aulasDoAluno) {
                    await updateDoc(doc(db, "aulas", aula.id), { alunoNome: nome, title: `${nome} (${materia})` });
                }
                bootstrap.Modal.getInstance(document.getElementById('modalEditAluno')).hide();
                showToast(`${nome} atualizado!`, 'success');
            } catch(e) {
                console.error(e);
                showToast('Erro ao atualizar.', 'error');
            }
        }

        window.deletarAluno = async (id) => {
            const aluno = alunos.find(a => a.id === id);
            if (!aluno) return;
            const temAulas = eventos.some(e => e.alunoId === id);
            const msg = temAulas
                ? `<strong>${escapeHtml(aluno.nome)}</strong> possui aulas registradas. Excluir o aluno NÃO apaga as aulas e pode deixar o histórico inconsistente.`
                : `Excluir <strong>${escapeHtml(aluno.nome)}</strong>?`;

            showConfirm('Excluir Aluno', msg, async () => {
                try {
                    await deleteDoc(doc(db, "alunos", id));
                    showToast('Aluno excluído.', 'success');
                } catch(e) { showToast('Erro ao excluir.', 'error'); }
            });
        }

        // ============================
        // HORÁRIOS PRESOS (LOCALSTORAGE)
        // Não usa Firebase e não altera autenticação ou dados existentes.
        // ============================
        function criarHorarioPresoId() {
            const uuid = window.crypto?.randomUUID?.();
            return uuid ? `hp_${uuid}` : `hp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        }

        function dataYmdValida(value) {
            if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
            const parsed = parseYMD(value);
            return !isNaN(parsed.getTime()) && ymdLocal(parsed) === value;
        }

        function normalizarHorarioPreso(item, index = 0) {
            if(!item || typeof item !== 'object') return null;
            const title = String(item.title || '').trim().slice(0, 80);
            const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
            const startTime = String(item.startTime || '');
            const endTime = String(item.endTime || '');
            const days = Array.from(new Set((Array.isArray(item.days) ? item.days : []).map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6)))
                .sort((a, b) => ORDEM_DIAS_SEMANA.indexOf(a) - ORDEM_DIAS_SEMANA.indexOf(b));
            if(!title || !days.length || !timePattern.test(startTime) || !timePattern.test(endTime) || endTime <= startTime) return null;

            const rawId = String(item.id || '');
            const id = /^[A-Za-z0-9_-]{1,100}$/.test(rawId) ? rawId : `hp_recuperado_${Date.now()}_${index}`;
            const startDate = dataYmdValida(item.startDate) ? item.startDate : '';
            const endDate = dataYmdValida(item.endDate) ? item.endDate : '';
            if(startDate && endDate && startDate > endDate) return null;
            return { id, title, days, startTime, endTime, startDate, endDate };
        }

        function carregarHorariosPresos() {
            try {
                const parsed = JSON.parse(localStorage.getItem(HORARIOS_PRESOS_KEY) || '[]');
                if(!Array.isArray(parsed)) return [];
                return parsed.map(normalizarHorarioPreso).filter(Boolean);
            } catch(error) {
                console.warn('Não foi possível ler os horários presos locais.', error);
                return [];
            }
        }

        function persistirHorariosPresos(next) {
            const normalizados = next.map(normalizarHorarioPreso).filter(Boolean);
            try {
                localStorage.setItem(HORARIOS_PRESOS_KEY, JSON.stringify(normalizados));
                horariosPresos = normalizados;
                renderHorariosPresosLista();
                updateGoogleCalendarStatus();
                if(calendar) renderCalendario();
                return true;
            } catch(error) {
                console.error(error);
                showToast('Não foi possível salvar o horário neste navegador.', 'error', 5000);
                return false;
            }
        }

        function primeiroDiaConflitante(horario, start, end) {
            if(!(start instanceof Date) || !(end instanceof Date) || end <= start) return '';
            const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12, 0, 0, 0);
            const last = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12, 0, 0, 0);
            while(cursor <= last) {
                const ymd = ymdLocal(cursor);
                if(horario.days.includes(cursor.getDay()) && (!horario.startDate || ymd >= horario.startDate) && (!horario.endDate || ymd <= horario.endDate)) {
                    const blockStart = new Date(`${ymd}T${horario.startTime}:00`);
                    const blockEnd = new Date(`${ymd}T${horario.endTime}:00`);
                    if(start < blockEnd && end > blockStart) return ymd;
                }
                cursor.setDate(cursor.getDate() + 1);
            }
            return '';
        }

        function horarioPresoConflitaComIntervalo(horario, start, end) {
            return !!primeiroDiaConflitante(horario, start, end);
        }

        function findFixedScheduleConflicts(start, end, ignoreFixedId = '') {
            const startDate = start instanceof Date ? start : parseLocalISO(start);
            const endDate = end instanceof Date ? end : parseLocalISO(end);
            if(!startDate || !endDate || endDate <= startDate) return [];
            return horariosPresos.flatMap(horario => {
                if(horario.id === ignoreFixedId) return [];
                const conflictDate = primeiroDiaConflitante(horario, startDate, endDate);
                if(!conflictDate) return [];
                return [{
                    conflictType: 'horarioPreso',
                    horarioPresoId: horario.id,
                    title: horario.title,
                    start: `${conflictDate}T${horario.startTime}:00`,
                    end: `${conflictDate}T${horario.endTime}:00`
                }];
            });
        }

        function blocosFixosSeSobrepoem(a, b) {
            if(!a.days.some(day => b.days.includes(day))) return false;
            if(a.startTime >= b.endTime || a.endTime <= b.startTime) return false;
            const aStart = a.startDate || '0000-01-01';
            const aEnd = a.endDate || '9999-12-31';
            const bStart = b.startDate || '0000-01-01';
            const bEnd = b.endDate || '9999-12-31';
            return aStart <= bEnd && bStart <= aEnd;
        }

        function diasHorarioPreso(horario) {
            return ORDEM_DIAS_SEMANA.filter(day => horario.days.includes(day)).map(day => NOMES_DIAS_SEMANA[day]).join(', ');
        }

        function faixaValidadeHorarioPreso(horario) {
            if(horario.startDate && horario.endDate) return `${formatData(horario.startDate)} a ${formatData(horario.endDate)}`;
            if(horario.startDate) return `a partir de ${formatData(horario.startDate)}`;
            if(horario.endDate) return `até ${formatData(horario.endDate)}`;
            return 'sem data final';
        }

        function renderHorariosPresosLista() {
            const badge = document.getElementById('horariosPresosBadge');
            const summary = document.getElementById('horariosPresosResumo');
            const container = document.getElementById('horariosPresosLista');
            if(badge) badge.textContent = horariosPresos.length;
            if(summary) summary.textContent = `${horariosPresos.length} ${horariosPresos.length === 1 ? 'horário' : 'horários'}`;
            if(!container) return;
            if(!horariosPresos.length) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-unlock-alt"></i><p>Nenhum horário preso.</p></div>';
                return;
            }

            const ordered = horariosPresos.slice().sort((a, b) => {
                const dayA = Math.min(...a.days.map(day => ORDEM_DIAS_SEMANA.indexOf(day)));
                const dayB = Math.min(...b.days.map(day => ORDEM_DIAS_SEMANA.indexOf(day)));
                return dayA - dayB || a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title, 'pt-BR');
            });
            container.innerHTML = ordered.map(horario => `
                <div class="horario-preso-item">
                    <div class="horario-preso-icon"><i class="fas fa-lock"></i></div>
                    <div class="horario-preso-detalhes">
                        <strong>${escapeHtml(horario.title)}</strong>
                        <span>${escapeHtml(diasHorarioPreso(horario))} • ${escapeHtml(horario.startTime)}–${escapeHtml(horario.endTime)} • ${escapeHtml(faixaValidadeHorarioPreso(horario))}</span>
                    </div>
                    <div class="d-flex gap-1">
                        <button type="button" class="btn btn-icon btn-ghost" onclick="editarHorarioPreso('${horario.id}')" title="Editar" aria-label="Editar ${escapeHtml(horario.title)}"><i class="fas fa-pen"></i></button>
                        <button type="button" class="btn btn-icon btn-ghost" onclick="excluirHorarioPreso('${horario.id}')" title="Excluir" aria-label="Excluir ${escapeHtml(horario.title)}"><i class="fas fa-trash text-danger"></i></button>
                    </div>
                </div>
            `).join('');
        }

        function limparFormularioHorarioPreso() {
            const form = document.getElementById('formHorarioPreso');
            form?.reset();
            document.getElementById('horarioPresoId').value = '';
            document.getElementById('horarioPresoInicio').value = '07:00';
            document.getElementById('horarioPresoFim').value = '08:00';
            const button = document.getElementById('btnSalvarHorarioPreso');
            if(button) button.innerHTML = '<i class="fas fa-lock me-1"></i>Prender horário';
        }

        function preencherFormularioHorarioPreso(id) {
            const horario = horariosPresos.find(item => item.id === id);
            if(!horario) return false;
            document.getElementById('horarioPresoId').value = horario.id;
            document.getElementById('horarioPresoTitulo').value = horario.title;
            document.getElementById('horarioPresoInicio').value = horario.startTime;
            document.getElementById('horarioPresoFim').value = horario.endTime;
            document.getElementById('horarioPresoInicioData').value = horario.startDate || '';
            document.getElementById('horarioPresoFimData').value = horario.endDate || '';
            document.querySelectorAll('#horarioPresoDias input').forEach(input => { input.checked = horario.days.includes(Number(input.value)); });
            const button = document.getElementById('btnSalvarHorarioPreso');
            if(button) button.innerHTML = '<i class="fas fa-save me-1"></i>Atualizar bloqueio';
            return true;
        }

        function abrirHorariosPresos(id = '') {
            renderHorariosPresosLista();
            limparFormularioHorarioPreso();
            if(id) preencherFormularioHorarioPreso(id);
            bootstrap.Modal.getOrCreateInstance(document.getElementById('modalHorariosPresos')).show();
            setTimeout(() => document.getElementById('horarioPresoTitulo')?.focus(), 180);
        }

        function novoHorarioPreso() {
            limparFormularioHorarioPreso();
            document.getElementById('horarioPresoTitulo')?.focus();
        }

        function editarHorarioPreso(id) {
            if(preencherFormularioHorarioPreso(id)) document.getElementById('horarioPresoTitulo')?.focus();
        }

        function salvarHorarioPreso() {
            const form = document.getElementById('formHorarioPreso');
            if(!form?.reportValidity()) return;
            const id = document.getElementById('horarioPresoId').value || criarHorarioPresoId();
            const title = document.getElementById('horarioPresoTitulo').value.trim();
            const days = Array.from(document.querySelectorAll('#horarioPresoDias input:checked')).map(input => Number(input.value));
            const startTime = document.getElementById('horarioPresoInicio').value;
            const endTime = document.getElementById('horarioPresoFim').value;
            const startDate = document.getElementById('horarioPresoInicioData').value;
            const endDate = document.getElementById('horarioPresoFimData').value;

            if(!days.length) { showToast('Selecione pelo menos um dia da semana.', 'warning'); return; }
            if(endTime <= startTime) { showToast('O horário final deve ser posterior ao inicial.', 'warning'); return; }
            if(startDate && endDate && startDate > endDate) { showToast('A data final deve ser posterior à data inicial.', 'warning'); return; }

            const horario = normalizarHorarioPreso({ id, title, days, startTime, endTime, startDate, endDate });
            if(!horario) { showToast('Revise os dados do horário preso.', 'warning'); return; }
            const overlap = horariosPresos.find(item => item.id !== id && blocosFixosSeSobrepoem(item, horario));
            if(overlap) { showToast(`Este período se sobrepõe a ${overlap.title}.`, 'warning', 5000); return; }

            const next = horariosPresos.some(item => item.id === id)
                ? horariosPresos.map(item => item.id === id ? horario : item)
                : [...horariosPresos, horario];
            if(!persistirHorariosPresos(next)) return;

            const lessonConflicts = eventos.filter(evento => {
                if((evento.statusAula || 'agendada') === 'cancelada') return false;
                const start = parseLocalISO(evento.start);
                const end = parseLocalISO(evento.end) || start;
                return start && end && horarioPresoConflitaComIntervalo(horario, start, end);
            }).length;
            limparFormularioHorarioPreso();
            showToast(lessonConflicts
                ? `Horário preso. ${lessonConflicts} aula(s) existente(s) coincidem e foram mantidas.`
                : 'Horário preso com sucesso.', lessonConflicts ? 'warning' : 'success', 5000);
        }

        function excluirHorarioPreso(id) {
            const horario = horariosPresos.find(item => item.id === id);
            if(!horario) return;
            showConfirm('Excluir horário preso', `Remover o bloqueio <strong>${escapeHtml(horario.title)}</strong>? Nenhuma aula será alterada.`, () => {
                if(persistirHorariosPresos(horariosPresos.filter(item => item.id !== id))) {
                    limparFormularioHorarioPreso();
                    showToast('Horário liberado.', 'success');
                }
            });
        }

        function diaSeguinteYmd(ymd) {
            const date = parseYMD(ymd);
            date.setDate(date.getDate() + 1);
            return ymdLocal(date);
        }

        function eventosCalendarioHorariosPresos() {
            return horariosPresos.map(horario => ({
                id: `horario-preso-${horario.id}`,
                groupId: `horario-preso-${horario.id}`,
                title: `🔒 ${horario.title}`,
                daysOfWeek: horario.days,
                startTime: `${horario.startTime}:00`,
                endTime: `${horario.endTime}:00`,
                ...(horario.startDate ? { startRecur: horario.startDate } : {}),
                ...(horario.endDate ? { endRecur: diaSeguinteYmd(horario.endDate) } : {}),
                editable: false,
                startEditable: false,
                durationEditable: false,
                overlap: false,
                backgroundColor: '#343a40',
                borderColor: '#212529',
                textColor: '#ffffff',
                classNames: ['horario-preso-event'],
                extendedProps: { horarioPreso: true, horarioPresoId: horario.id }
            }));
        }

        function tratarSelecaoCalendario(info) {
            const conflicts = findFixedScheduleConflicts(info.start, info.end);
            calendar?.unselect();
            if(conflicts.length) {
                showToast(`Período indisponível: ${describeConflict(conflicts[0])}.`, 'warning', 5000);
                return;
            }
            window.abrirModalEvento(null, info.start, info.end);
        }

        function initHorariosPresos() {
            renderHorariosPresosLista();
            document.getElementById('formHorarioPreso')?.addEventListener('submit', event => {
                event.preventDefault();
                salvarHorarioPreso();
            });
            window.addEventListener('storage', event => {
                if(event.key !== HORARIOS_PRESOS_KEY) return;
                horariosPresos = carregarHorariosPresos();
                renderHorariosPresosLista();
                if(calendar) renderCalendario();
            });
        }

        window.abrirHorariosPresos = abrirHorariosPresos;
        window.novoHorarioPreso = novoHorarioPreso;
        window.editarHorarioPreso = editarHorarioPreso;
        window.salvarHorarioPreso = salvarHorarioPreso;
        window.excluirHorarioPreso = excluirHorarioPreso;

        // ============================
        // EVENTOS / AULAS
        // ============================
        function getRecurrenceInputs() {
            return {
                enabled: !!document.getElementById('eventoRecorrente')?.checked,
                days: Array.from(document.querySelectorAll('#eventoDiasSemana input:checked')).map(el => Number(el.value)),
                end: document.getElementById('eventoRecorrenciaFim')?.value || ''
            };
        }

        function buildRecurrenceDates(startYmd, endYmd, days) {
            if(!startYmd || !endYmd || !days.length) return [];
            const start = parseYMD(startYmd);
            const end = parseYMD(endYmd);
            if(end < start) return [];
            const selected = new Set(days);
            const result = [];
            const cursor = new Date(start.getTime());
            while(cursor <= end) {
                if(selected.has(cursor.getDay())) result.push(ymdLocal(cursor));
                cursor.setDate(cursor.getDate() + 1);
            }
            return result;
        }

        function updateRecurrencePreview() {
            const fields = document.getElementById('recorrenciaCampos');
            const box = document.getElementById('recorrenciaBox');
            const enabled = !!document.getElementById('eventoRecorrente')?.checked;
            const editing = !!document.getElementById('eventoId')?.value;
            if(box) box.hidden = editing;
            if(fields) fields.hidden = !enabled || editing;
            if(!enabled || editing) return;

            const { days, end } = getRecurrenceInputs();
            const start = document.getElementById('eventoData')?.value || '';
            const dates = buildRecurrenceDates(start, end, days);
            const summary = document.getElementById('recorrenciaResumo');
            if(!summary) return;
            if(!days.length) {
                summary.textContent = 'Selecione pelo menos um dia da semana.';
            } else if(!end) {
                summary.textContent = 'Escolha a data final da recorrência.';
            } else if(!dates.length) {
                summary.textContent = 'Não há ocorrências no intervalo escolhido.';
            } else {
                summary.textContent = `${dates.length} ${dates.length === 1 ? 'aula será criada' : 'aulas serão criadas'}, de ${formatData(dates[0])} a ${formatData(dates[dates.length - 1])}.`;
            }
        }

        function initRecurrenceBindings() {
            const ids = ['eventoRecorrente','eventoRecorrenciaFim','eventoData','eventoHora','eventoFim'];
            ids.forEach(id => document.getElementById(id)?.addEventListener('change', updateRecurrencePreview));
            document.querySelectorAll('#eventoDiasSemana input').forEach(el => el.addEventListener('change', updateRecurrencePreview));
        }

        window.abrirNovaAulaHoje = () => {
            const start = new Date();
            start.setMinutes(0, 0, 0);
            if(start.getHours() < 7) start.setHours(7);
            else start.setHours(start.getHours() + 1);
            if(start.getHours() >= 22) {
                start.setDate(start.getDate() + 1);
                start.setHours(7);
            }
            const end = new Date(start.getTime() + 60 * 60000);
            window.abrirModalEvento(null, start, end);
        }

        window.abrirModalEvento = (eventObj, start = null, end = null) => {
            const modal = new bootstrap.Modal(document.getElementById('modalEvento'));
            const form = document.getElementById('formEvento');
            form.reset();
            
            if (eventObj) {
                document.getElementById('eventoId').value = eventObj.id;
                document.getElementById('eventoAluno').value = eventObj.extendedProps.alunoId;
                document.getElementById('eventoStatusAula').value = eventObj.extendedProps.statusAula || 'agendada';
                document.getElementById('eventoData').value = toLocalISO(eventObj.start).split('T')[0];
                document.getElementById('eventoHora').value = eventObj.start.toTimeString().slice(0,5);
                document.getElementById('eventoFim').value = eventObj.end ? eventObj.end.toTimeString().slice(0,5) : '';
                document.getElementById('eventoValor').value = eventObj.extendedProps.valor;
                document.getElementById('eventoStatus').value = eventObj.extendedProps.status;
                document.getElementById('eventoForma').value = eventObj.extendedProps.forma;
                document.getElementById('eventoModalidade').value = eventObj.extendedProps.modalidade || 'online';
                document.getElementById('eventoLocal').value = eventObj.extendedProps.local || '';
                document.getElementById('eventoObs').value = eventObj.extendedProps.obs || '';
                document.getElementById('btnExcluirEvento').style.display = 'block';
                document.getElementById('eventoRecorrente').checked = false;
            } else {
                document.getElementById('eventoId').value = '';
                document.getElementById('eventoStatusAula').value = 'agendada';
                document.getElementById('eventoData').value = toLocalISO(start).split('T')[0];
                document.getElementById('eventoHora').value = start.toTimeString().slice(0,5);
                let endDefault = end || new Date(start.getTime() + 60*60000);
                document.getElementById('eventoFim').value = endDefault.toTimeString().slice(0,5);
                document.getElementById('eventoModalidade').value = 'online';
                document.getElementById('eventoLocal').value = '';
                document.getElementById('eventoObs').value = '';
                document.getElementById('btnExcluirEvento').style.display = 'none';
                document.getElementById('eventoRecorrente').checked = false;
                document.querySelectorAll('#eventoDiasSemana input').forEach(el => { el.checked = Number(el.value) === start.getDay(); });
                const recurrenceEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12, 0, 0);
                recurrenceEnd.setDate(recurrenceEnd.getDate() + 28);
                document.getElementById('eventoRecorrenciaFim').value = ymdLocal(recurrenceEnd);
            }
            updateRecurrencePreview();
            modal.show();
        }

        function findSchedulingConflicts(start, end, ignoreId = '') {
            const startMs = start instanceof Date ? start.getTime() : parseLocalISO(start)?.getTime();
            const endMs = end instanceof Date ? end.getTime() : parseLocalISO(end)?.getTime();
            if(!Number.isFinite(startMs) || !Number.isFinite(endMs)) return [];
            const lessonConflicts = eventos.filter(evento => {
                if(evento.id === ignoreId || (evento.statusAula || 'agendada') === 'cancelada') return false;
                const existingStart = parseLocalISO(evento.start)?.getTime();
                const existingEnd = parseLocalISO(evento.end)?.getTime() ?? existingStart;
                return Number.isFinite(existingStart) && Number.isFinite(existingEnd) && startMs < existingEnd && endMs > existingStart;
            });
            const googleConflicts = getConfig().googleBlockExternal === false ? [] : googleCalendarEvents.flatMap(item => {
                if(isGoogleEventLinkedToAula(item, ignoreId)) return [];
                const interval = googleEventInterval(item);
                if(!interval) return [];
                if(startMs < interval.end.getTime() && endMs > interval.start.getTime()) return [{ conflictType:'googleCalendar', googleEventId:item.id, title:item.summary || 'Compromisso no Google Calendar', start:interval.start, end:interval.end }];
                return [];
            });
            return [...findFixedScheduleConflicts(start, end), ...lessonConflicts, ...googleConflicts];
        }

        function describeConflict(conflict) {
            if(conflict?.conflictType === 'horarioPreso') return `horário preso “${conflict.title || 'compromisso fixo'}” (${isoToHHMM(conflict.start)}–${isoToHHMM(conflict.end)})`;
            if(conflict?.conflictType === 'googleCalendar') {
                const start = conflict.start instanceof Date ? conflict.start : parseLocalISO(conflict.start);
                const hora = start ? start.toTimeString().slice(0,5) : '';
                return `Google Calendar “${conflict.title || 'compromisso'}”${hora ? ` às ${hora}` : ''}`;
            }
            return `${conflict.alunoNome || 'aula existente'} às ${isoToHHMM(conflict.start)}`;
        }

        window.salvarEvento = async () => {
            const form = document.getElementById('formEvento');
            if(!form.reportValidity()) return;
            const id = document.getElementById('eventoId').value;
            const alunoId = document.getElementById('eventoAluno').value;
            const alunoObj = alunos.find(a => a.id === alunoId);

            if(!alunoObj) { showToast('Selecione um aluno!', 'warning'); return; }

            const data = document.getElementById('eventoData').value;
            const hora = document.getElementById('eventoHora').value;
            const fim = document.getElementById('eventoFim').value;
            const valor = Number(document.getElementById('eventoValor').value);

            if(!data || !hora || !fim) { showToast('Preencha data e horário.', 'warning'); return; }
            if(!Number.isFinite(valor) || valor < 0) { showToast('Informe um valor válido para a aula.', 'warning'); return; }

            const startDate = new Date(`${data}T${hora}:00`);
            const endDate = new Date(`${data}T${fim}:00`);

            if(isNaN(startDate.getTime()) || isNaN(endDate.getTime())) { showToast('Data/horário inválido.', 'error'); return; }
            if(endDate <= startDate) { showToast('Horário de fim deve ser após o início.', 'error'); return; }

            const existing = id ? eventos.find(e => e.id === id) : null;
            const sameStoredTime = !!existing && String(existing.start || '').slice(0, 16) === toLocalISO(startDate).slice(0, 16) && String(existing.end || '').slice(0, 16) === toLocalISO(endDate).slice(0, 16);
            const conflicts = findSchedulingConflicts(startDate, endDate, id).filter(conflict => conflict.conflictType !== 'horarioPreso' || !sameStoredTime);
            if(conflicts.length) { showToast(`Conflito de agenda com ${describeConflict(conflicts[0])}.`, 'warning', 5000); return; }
            const googleRemoteConflicts = await findGoogleCalendarConflictsRemote(startDate, endDate, id);
            if(googleRemoteConflicts.length) { showToast(`Conflito de agenda com ${describeConflict(googleRemoteConflicts[0])}.`, 'warning', 6000); return; }

            const statusPag = document.getElementById('eventoStatus').value;
            const pagoEmPrev = existing?.pagoEm || null;
            const pagoEm = (statusPag === 'pago') ? (pagoEmPrev || nowLocalISO()) : null;

            const dados = {
                organizationId: currentOrgId(),
                alunoId,
                alunoNome: alunoObj.nome,
                start: toLocalISO(startDate),
                end: toLocalISO(endDate),
                valor,
                status: statusPag,
                statusAula: document.getElementById('eventoStatusAula').value,
                forma: document.getElementById('eventoForma').value,
                modalidade: document.getElementById('eventoModalidade').value,
                local: (document.getElementById('eventoLocal').value || '').trim(),
                obs: (document.getElementById('eventoObs').value || '').trim(),
                title: `${alunoObj.nome} (${alunoObj.materia})`,
                pagoEm,
                updatedAt: nowLocalISO()
            };

            if(!id) dados.createdAt = nowLocalISO();

            try {
                if (id) {
                    await updateDoc(doc(db, "aulas", id), dados);
                    if(existing && ((existing.status || 'pendente') !== dados.status || Number(existing.valor || 0) !== dados.valor)) {
                        registrarAuditoria('aula.financeiro', { tipo: 'aula', id }, { de: { status: existing.status || 'pendente', valor: Number(existing.valor || 0) }, para: { status: dados.status, valor: dados.valor } });
                    }
                    const aulaAtualizada = { ...existing, ...dados, id };
                    if(hasValidGoogleToken() && getConfig().googleAutoSync !== false) {
                        try { await syncAulaToGoogle(aulaAtualizada); }
                        catch(syncError) { console.error(syncError); showToast('Aula salva no sistema, mas a sincronização com o Google falhou.', 'warning', 6000); }
                    }
                    showToast('Aula atualizada!', 'success');
                } else {
                    const recurrence = getRecurrenceInputs();
                    if(recurrence.enabled) {
                        if(!recurrence.days.length) { showToast('Selecione ao menos um dia da semana.', 'warning'); return; }
                        if(!recurrence.end) { showToast('Informe até quando as aulas devem se repetir.', 'warning'); return; }
                        const recurrenceDates = buildRecurrenceDates(data, recurrence.end, recurrence.days);
                        if(!recurrenceDates.length) { showToast('A recorrência não possui datas válidas.', 'warning'); return; }
                        if(recurrenceDates.length > 120) { showToast('Limite a recorrência a no máximo 120 aulas.', 'warning'); return; }

                        const duracao = endDate.getTime() - startDate.getTime();
                        const existentes = new Set(eventos
                            .filter(e => e.alunoId === alunoId)
                            .map(e => String(e.start || '').slice(0,16)));
                        let googleRecurrenceEvents = [];
                        if(hasValidGoogleToken()) {
                            try {
                                const rangeStart = new Date(`${recurrenceDates[0]}T00:00:00`);
                                const rangeEnd = new Date(`${recurrenceDates[recurrenceDates.length - 1]}T23:59:59`);
                                googleRecurrenceEvents = await listGoogleEvents(rangeStart, rangeEnd);
                            } catch(error) { console.warn('Falha ao consultar Google Calendar para a recorrência.', error); }
                        }
                        const ocorrencias = recurrenceDates.map(ymd => {
                            const occurrenceStart = new Date(`${ymd}T${hora}:00`);
                            const occurrenceEnd = new Date(occurrenceStart.getTime() + duracao);
                            return {
                                ...dados,
                                start: toLocalISO(occurrenceStart),
                                end: toLocalISO(occurrenceEnd),
                                pagoEm: null,
                                status: 'pendente',
                                createdAt: nowLocalISO(),
                                updatedAt: nowLocalISO()
                            };
                        }).filter(item => {
                            if(existentes.has(item.start.slice(0,16)) || findSchedulingConflicts(item.start, item.end).length) return false;
                            const occurrenceStart = parseLocalISO(item.start);
                            const occurrenceEnd = parseLocalISO(item.end);
                            return !googleRecurrenceEvents.some(googleItem => {
                                const interval = googleEventInterval(googleItem);
                                return interval && occurrenceStart < interval.end && occurrenceEnd > interval.start;
                            });
                        });

                        if(!ocorrencias.length) { showToast('Todas as aulas desse período já estão agendadas.', 'info'); return; }
                        const skipped = recurrenceDates.length - ocorrencias.length;
                        const results = await Promise.allSettled(ocorrencias.map(async item => {
                            const ref = await addDoc(collection(db, "aulas"), item);
                            if(hasValidGoogleToken() && getConfig().googleAutoSync !== false) {
                                try { await syncAulaToGoogle({ id: ref.id, ...item }); }
                                catch(syncError) { console.error(`Falha Google Calendar na aula ${ref.id}`, syncError); }
                            }
                            return ref;
                        }));
                        const created = results.filter(result => result.status === 'fulfilled').length;
                        const failed = results.length - created;
                        if(!created) throw new Error('Nenhuma ocorrência foi criada.');
                        const details = [skipped ? `${skipped} ocorrência(s) com conflito ignorada(s)` : '', failed ? `${failed} falha(s)` : ''].filter(Boolean).join(' • ');
                        showToast(`${created} ${created === 1 ? 'aula agendada' : 'aulas agendadas'}${details ? ` — ${details}` : ''}!`, failed ? 'warning' : 'success', 5000);
                    } else {
                        const ref = await addDoc(collection(db, "aulas"), dados);
                        if(hasValidGoogleToken() && getConfig().googleAutoSync !== false) {
                            try { await syncAulaToGoogle({ id: ref.id, ...dados }); }
                            catch(syncError) { console.error(syncError); showToast('Aula criada no sistema, mas a sincronização com o Google falhou.', 'warning', 6000); }
                        }
                        showToast('Aula agendada!', 'success');
                    }
                }
                bootstrap.Modal.getInstance(document.getElementById('modalEvento')).hide();
            } catch (err) {
                console.error(err);
                showToast('Erro ao salvar aula.', 'error');
            }
        }

        async function atualizarDataEvento(info) {
            const event = info.event;
            const end = event.end || event.start;
            const conflicts = findSchedulingConflicts(event.start, end, event.id);
            if(conflicts.length) {
                info.revert();
                showToast(`Conflito de agenda com ${describeConflict(conflicts[0])}. A alteração foi desfeita.`, 'warning', 5000);
                return;
            }
            const googleRemoteConflicts = await findGoogleCalendarConflictsRemote(event.start, end, event.id);
            if(googleRemoteConflicts.length) {
                info.revert();
                showToast(`Conflito de agenda com ${describeConflict(googleRemoteConflicts[0])}. A alteração foi desfeita.`, 'warning', 6000);
                return;
            }
            try {
                const mudanca = {
                    start: toLocalISO(event.start),
                    end: event.end ? toLocalISO(event.end) : toLocalISO(event.start),
                    updatedAt: nowLocalISO()
                };
                await updateDoc(doc(db, "aulas", event.id), mudanca);
                const original = eventos.find(item => item.id === event.id);
                if(hasValidGoogleToken() && original && getConfig().googleAutoSync !== false) {
                    try { await syncAulaToGoogle({ ...original, ...mudanca, id: event.id }); }
                    catch(syncError) { console.error(syncError); showToast('Reagendado no sistema, mas o Google Calendar não atualizou.', 'warning', 6000); }
                }
                showToast('Aula reagendada!', 'info');
            } catch(e) {
                console.error(e);
                info.revert();
                showToast('Não foi possível reagendar. A alteração foi desfeita.', 'error', 5000);
            }
        }

        window.excluirEvento = async () => {
            const id = document.getElementById('eventoId').value;
            showConfirm('Excluir Aula', 'Tem certeza que deseja excluir esta aula?', async () => {
                const aula = eventos.find(item => item.id === id);
                if(aula?.googleCalendarEventId && hasValidGoogleToken()) {
                    try { await deleteGoogleEventById(aula.googleCalendarEventId); }
                    catch(syncError) { console.error(syncError); showToast('Não foi possível remover o evento do Google Calendar; a aula será removida somente do sistema.', 'warning', 7000); }
                } else if(aula?.googleCalendarEventId && !hasValidGoogleToken()) {
                    showToast('Google Calendar está desconectado; o evento correspondente poderá permanecer na agenda Google.', 'warning', 7000);
                }
                await deleteDoc(doc(db, "aulas", id)).catch(error => {
                    console.error(error);
                    showToast('Não foi possível excluir a aula. Tente novamente.', 'error', 5000);
                    throw error;
                });
                registrarAuditoria('aula.excluir', { tipo: 'aula', id }, { valor: Number(aula?.valor || 0), status: aula?.status || null, start: aula?.start || null });
                bootstrap.Modal.getInstance(document.getElementById('modalEvento')).hide();
                showToast('Aula excluída.', 'success');
            });
        }

        function renderCalendario() {
            calendar.removeAllEvents();
            const alunoFiltro = document.getElementById('calAlunoFiltro')?.value || 'todos';
            const sitFiltro = document.getElementById('calSitFiltro')?.value || 'todos';
            const pagFiltro = document.getElementById('calPagFiltro')?.value || 'todos';
            const modalidadeFiltro = document.getElementById('calModalidadeFiltro')?.value || 'todos';
            const buscaFiltro = normalizeSearch(document.getElementById('calBuscaFiltro')?.value || '');

            const eventosFiltrados = eventos.filter(e => {
                if(alunoFiltro !== 'todos' && e.alunoId !== alunoFiltro) return false;
                const sit = e.statusAula || 'agendada';
                if(sitFiltro !== 'todos' && sit !== sitFiltro) return false;
                const pag = e.status || 'pendente';
                if(pagFiltro !== 'todos' && pag !== pagFiltro) return false;
                const modalidade = e.modalidade || 'online';
                if(modalidadeFiltro !== 'todos' && modalidade !== modalidadeFiltro) return false;
                if(buscaFiltro) {
                    const haystack = normalizeSearch([e.alunoNome, e.title, e.local, e.obs, modalidade].filter(Boolean).join(' '));
                    if(!haystack.includes(buscaFiltro)) return false;
                }
                return true;
            });

            const colorMap = {
                agendada: '#3b5bdb',
                realizada: '#12b886',
                cancelada: '#fa5252',
                remarcada: '#f59f00',
                faltou: '#868e96'
            };

            const eventsMapped = eventosFiltrados.map(e => {
                const sit = e.statusAula || 'agendada';
                const bgColor = colorMap[sit] || colorMap.agendada;
                let displayTitle = e.title;
                if(e.status === 'pago') displayTitle = '💲 ' + displayTitle;
                if(e.googleCalendarSyncStatus === 'erro') displayTitle = '⚠ ' + displayTitle;
                else if(e.googleCalendarEventId) displayTitle = 'G✓ ' + displayTitle;
                const calendarClasses = [];
                if(e.googleCalendarSyncStatus === 'erro') calendarClasses.push('aula-google-error-event');
                else if(e.googleCalendarEventId) calendarClasses.push('aula-google-linked-event');

                return {
                    id: e.id, title: displayTitle, start: e.start, end: e.end,
                    backgroundColor: bgColor, borderColor: bgColor,
                    classNames: calendarClasses,
                    extendedProps: { alunoId: e.alunoId, valor: e.valor, status: e.status, statusAula: sit, forma: e.forma, modalidade: e.modalidade, local: e.local, obs: e.obs, googleCalendarSyncStatus: e.googleCalendarSyncStatus, googleCalendarEventId: e.googleCalendarEventId }
                };
            });
            const googleMapped = googleCalendarFullCalendarEvents();
            calendar.addEventSource([...eventsMapped, ...eventosCalendarioHorariosPresos(), ...googleMapped]);
            const resumo = document.getElementById('calFiltroResumo');
            if(resumo) {
                const active = [alunoFiltro, sitFiltro, pagFiltro, modalidadeFiltro].filter(v => v !== 'todos').length + (buscaFiltro ? 1 : 0);
                const googleLinked = eventos.filter(e => e.googleCalendarEventId).length;
                const googleErrors = eventos.filter(e => e.googleCalendarSyncStatus === 'erro').length;
                resumo.innerHTML = `<i class="fas fa-filter"></i> ${eventosFiltrados.length} de ${eventos.length} ${eventos.length === 1 ? 'aula' : 'aulas'} • ${horariosPresos.length} ${horariosPresos.length === 1 ? 'bloqueio local' : 'bloqueios locais'}${hasValidGoogleToken() ? ` • ${googleMapped.length} bloqueio(s) Google • ${googleLinked} aula(s) vinculada(s)${googleErrors ? ` • ${googleErrors} erro(s) de sync` : ''}` : ''}${active ? ` • ${active} ${active === 1 ? 'filtro ativo' : 'filtros ativos'}` : ''}`;
            }
        }

        // ============================
        // DESPESAS
        // ============================
        window.salvarDespesa = async () => {
            const form = document.getElementById('formDespesa');
            if(!form.reportValidity()) return;
            const desc = document.getElementById('despesaDesc').value.trim();
            const valor = Number(document.getElementById('despesaValor').value);
            const data = document.getElementById('despesaData').value;
            
            if(!desc || !Number.isFinite(valor) || valor <= 0 || !data) { showToast('Preencha os campos com uma despesa válida.', 'warning'); return; }

            try {
                await addDoc(collection(db, "despesas"), { descricao: desc, valor, data, tipo: 'saida', organizationId: currentOrgId(), createdAt: nowLocalISO(), updatedAt: nowLocalISO() });
                bootstrap.Modal.getInstance(document.getElementById('modalDespesa')).hide();
                document.getElementById('formDespesa').reset();
                showToast('Despesa registrada!', 'success');
            } catch(e) { showToast('Erro ao salvar despesa.', 'error'); }
        }

        window.deletarDespesa = (id) => {
            showConfirm('Excluir Despesa', 'Deseja excluir esta despesa?', async () => {
                try {
                    const despesaRemovida = despesas.find(item => item.id === id);
                    await deleteDoc(doc(db, "despesas", id));
                    registrarAuditoria('despesa.excluir', { tipo: 'despesa', id }, { valor: Number(despesaRemovida?.valor || 0), data: despesaRemovida?.data || null });
                    showToast('Despesa excluída.', 'success');
                } catch(e) { showToast('Erro ao excluir.', 'error'); }
            });
        }

        // ============================
        // FINANCEIRO
        // ============================
        function renderFinanceiro() {
            const tbody = document.querySelector('#tabelaFinanceiro tbody');
            tbody.innerHTML = '';

            const filtroMes = document.getElementById('filtroMesFin')?.value || 'todos';
            const ini = document.getElementById('finIni')?.value || '';
            const fim = document.getElementById('finFim')?.value || '';
            const alunoFiltro = document.getElementById('finAluno')?.value || 'todos';
            const tipoFiltro = document.getElementById('finTipo')?.value || 'todos';
            const statusPagFiltro = document.getElementById('finStatusPag')?.value || 'todos';
            const statusAulaFiltro = document.getElementById('finStatusAula')?.value || 'todos';
            const busca = normalizeSearch(document.getElementById('finBusca')?.value || '');
            const hojeYmd = ymdLocal(new Date());

            const matchDate = (ymd) => {
                if(!ymd) return false;
                if(filtroMes !== 'todos' && !ymd.startsWith(filtroMes)) return false;
                if(ini && ymd < ini) return false;
                if(fim && ymd > fim) return false;
                return true;
            };

            const listaUnificada = [];

            eventos.forEach(e => {
                const data = (e.start || '').split('T')[0];
                if(!matchDate(data)) return;
                const horaIni = isoToHHMM(e.start);
                const horaFim = isoToHHMM(e.end);
                const sit = (e.statusAula || 'agendada');
                const desc = `${horaIni}${horaFim ? '–' + horaFim : ''} • ${e.alunoNome}`;

                listaUnificada.push({ id: e.id, data, desc, tipo: 'entrada', valor: Number(e.valor || 0), status: e.status || 'pendente', statusAula: sit, alunoId: e.alunoId, raw: e });
            });

            despesas.forEach(d => {
                if(!matchDate(d.data)) return;
                listaUnificada.push({ id: d.id, data: d.data, desc: d.descricao, tipo: 'saida', valor: Number(d.valor || 0), status: 'pago', statusAula: '-', raw: d });
            });

            let filtrada = listaUnificada.filter(item => {
                if(tipoFiltro !== 'todos' && item.tipo !== tipoFiltro) return false;
                if(alunoFiltro !== 'todos') { if(item.tipo !== 'entrada' || item.alunoId !== alunoFiltro) return false; }
                if(statusPagFiltro !== 'todos') {
                    if(statusPagFiltro === 'atrasado') {
                        if(item.tipo !== 'entrada' || item.status !== 'pendente' || item.data >= hojeYmd || item.statusAula === 'cancelada') return false;
                    } else if(item.tipo === 'entrada') {
                        if(item.status !== statusPagFiltro) return false;
                    } else if(statusPagFiltro !== 'pago') return false;
                }
                if(statusAulaFiltro !== 'todos') {
                    if(item.tipo === 'entrada' && item.statusAula !== statusAulaFiltro) return false;
                    if(item.tipo === 'saida') return false;
                }
                if(busca && !normalizeSearch([item.desc, item.tipo, item.status, item.statusAula].join(' ')).includes(busca)) return false;
                return true;
            });

            filtrada.sort((a,b) => {
                const da = parseYMD(a.data), db2 = parseYMD(b.data);
                if(db2 - da !== 0) return db2 - da;
                if(a.tipo === 'entrada' && b.tipo === 'entrada') return (parseLocalISO(b.raw.start) || 0) - (parseLocalISO(a.raw.start) || 0);
                return 0;
            });
            ultimoFinanceiroFiltrado = filtrada;

            let totalRecebido = 0, totalPendente = 0, totalSaida = 0;

            filtrada.forEach(item => {
                if(item.tipo === 'entrada') {
                    if(item.status === 'pago') totalRecebido += item.valor;
                    if(item.status === 'pendente' && item.statusAula !== 'cancelada') totalPendente += item.valor;
                } else { totalSaida += item.valor; }
            });

            if(filtrada.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-receipt"></i><p>Nenhuma movimentação encontrada</p></div></td></tr>`;
            } else {
                filtrada.forEach(item => {
                    const isEntrada = item.tipo === 'entrada';
                    const corValor = isEntrada ? 'color:var(--success)' : 'color:var(--danger)';
                    const sinal = isEntrada ? '+' : '-';

                    let btnZap = '';
                    if(isEntrada && item.status === 'pendente' && item.statusAula !== 'cancelada') {
                        const aluno = alunos.find(a => a.id === item.alunoId);
                        if(aluno?.tel) {
                            let telDigits = aluno.tel.replace(/\D/g,'');
                            if(telDigits.startsWith('55')) telDigits = telDigits.slice(2);
                            const msg = `Olá ${aluno.nome}!\n\nLembrete de pagamento da aula de ${aluno.materia}.\n\nObrigado!`;
                            btnZap = `<a href="https://wa.me/55${telDigits}?text=${encodeURIComponent(msg)}" target="_blank" class="btn btn-icon btn-ghost" title="WhatsApp"><i class="fab fa-whatsapp" style="color:var(--success)"></i></a>`;
                        }
                    }

                    let btnRecibo = isEntrada ? `<button class="btn btn-icon btn-ghost" onclick="gerarReciboUnico('${item.id}')" title="Recibo"><i class="fas fa-file-invoice" style="color:var(--info)"></i></button>` : '';
                    let btnPix = plataforma.pixAulaEnabled && isEntrada && item.status !== 'pago' && item.statusAula !== 'cancelada' ? `<button class="btn btn-icon btn-ghost" onclick="gerarPixParaAula('${item.id}')" title="Gerar Pix seguro"><i class="fas fa-qrcode" style="color:var(--primary)"></i></button>` : '';
                    let btnDelete = !isEntrada ? `<button class="btn btn-icon btn-ghost" onclick="deletarDespesa('${item.id}')" title="Excluir"><i class="fas fa-trash" style="color:var(--danger)"></i></button>` : '';
                    let btnPagamento = '';
                    if(isEntrada && item.statusAula !== 'cancelada') {
                        const nextStatus = item.status === 'pago' ? 'pendente' : 'pago';
                        const icon = item.status === 'pago' ? 'fa-undo' : 'fa-check';
                        const label = item.status === 'pago' ? 'Voltar para pendente' : 'Marcar como pago';
                        btnPagamento = `<button class="btn btn-icon btn-ghost" onclick="alternarPagamento('${item.id}','${nextStatus}')" title="${label}"><i class="fas ${icon}" style="color:var(--success)"></i></button>`;
                    }

                    let badgeSit = '-';
                    if(isEntrada) {
                        badgeSit = `<span class="badge-status ${item.statusAula}">${item.statusAula}</span>`;
                    }
                    const isAtrasado = isEntrada && item.status === 'pendente' && item.data < hojeYmd && item.statusAula !== 'cancelada';
                    const badgePag = isAtrasado
                        ? '<span class="badge-status atrasado">em atraso</span>'
                        : `<span class="badge-status ${item.status}">${item.status}</span>`;
                    const tipoLabel = isEntrada ? '<span style="color:var(--success);font-weight:600;font-size:0.78rem"><i class="fas fa-arrow-down me-1"></i>Entrada</span>' : '<span style="color:var(--danger);font-weight:600;font-size:0.78rem"><i class="fas fa-arrow-up me-1"></i>Saída</span>';

                    tbody.innerHTML += `<tr>
                        <td style="white-space:nowrap">${formatData(item.data)}</td>
                        <td style="font-weight:500">${escapeHtml(item.desc)}</td>
                        <td>${tipoLabel}</td>
                        <td style="${corValor};font-weight:700">${sinal} ${formatMoney(item.valor)}</td>
                        <td>${badgeSit}</td>
                        <td>${badgePag}</td>
                        <td class="text-end" style="white-space:nowrap">${btnPix}${btnPagamento}${btnRecibo}${btnZap}${btnDelete}</td>
                    </tr>`;
                });
            }

            const saldo = totalRecebido - totalSaida;
            const previsto = (totalRecebido + totalPendente) - totalSaida;

            document.getElementById('totalRecebido').innerText = formatMoney(totalRecebido);
            document.getElementById('totalPendente').innerText = formatMoney(totalPendente);
            document.getElementById('saldoGeral').innerText = formatMoney(saldo);
            const elPrev = document.getElementById('saldoPrevisto');
            if(elPrev) elPrev.innerText = `Previsto: ${formatMoney(previsto)}`;
            const resumo = document.getElementById('finFiltroResumo');
            if(resumo) resumo.textContent = `${filtrada.length} ${filtrada.length === 1 ? 'lançamento' : 'lançamentos'}`;
        }

        window.alternarPagamento = async (id, nextStatus) => {
            const evento = eventos.find(e => e.id === id);
            if(!evento) { showToast('Aula não encontrada.', 'error'); return; }
            try {
                await updateDoc(doc(db, "aulas", id), {
                    status: nextStatus,
                    pagoEm: nextStatus === 'pago' ? (evento.pagoEm || nowLocalISO()) : null,
                    updatedAt: nowLocalISO()
                });
                registrarAuditoria('aula.pagamento', { tipo: 'aula', id }, { de: evento.status || 'pendente', para: nextStatus, valor: Number(evento.valor || 0) });
                showToast(nextStatus === 'pago' ? 'Pagamento confirmado!' : 'Pagamento marcado como pendente.', nextStatus === 'pago' ? 'success' : 'info');
            } catch(e) {
                console.error(e);
                showToast('Não foi possível atualizar o pagamento.', 'error');
            }
        }

        window.exportarFinanceiroCSV = () => {
            if(!ultimoFinanceiroFiltrado.length) { showToast('Não há lançamentos para exportar.', 'warning'); return; }
            const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
            const rows = [['Data','Descrição','Tipo','Valor','Situação da aula','Pagamento']];
            ultimoFinanceiroFiltrado.forEach(item => rows.push([
                formatData(item.data),
                item.desc,
                item.tipo === 'entrada' ? 'Entrada' : 'Saída',
                Number(item.valor || 0).toFixed(2).replace('.', ','),
                item.tipo === 'entrada' ? item.statusAula : '-',
                item.status
            ]));
            const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n');
            const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `financeiro_${ymdLocal(new Date())}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            showToast('Extrato CSV exportado!', 'success');
        }

        // ============================
        // PDFs
        // ============================
        window.jsPDF = window.jspdf.jsPDF;

        function formatMoney(v) {
            return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        function duracaoMinutos(startIso, endIso) {
            const s = parseLocalISO(startIso), e = parseLocalISO(endIso);
            if(!s || !e) return 0;
            return Math.max(0, Math.round((e - s) / 60000));
        }

        function pdfHeader(doc, titulo, linhas = []) {
            const cfg = getConfig();
            doc.setFontSize(12);
            doc.text(String(cfg.escola || 'Aulas Particulares'), 14, 14);
            doc.setFontSize(9);
            const contato = [cfg.professor ? `Professor: ${cfg.professor}` : null, cfg.whatsapp ? `WhatsApp: ${cfg.whatsapp}` : null, cfg.email ? `E-mail: ${cfg.email}` : null].filter(Boolean).join('  •  ');
            if(contato) doc.text(contato, 14, 20);
            doc.setLineWidth(0.5);
            doc.line(14, 23, 196, 23);
            doc.setFontSize(16);
            doc.text(titulo, 14, 33);
            doc.setFontSize(10);
            let y = 40;
            (linhas || []).forEach(l => { doc.text(String(l), 14, y); y += 6; });
            return y + 2;
        }

        function pdfFooter(doc) {
            const cfg = getConfig();
            const h = doc.internal.pageSize.getHeight();
            doc.setFontSize(9);
            if(cfg.msg) doc.text(String(cfg.msg), 14, h - 18);
            if(cfg.pix) doc.text(`Chave Pix: ${cfg.pix}`, 14, h - 10);
        }

        window.gerarReciboUnico = (eventoId) => {
            const ev = eventos.find(e => e.id === eventoId);
            if(!ev) return;
            const aluno = alunos.find(a => a.id === ev.alunoId);
            const materia = aluno?.materia || '';
            const doc = new jsPDF();
            const y0 = pdfHeader(doc, "RECIBO DE PAGAMENTO", [
                `Aluno: ${ev.alunoNome}${materia ? '  •  Matéria: ' + materia : ''}`,
                `Data: ${formatData(ev.start.split('T')[0])}  •  Horário: ${isoToHHMM(ev.start)}${ev.end ? '–' + isoToHHMM(ev.end) : ''}`,
            ]);
            let y = y0 + 6;
            doc.setFontSize(11);
            doc.text(`Valor: ${formatMoney(ev.valor)}`, 14, y); y += 7;
            doc.text(`Status do pagamento: ${String(ev.status || '').toUpperCase()}`, 14, y); y += 7;
            doc.text(`Forma: ${String(ev.forma || '-').toUpperCase()}`, 14, y); y += 7;
            doc.text(`Pago em: ${ev.pagoEm ? (formatData(ev.pagoEm.split('T')[0]) + ' ' + isoToHHMM(ev.pagoEm)) : '-'}`, 14, y); y += 7;
            doc.text(`Situação da aula: ${String(ev.statusAula || 'agendada').toUpperCase()}`, 14, y); y += 7;
            if(ev.modalidade || ev.local) { doc.text(`Modalidade/Local: ${(ev.modalidade || '-').toUpperCase()}${ev.local ? ' • ' + ev.local : ''}`, 14, y); y += 7; }
            if(ev.obs) { doc.setFontSize(10); doc.text(`Observações: ${String(ev.obs).slice(0, 140)}`, 14, y); y += 7; }
            doc.setLineWidth(0.5);
            doc.line(14, y + 18, 196, y + 18);
            doc.setFontSize(10);
            doc.text("Assinatura do Professor", 105, y + 26, null, null, "center");
            pdfFooter(doc);
            doc.save(`recibo_${ev.alunoNome}_${ev.start.split('T')[0]}.pdf`);
            showToast('Recibo gerado!', 'success');
        }

        window.gerarRelatorioPaisAvancado = () => {
            const alunoId = document.getElementById('relatorioAluno')?.value;
            const inicio = document.getElementById('relatorioInicio')?.value;
            const fim = document.getElementById('relatorioFim')?.value;
            const incluirAgendadas = !!document.getElementById('relIncluirAgendadas')?.checked;
            const incluirRemarcadas = !!document.getElementById('relIncluirRemarcadas')?.checked;
            const incluirCanceladas = !!document.getElementById('relIncluirCanceladas')?.checked;
            const incluirObs = !!document.getElementById('relIncluirObs')?.checked;
            const aluno = alunos.find(a => a.id === alunoId);

            if(!alunoId || !inicio || !fim) { showToast('Preencha aluno e período.', 'warning'); return; }
            if(!aluno) { showToast('Aluno inválido.', 'error'); return; }

            const allowed = new Set(['realizada']);
            if(incluirAgendadas) allowed.add('agendada');
            if(incluirRemarcadas) allowed.add('remarcada');
            if(incluirCanceladas) allowed.add('cancelada');

            const aulasFiltradas = eventos.filter(e => {
                const d = (e.start||'').split('T')[0];
                const sit = e.statusAula || 'agendada';
                return e.alunoId === alunoId && d >= inicio && d <= fim && allowed.has(sit);
            }).sort((a,b) => (parseLocalISO(a.start)||0) - (parseLocalISO(b.start)||0));

            const cobraveis = aulasFiltradas.filter(e => (e.statusAula||'agendada') !== 'cancelada');
            const totalValor = cobraveis.reduce((s,e) => s + Number(e.valor||0), 0);
            const totalPago = cobraveis.filter(e => e.status==='pago').reduce((s,e) => s + Number(e.valor||0), 0);
            const totalPend = cobraveis.filter(e => e.status!=='pago').reduce((s,e) => s + Number(e.valor||0), 0);
            const qtdR = aulasFiltradas.filter(e=>(e.statusAula||'agendada')==='realizada').length;
            const qtdA = aulasFiltradas.filter(e=>(e.statusAula||'agendada')==='agendada').length;
            const qtdRm = aulasFiltradas.filter(e=>(e.statusAula||'agendada')==='remarcada').length;
            const qtdC = aulasFiltradas.filter(e=>(e.statusAula||'agendada')==='cancelada').length;

            const d = new jsPDF();
            const y0 = pdfHeader(d, "RELATÓRIO DE AULAS", [`Aluno: ${aluno.nome}  •  Matéria: ${aluno.materia||'-'}`, `Período: ${formatData(inicio)} a ${formatData(fim)}`]);
            let y = y0 + 4;
            d.setFontSize(10);
            d.text(`Aulas: ${aulasFiltradas.length}  (Realizadas: ${qtdR} • Agendadas: ${qtdA} • Remarcadas: ${qtdRm}${incluirCanceladas ? ' • Canceladas: '+qtdC : ''})`, 14, y); y += 6;
            d.text(`Financeiro: Pago: ${formatMoney(totalPago)}  •  Pendente: ${formatMoney(totalPend)}  •  Total: ${formatMoney(totalValor)}`, 14, y); y += 4;

            const head = incluirObs ? [['Data','Horário','Duração','Situação','Pag.','Valor','Obs.']] : [['Data','Horário','Duração','Situação','Pag.','Valor']];
            const body = aulasFiltradas.map(e => {
                const data = (e.start||'').split('T')[0];
                const row = [formatData(data), `${isoToHHMM(e.start)}${e.end?'–'+isoToHHMM(e.end):''}`, `${duracaoMinutos(e.start,e.end)} min`, String(e.statusAula||'agendada').toUpperCase(), String(e.status||'pendente').toUpperCase(), (e.statusAula==='cancelada')?'—':formatMoney(e.valor)];
                if(incluirObs) row.push(String(e.obs||'').slice(0,80));
                return row;
            });

            d.autoTable({ head, body, startY: y+6, theme:'grid', styles:{fontSize:9,cellPadding:2,overflow:'linebreak'}, headStyles:{fillColor:[240,240,240],textColor:0}, columnStyles: incluirObs ? {6:{cellWidth:55}} : {} });
            pdfFooter(d);
            d.save(`relatorio_${aluno.nome}_${inicio}_a_${fim}.pdf`);
            try { localStorage.setItem('pg_onb_relatorio', '1'); } catch(e) {}
            showToast('Relatório gerado!', 'success');
        }

        window.gerarExtratoPais = () => window.gerarRelatorioPaisAvancado();

        window.gerarAgendaAlunoPDF = () => {
            const alunoId = document.getElementById('agendaAluno')?.value;
            const semanas = Number(document.getElementById('agendaSemanas')?.value || 4);
            const modo = document.getElementById('agendaSit')?.value || 'agendada_remarcada';
            const aluno = alunos.find(a => a.id === alunoId);

            if(!alunoId) { showToast('Selecione um aluno.', 'warning'); return; }
            if(!aluno) { showToast('Aluno inválido.', 'error'); return; }

            const now = new Date();
            const ini = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
            const fim = new Date(ini.getTime()); fim.setDate(fim.getDate() + (semanas*7)); fim.setHours(23,59,59,999);

            const allowed = new Set();
            if(modo === 'somente_agendada') allowed.add('agendada');
            else if(modo === 'todas') { ['agendada','remarcada','realizada','cancelada'].forEach(s=>allowed.add(s)); }
            else { allowed.add('agendada'); allowed.add('remarcada'); }

            const lista = eventos.filter(e => {
                if(e.alunoId !== alunoId) return false;
                const d = parseLocalISO(e.start);
                if(!d || d < ini || d > fim) return false;
                return allowed.has(e.statusAula || 'agendada');
            }).sort((a,b) => (parseLocalISO(a.start)||0) - (parseLocalISO(b.start)||0));

            const d = new jsPDF();
            const y0 = pdfHeader(d, "AGENDA DO ALUNO", [`Aluno: ${aluno.nome}  •  Matéria: ${aluno.materia||'-'}`, `Período: ${formatData(ymdLocal(ini))} a ${formatData(ymdLocal(fim))}`]);
            const body = lista.map(e => [formatData((e.start||'').split('T')[0]), `${isoToHHMM(e.start)}${e.end?'–'+isoToHHMM(e.end):''}`, `${duracaoMinutos(e.start,e.end)} min`, String(e.statusAula||'agendada').toUpperCase(), String(e.modalidade||'-').toUpperCase(), String(e.local||'').slice(0,45)]);
            d.autoTable({ head:[['Data','Horário','Duração','Situação','Modalidade','Local']], body, startY:y0+10, theme:'grid', styles:{fontSize:9,cellPadding:2,overflow:'linebreak'}, headStyles:{fillColor:[240,240,240],textColor:0}, columnStyles:{5:{cellWidth:70}} });
            pdfFooter(d);
            d.save(`agenda_${aluno.nome}_${semanas}semanas.pdf`);
            showToast('Agenda gerada!', 'success');
        }

        window.exportAgendaPDFRef = () => {
            const ref = document.getElementById('agendaSemanaRef')?.value;
            const base = ref ? parseYMD(ref) : new Date();
            const startW = startOfWeekMonday(base);
            const endW = endOfWeekSunday(base);
            const d = new jsPDF();
            const y0 = pdfHeader(d, "AGENDA SEMANAL (GERAL)", [`Semana: ${formatData(ymdLocal(startW))} a ${formatData(ymdLocal(endW))}`]);
            const eventosSemana = eventos.filter(e => { const dt = parseLocalISO(e.start); return dt && dt >= startW && dt <= endW; }).sort((a,b) => (parseLocalISO(a.start)||0) - (parseLocalISO(b.start)||0));
            const body = eventosSemana.map(e => [formatData((e.start||'').split('T')[0]), `${isoToHHMM(e.start)}${e.end?'–'+isoToHHMM(e.end):''}`, e.alunoNome, String(e.statusAula||'agendada').toUpperCase(), String(e.status||'pendente').toUpperCase(), formatMoney(e.valor)]);
            d.autoTable({ head:[['Data','Horário','Aluno','Situação','Pag.','Valor']], body, startY:y0+10, theme:'grid', styles:{fontSize:9,cellPadding:2}, headStyles:{fillColor:[240,240,240],textColor:0}, columnStyles:{2:{cellWidth:55}} });
            pdfFooter(d);
            d.save('agenda_semanal.pdf');
            showToast('Agenda semanal gerada!', 'success');
        }
        window.exportAgendaPDF = () => window.exportAgendaPDFRef();

        // ============================
        // HELPERS
        // ============================
        function formatData(isoDate) {
            if(!isoDate) return '';
            const [a,m,d] = isoDate.split('-');
            return `${d}/${m}/${a}`;
        }
        function normalizeSearch(value) {
            return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
        }
        function escapeHtml(value) {
            return String(value ?? '').replace(/[&<>"']/g, char => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
            })[char]);
        }
        function pad2(n) { return String(n).padStart(2, '0'); }
        function toLocalISO(dateObj) {
            return `${dateObj.getFullYear()}-${pad2(dateObj.getMonth()+1)}-${pad2(dateObj.getDate())}T${pad2(dateObj.getHours())}:${pad2(dateObj.getMinutes())}:${pad2(dateObj.getSeconds())}`;
        }
        function nowLocalISO() { return toLocalISO(new Date()); }
        function parseLocalISO(iso) {
            if(!iso) return null;
            const [datePart, timePart = '00:00:00'] = String(iso).split('T');
            const [y,m,d] = datePart.split('-').map(Number);
            const [hh=0,mm=0,ss=0] = timePart.split(':').map(Number);
            if(!y||!m||!d) return null;
            return new Date(y, m-1, d, hh, mm, ss);
        }
        function parseYMD(ymd) {
            if(!ymd) return new Date(0);
            const [y,m,d] = String(ymd).split('-').map(Number);
            return new Date(y, m-1, d, 12, 0, 0, 0);
        }
        function isoToHHMM(iso) { return (String(iso||'').split('T')[1]||'').slice(0,5); }
        function ymdLocal(dateObj) { return `${dateObj.getFullYear()}-${pad2(dateObj.getMonth()+1)}-${pad2(dateObj.getDate())}`; }
        function startOfWeekMonday(dateObj) {
            const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 12,0,0,0);
            d.setDate(d.getDate() - ((d.getDay()+6)%7));
            d.setHours(0,0,0,0);
            return d;
        }
        function endOfWeekSunday(dateObj) {
            const s = startOfWeekMonday(dateObj);
            s.setDate(s.getDate()+6);
            s.setHours(23,59,59,999);
            return s;
        }

        // ============================
        // FILTROS RÁPIDOS
        // ============================
        window.setFinQuickRange = (mode) => {
            const iniEl = document.getElementById('finIni');
            const fimEl = document.getElementById('finFim');
            if(!iniEl || !fimEl) return;
            const now = new Date();
            let ini = null, fim = null;
            if(mode === 'hoje') { ini = new Date(now.getFullYear(), now.getMonth(), now.getDate()); fim = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999); }
            else if(mode === 'semana') { ini = startOfWeekMonday(now); fim = endOfWeekSunday(now); }
            else if(mode === 'mes') { ini = new Date(now.getFullYear(), now.getMonth(), 1); fim = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999); }
            else if(mode === '30d') { fim = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999); ini = new Date(fim.getTime()); ini.setDate(ini.getDate()-29); ini.setHours(0,0,0,0); }
            if(ini && fim) {
                iniEl.value = ymdLocal(ini);
                fimEl.value = ymdLocal(fim);
                const monthEl = document.getElementById('filtroMesFin');
                if(monthEl) monthEl.value = 'todos';
                renderFinanceiro();
            }
        }

        window.setFinanceMonthFilter = () => {
            const monthEl = document.getElementById('filtroMesFin');
            if(monthEl?.value !== 'todos') {
                const iniEl = document.getElementById('finIni');
                const fimEl = document.getElementById('finFim');
                if(iniEl) iniEl.value = '';
                if(fimEl) fimEl.value = '';
            }
            renderFinanceiro();
        }

        window.setFinanceDateFilter = () => {
            const ini = document.getElementById('finIni')?.value || '';
            const fim = document.getElementById('finFim')?.value || '';
            const monthEl = document.getElementById('filtroMesFin');
            if((ini || fim) && monthEl) monthEl.value = 'todos';
            if(ini && fim && ini > fim) showToast('A data inicial deve ser anterior à data final.', 'warning');
            renderFinanceiro();
        }

        window.limparFiltrosFinanceiro = () => {
            ['finIni','finFim','finBusca'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
            ['finAluno','finTipo','finStatusPag','finStatusAula','filtroMesFin'].forEach(id => { const el = document.getElementById(id); if(el) el.value = 'todos'; });
            renderFinanceiro();
        }

        window.limparFiltrosCalendario = () => {
            ['calAlunoFiltro','calSitFiltro','calPagFiltro','calModalidadeFiltro'].forEach(id => { const el = document.getElementById(id); if(el) el.value = 'todos'; });
            const buscaEl = document.getElementById('calBuscaFiltro');
            if(buscaEl) buscaEl.value = '';
            renderCalendario();
        }

        window.setRelatorioQuickRange = (mode) => {
            const iniEl = document.getElementById('relatorioInicio');
            const fimEl = document.getElementById('relatorioFim');
            if(!iniEl || !fimEl) return;
            const now = new Date();
            let ini = null, fim = null;
            if(mode === 'mes') { ini = new Date(now.getFullYear(), now.getMonth(), 1); fim = new Date(now.getFullYear(), now.getMonth()+1, 0); }
            else if(mode === '30d') { fim = new Date(now.getFullYear(), now.getMonth(), now.getDate()); ini = new Date(fim.getTime()); ini.setDate(ini.getDate()-29); }
            else if(mode === 'mesAnterior') { ini = new Date(now.getFullYear(), now.getMonth()-1, 1); fim = new Date(now.getFullYear(), now.getMonth(), 0); }
            if(ini && fim) { iniEl.value = ymdLocal(ini); fimEl.value = ymdLocal(fim); }
        }

        function initQuickDefaults() {
            const el = document.getElementById('agendaSemanaRef');
            if(el && !el.value) el.value = ymdLocal(new Date());
            const iniEl = document.getElementById('relatorioInicio');
            const fimEl = document.getElementById('relatorioFim');
            if(iniEl && fimEl && (!iniEl.value || !fimEl.value)) {
                const now = new Date();
                iniEl.value = ymdLocal(new Date(now.getFullYear(), now.getMonth(), 1));
                fimEl.value = ymdLocal(new Date(now.getFullYear(), now.getMonth()+1, 0));
            }
        }

        function monthKeyToLabel(ym) { const [y,m] = ym.split('-'); return `${m}/${y}`; }

        function refreshFiltroMesFinOptions() {
            const sel = document.getElementById('filtroMesFin');
            if(!sel) return;
            const current = sel.value || 'todos';
            const months = new Set();
            eventos.forEach(e => { const d = (e.start||'').split('T')[0]; if(d?.length >= 7) months.add(d.slice(0,7)); });
            despesas.forEach(d => { if(d.data?.length >= 7) months.add(d.data.slice(0,7)); });
            const sorted = Array.from(months).sort().reverse();
            sel.innerHTML = '<option value="todos">Todos os Períodos</option>' + sorted.map(ym => `<option value="${ym}">${monthKeyToLabel(ym)}</option>`).join('');
            sel.value = sorted.includes(current) ? current : 'todos';
        }

        function renderSelectAlunos() {
            const map = [
                { el: document.getElementById('eventoAluno'), first: '<option value="">Selecione...</option>' },
                { el: document.getElementById('relatorioAluno'), first: '<option value="">Selecione...</option>' },
                { el: document.getElementById('agendaAluno'), first: '<option value="">Selecione...</option>' },
                { el: document.getElementById('calAlunoFiltro'), first: '<option value="todos">Todos os alunos</option>' },
                { el: document.getElementById('finAluno'), first: '<option value="todos">Todos os alunos</option>' },
                { el: document.getElementById('pedAlunoFiltro'), first: '<option value="">Selecione um aluno</option>' },
                { el: document.getElementById('pacoteAluno'), first: '<option value="">Selecione um aluno</option>' },
                { el: document.getElementById('msgAluno'), first: '<option value="">Selecione um aluno</option>' },
                { el: document.getElementById('portalAluno'), first: '<option value="">Selecione um aluno</option>' },
                { el: document.getElementById('inviteAluno'), first: '<option value="">Selecione um aluno</option>' },
            ];
            map.forEach(({el, first}) => {
                if(!el) return;
                const current = el.value;
                el.innerHTML = first + alunos.map(a => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.nome)}</option>`).join('');
                if(Array.from(el.options).some(option => option.value === current)) el.value = current;
            });
            renderPedagogicoAulas();
        }

        // As funções chamadas pelos controles HTML precisam estar expostas porque este script é um módulo.
        // Segurança de histórico: não permita criar aulas órfãs ao excluir um aluno com atendimentos vinculados.
        window.deletarAluno = async (id) => {
            const aluno = alunos.find(a => a.id === id);
            if(!aluno) return;
            const aulasVinculadas = eventos.filter(e => e.alunoId === id).length;
            if(aulasVinculadas) {
                showToast(`Não é possível excluir ${aluno.nome}: há ${aulasVinculadas} aula(s) no histórico.`, 'warning', 6000);
                return;
            }
            showConfirm('Excluir aluno', `Excluir <strong>${escapeHtml(aluno.nome)}</strong>?`, async () => {
                try {
                    await deleteDoc(doc(db, 'alunos', id));
                    registrarAuditoria('aluno.excluir', { tipo: 'aluno', id });
                    showToast('Aluno excluído.', 'success');
                } catch(error) {
                    console.error(error);
                    showToast('Não foi possível excluir o aluno.', 'error', 5000);
                }
            });
        };

        // ============================
        // PEDAGOGICAL RECORDS, CREDITS AND COMMUNICATION
        // ============================
        function renderPedagogicoAulas() {
            const select = document.getElementById('pedAula');
            if(!select) return;
            const current = select.value;
            const options = eventos.slice().sort((a,b) => (parseLocalISO(b.start)||0) - (parseLocalISO(a.start)||0)).map(evento => {
                const data = formatData(String(evento.start || '').split('T')[0]);
                return `<option value="${escapeHtml(evento.id)}">${escapeHtml(data)} · ${escapeHtml(isoToHHMM(evento.start))} · ${escapeHtml(evento.alunoNome || 'Aluno')}</option>`;
            }).join('');
            select.innerHTML = '<option value="">Selecione uma aula</option>' + options;
            if(Array.from(select.options).some(option => option.value === current)) select.value = current;
        }

        function renderPedagogico() {
            renderPedagogicoAulas();
            const alunoId = document.getElementById('pedAlunoFiltro')?.value || '';
            const history = document.getElementById('pedHistorico');
            if(!history) return;
            const aulasAluno = eventos.filter(evento => evento.alunoId === alunoId && (evento.statusAula || '') !== 'cancelada');
            const concluidas = aulasAluno.filter(evento => evento.presenca || evento.statusAula === 'realizada');
            const presentes = aulasAluno.filter(evento => evento.presenca === 'presente' || (evento.statusAula === 'realizada' && !evento.presenca));
            const emAtencao = aulasAluno.filter(evento => evento.progresso === 'atencao').length;
            const frequencia = concluidas.length ? Math.round((presentes.length / concluidas.length) * 100) : 0;
            document.getElementById('pedFrequencia').textContent = alunoId ? `${frequencia}%` : '—';
            document.getElementById('pedConcluidas').textContent = alunoId ? String(concluidas.length) : '0';
            document.getElementById('pedAtencao').textContent = alunoId ? String(emAtencao) : '0';
            if(!alunoId) { history.innerHTML = '<div class="empty-state"><i class="fas fa-book-reader"></i><p>Selecione um aluno para visualizar o acompanhamento.</p></div>'; return; }
            const registros = aulasAluno.filter(evento => evento.conteudo || evento.presenca).sort((a,b) => (parseLocalISO(b.start)||0) - (parseLocalISO(a.start)||0));
            if(!registros.length) { history.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard"></i><p>Ainda não há registros pedagógicos para este aluno.</p></div>'; return; }
            history.innerHTML = registros.slice(0, 10).map(evento => {
                const situacao = evento.presenca || (evento.statusAula === 'realizada' ? 'presente' : 'sem registro');
                const cor = situacao === 'presente' ? 'active' : '';
                return `<div class="timeline-note"><div class="d-flex justify-content-between gap-2"><strong><span class="status-dot ${cor}"></span>${escapeHtml(formatData(String(evento.start || '').split('T')[0]))}</strong><span class="badge bg-light text-dark">${escapeHtml(situacao.replace('_', ' '))}</span></div><div class="small mt-1"><strong>Conteúdo:</strong> ${escapeHtml(evento.conteudo || 'Não registrado')}</div>${evento.tarefa ? `<div class="small mt-1"><strong>Tarefa:</strong> ${escapeHtml(evento.tarefa)}</div>` : ''}${evento.proximaAcao ? `<div class="small mt-1"><strong>Próximo passo:</strong> ${escapeHtml(evento.proximaAcao)}</div>` : ''}</div>`;
            }).join('');
        }

        window.salvarRegistroPedagogico = async () => {
            const form = document.getElementById('formPedagogico');
            if(!form.reportValidity()) return;
            const aulaId = document.getElementById('pedAula').value;
            const aula = eventos.find(evento => evento.id === aulaId);
            if(!aula) { showToast('Selecione uma aula válida.', 'warning'); return; }
            const presenca = document.getElementById('pedPresenca').value;
            const dados = {
                presenca,
                progresso: document.getElementById('pedProgresso').value,
                conteudo: document.getElementById('pedConteudo').value.trim(),
                tarefa: document.getElementById('pedTarefa').value.trim(),
                proximaAcao: document.getElementById('pedProxima').value.trim(),
                registradoEm: nowLocalISO(),
                updatedAt: nowLocalISO(),
                statusAula: presenca === 'presente' ? 'realizada' : 'faltou',
                cobrancaFalta: presenca === 'falta_cobrada'
            };
            try {
                const efeito = await registrarPresencaComCredito(aulaId, aula.alunoId, presenca, dados);
                if(efeito) registrarAuditoria(efeito === 'consumido' ? 'pacote.consumo' : 'pacote.estorno', { tipo: 'aula', id: aulaId }, { presenca });
                form.reset();
                showToast(efeito === 'consumido' ? 'Acompanhamento salvo e 1 crédito consumido.' : efeito === 'estornado' ? 'Acompanhamento salvo e 1 crédito estornado.' : 'Acompanhamento pedagógico salvo.', 'success');
            } catch(error) {
                console.error(error);
                showToast('Não foi possível salvar o acompanhamento.', 'error', 5000);
            }
        };

        // Regra de negócio explícita: presenças que consomem crédito de pacote.
        // Configurável por conta (Conta e plano › Regras de pacotes). Padrão = comportamento V4: só a presença consome.
        function presencasQueConsomemCredito() {
            return organizacaoAtual?.settings?.faltaCobradaConsomeCredito === true ? ['presente', 'falta_cobrada'] : ['presente'];
        }
        async function registrarPresencaComCredito(aulaId, alunoId, presenca, dados) {
            const hoje = ymdLocal(new Date());
            const candidato = pacotes.filter(p => p.alunoId === alunoId && pacoteValido(p))
                .sort((a, b) => String(a.validade || '9999').localeCompare(String(b.validade || '9999')))[0];
            return runTransaction(db, async tx => {
                const aulaRef = doc(db, 'aulas', aulaId);
                const aulaSnap = await tx.get(aulaRef);
                if(!aulaSnap.exists()) throw new Error('Aula não encontrada.');
                const consumidoEm = aulaSnap.data().creditoConsumidoPacoteId || null;
                const consome = presencasQueConsomemCredito().includes(presenca);
                const patch = { ...dados };
                let efeito = null;
                if(consome && !consumidoEm && candidato) {
                    const pRef = doc(db, 'pacotes', candidato.id);
                    const pSnap = await tx.get(pRef);
                    const p = pSnap.exists() ? pSnap.data() : null;
                    const usados = Number(p?.creditosUsados || 0), total = Number(p?.creditosTotal || 0);
                    if(p && p.status === 'ativo' && usados < total && (!p.validade || p.validade >= hoje)) {
                        tx.update(pRef, { creditosUsados: usados + 1, updatedAt: nowLocalISO() });
                        patch.creditoConsumidoPacoteId = candidato.id;
                        efeito = 'consumido';
                    }
                } else if(!consome && consumidoEm) {
                    const pRef = doc(db, 'pacotes', consumidoEm);
                    const pSnap = await tx.get(pRef);
                    if(pSnap.exists()) tx.update(pRef, { creditosUsados: Math.max(0, Number(pSnap.data().creditosUsados || 0) - 1), updatedAt: nowLocalISO() });
                    patch.creditoConsumidoPacoteId = null;
                    efeito = 'estornado';
                }
                tx.update(aulaRef, patch);
                return efeito;
            });
        }
        function pacoteSaldo(pacote) { return Math.max(0, Number(pacote.creditosTotal || 0) - Number(pacote.creditosUsados || 0)); }
        function pacoteValido(pacote) { return pacote.status === 'ativo' && (!pacote.validade || pacote.validade >= ymdLocal(new Date())) && pacoteSaldo(pacote) > 0; }
        function renderPacotes() {
            const container = document.getElementById('listaPacotes');
            const resumo = document.getElementById('pacoteResumo');
            if(!container) return;
            if(resumo) resumo.textContent = `${pacotes.length} ${pacotes.length === 1 ? 'pacote' : 'pacotes'}`;
            if(!pacotes.length) { container.innerHTML = '<div class="empty-state"><i class="fas fa-layer-group"></i><p>Nenhum pacote cadastrado.</p></div>'; return; }
            container.innerHTML = pacotes.slice().sort((a,b) => String(a.validade || '').localeCompare(String(b.validade || ''))).map(pacote => {
                const aluno = alunos.find(item => item.id === pacote.alunoId);
                const saldo = pacoteSaldo(pacote), total = Math.max(1, Number(pacote.creditosTotal || 1));
                const percentual = Math.round((saldo / total) * 100);
                const valido = pacoteValido(pacote);
                return `<div class="border rounded-3 p-3 mb-2"><div class="d-flex justify-content-between gap-2"><div><div class="fw-semibold">${escapeHtml(pacote.nome || 'Pacote de aulas')}</div><div class="small text-muted">${escapeHtml(aluno?.nome || 'Aluno não encontrado')} · validade: ${escapeHtml(formatData(pacote.validade || ''))}</div></div><span class="badge ${valido ? 'bg-success' : 'bg-secondary'}">${valido ? 'ativo' : 'encerrado'}</span></div><div class="d-flex justify-content-between small mt-3 mb-1"><span>${saldo} de ${total} créditos disponíveis</span><strong>${percentual}%</strong></div><div class="progress-track"><div class="progress-value" style="width:${percentual}%"></div></div><div class="d-flex gap-2 mt-3"><button class="btn btn-ghost btn-sm" type="button" onclick="ajustarCredito('${pacote.id}', -1)" ${saldo <= 0 ? 'disabled' : ''}><i class="fas fa-minus me-1"></i>Consumir</button><button class="btn btn-ghost btn-sm" type="button" onclick="ajustarCredito('${pacote.id}', 1)" ${Number(pacote.creditosUsados || 0) <= 0 ? 'disabled' : ''}><i class="fas fa-undo me-1"></i>Estornar</button></div></div>`;
            }).join('');
        }

        window.salvarPacote = async () => {
            const form = document.getElementById('formPacote');
            if(!form.reportValidity()) return;
            const alunoId = document.getElementById('pacoteAluno').value;
            const total = Number(document.getElementById('pacoteCreditos').value);
            if(!alunoId || !Number.isInteger(total) || total < 1) { showToast('Informe aluno e quantidade válida de créditos.', 'warning'); return; }
            try {
                await addDoc(collection(db, 'pacotes'), { organizationId: currentOrgId(), alunoId, nome: document.getElementById('pacoteNome').value.trim(), creditosTotal: total, creditosUsados: 0, validade: document.getElementById('pacoteValidade').value, status: 'ativo', createdAt: nowLocalISO(), updatedAt: nowLocalISO() });
                form.reset();
                showToast('Pacote criado com sucesso.', 'success');
            } catch(error) { console.error(error); showToast('Não foi possível criar o pacote.', 'error', 5000); }
        };

        window.ajustarCredito = async (id, delta) => {
            const pacote = pacotes.find(item => item.id === id);
            if(!pacote) return;
            try {
                await runTransaction(db, async tx => {
                    const ref = doc(db, 'pacotes', id);
                    const snap = await tx.get(ref);
                    if(!snap.exists()) throw new Error('Pacote não encontrado.');
                    const atual = snap.data();
                    const usado = Math.max(0, Math.min(Number(atual.creditosTotal || 0), Number(atual.creditosUsados || 0) - delta));
                    tx.update(ref, { creditosUsados: usado, updatedAt: nowLocalISO() });
                });
                registrarAuditoria('pacote.ajuste', { tipo: 'pacote', id }, { delta });
                showToast(delta < 0 ? 'Crédito consumido.' : 'Crédito estornado.', 'success'); }
            catch(error) { console.error(error); showToast('Não foi possível ajustar o crédito.', 'error'); }
        };

        function mensagemParaAluno(aluno, modelo) {
            if(!aluno) return 'Selecione um aluno para preparar uma mensagem.';
            const proxima = eventos.filter(evento => evento.alunoId === aluno.id && (evento.statusAula || 'agendada') !== 'cancelada' && parseLocalISO(evento.start) >= new Date()).sort((a,b) => (parseLocalISO(a.start)||0) - (parseLocalISO(b.start)||0))[0];
            const cfg = getConfig();
            if(modelo === 'confirmacao') {
                return `Olá! Confirmando a aula de ${aluno.nome}${proxima ? ` em ${formatData(String(proxima.start).split('T')[0])} às ${isoToHHMM(proxima.start)}` : ''}. Pode me confirmar o recebimento?

${cfg.professor}`;
            }
            if(modelo === 'cancelamento') {
                return `Olá! Sobre a próxima aula de ${aluno.nome}${proxima ? ` (${formatData(String(proxima.start).split('T')[0])} às ${isoToHHMM(proxima.start)})` : ''}: caso precise cancelar ou remarcar, por favor me avise com antecedência.

${cfg.professor}`;
            }
            if(modelo === 'pagamento') {
                return `Olá! Pagamento das aulas de ${aluno.nome} recebido com sucesso. Muito obrigado! O recibo pode ser gerado pelo sistema.

${cfg.professor}`;
            }
            if(modelo === 'relatorio') {
                return `Olá! O acompanhamento mais recente de ${aluno.nome} já está disponível. Se desejar, posso enviar também o relatório em PDF.

${cfg.professor}`;
            }
            if(modelo === 'resumo') {
                const ultima = eventos.filter(evento => evento.alunoId === aluno.id && evento.conteudo).sort((a,b) => (parseLocalISO(b.start)||0) - (parseLocalISO(a.start)||0))[0];
                return `Olá! Segue o resumo da última aula de ${aluno.nome}.\n\nConteúdo: ${ultima?.conteudo || 'ainda não registrado'}\nTarefa: ${ultima?.tarefa || 'sem tarefa registrada'}\nPróximo passo: ${ultima?.proximaAcao || 'a definir'}\n\n${cfg.professor}`;
            }
            if(modelo === 'pendencia') {
                const pendente = eventos.filter(evento => evento.alunoId === aluno.id && evento.status !== 'pago' && (evento.statusAula || 'agendada') !== 'cancelada').reduce((s, evento) => s + Number(evento.valor || 0), 0);
                return `Olá! Identificamos ${formatMoney(pendente)} em aulas pendentes de ${aluno.nome}. Se precisar de detalhes, estou à disposição.\n\n${cfg.professor}`;
            }
            if(modelo === 'agenda') {
                const agenda = eventos.filter(evento => evento.alunoId === aluno.id && parseLocalISO(evento.start) >= new Date() && (evento.statusAula || 'agendada') !== 'cancelada').sort((a,b) => (parseLocalISO(a.start)||0) - (parseLocalISO(b.start)||0)).slice(0,4).map(evento => `• ${formatData(String(evento.start).split('T')[0])}, ${isoToHHMM(evento.start)}`).join('\n');
                return `Olá! Esta é a agenda das próximas aulas de ${aluno.nome}:\n\n${agenda || 'Nenhuma aula agendada.'}\n\n${cfg.professor}`;
            }
            return `Olá! Lembrando que ${aluno.nome}${proxima ? ` tem aula em ${formatData(String(proxima.start).split('T')[0])} às ${isoToHHMM(proxima.start)}` : ' não possui uma aula futura registrada'}.\n\n${cfg.professor}`;
        }
        window.atualizarMensagem = () => {
            const aluno = alunos.find(item => item.id === document.getElementById('msgAluno')?.value);
            const texto = mensagemParaAluno(aluno, document.getElementById('msgModelo')?.value || 'lembrete');
            const preview = document.getElementById('msgPreview'); if(preview) preview.textContent = texto;
        };
        window.copiarMensagem = async () => { const texto = document.getElementById('msgPreview')?.textContent || ''; try { await navigator.clipboard.writeText(texto); showToast('Mensagem copiada.', 'success'); } catch { showToast('Não foi possível copiar a mensagem.', 'error'); } };
        window.enviarWhatsApp = () => { const aluno = alunos.find(item => item.id === document.getElementById('msgAluno')?.value); if(!aluno?.tel) { showToast('Selecione um aluno com WhatsApp cadastrado.', 'warning'); return; } const texto = document.getElementById('msgPreview')?.textContent || ''; window.open(`https://wa.me/55${String(aluno.tel).replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener'); };

        window.abrirPortalResponsavel = () => {
            const aluno = alunos.find(item => item.id === document.getElementById('portalAluno')?.value);
            if(!aluno) { showToast('Selecione um aluno.', 'warning'); return; }
            const aulas = eventos.filter(evento => evento.alunoId === aluno.id).sort((a,b) => (parseLocalISO(b.start)||0) - (parseLocalISO(a.start)||0));
            const proximas = aulas.filter(evento => parseLocalISO(evento.start) >= new Date() && (evento.statusAula || 'agendada') !== 'cancelada').slice(0,5);
            const concluidas = aulas.filter(evento => evento.presenca || evento.statusAula === 'realizada');
            const presentes = aulas.filter(evento => evento.presenca === 'presente' || (evento.statusAula === 'realizada' && !evento.presenca));
            const frequencia = concluidas.length ? Math.round((presentes.length / concluidas.length) * 100) : 0;
            const saldo = pacotes.filter(pacote => pacote.alunoId === aluno.id && pacoteValido(pacote)).reduce((s,pacote) => s + pacoteSaldo(pacote), 0);
            const popup = window.open('', '_blank');
            if(!popup) { showToast('O navegador bloqueou a abertura do portal.', 'warning'); return; }
            popup.document.write(`<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><title>Portal — ${escapeHtml(aluno.nome)}</title><style>body{font-family:Arial,sans-serif;background:#f5f7fb;color:#1f2937;margin:0;padding:32px}.card{max-width:800px;margin:auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 8px 28px #1112}h1{margin:0;color:#3b5bdb}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}.tile{background:#eef2ff;border-radius:12px;padding:14px}.tile b{display:block;font-size:24px;margin-top:5px}li{padding:8px 0;border-bottom:1px solid #eee}.muted{color:#667085;font-size:14px}@media(max-width:600px){.grid{grid-template-columns:1fr}}</style></head><body><main class="card"><p class="muted">${escapeHtml(getConfig().escola)}</p><h1>Olá, família de ${escapeHtml(aluno.nome)}</h1><p>Acompanhe agenda e evolução das aulas.</p><section class="grid"><div class="tile"><span>Frequência</span><b>${frequencia}%</b></div><div class="tile"><span>Aulas concluídas</span><b>${concluidas.length}</b></div><div class="tile"><span>Créditos ativos</span><b>${saldo}</b></div></section><h2>Próximas aulas</h2><ul>${proximas.length ? proximas.map(evento => `<li><b>${escapeHtml(formatData(String(evento.start).split('T')[0]))}</b> às ${escapeHtml(isoToHHMM(evento.start))} — ${escapeHtml(evento.modalidade || 'aula')}</li>`).join('') : '<li>Nenhuma aula agendada.</li>'}</ul><h2>Último acompanhamento</h2>${aulas.find(evento => evento.conteudo) ? `<p><b>Conteúdo:</b> ${escapeHtml(aulas.find(evento => evento.conteudo).conteudo)}<br><b>Próximo passo:</b> ${escapeHtml(aulas.find(evento => evento.conteudo).proximaAcao || 'A definir')}</p>` : '<p class="muted">O primeiro acompanhamento será publicado após a próxima aula.</p>'}</main></body></html>`);
            popup.document.close();
        };

        window.gerarPixParaAula = async (aulaId) => {
            if(!usuarioAtual) { showToast('Faça login para gerar uma cobrança.', 'warning'); return; }
            try {
                const criarPix = httpsCallable(functions, 'criarCobrancaPix');
                const result = await criarPix({ aulaIds: [aulaId] });
                const data = result.data;
                document.getElementById('pixValor').textContent = `Valor da cobrança: ${formatMoney(data.total)}`;
                document.getElementById('pixCopiaCola').value = data.qrCode || '';
                const image = document.getElementById('pixQrImage');
                if(data.qrCodeBase64) { image.src = `data:image/png;base64,${data.qrCodeBase64}`; image.style.display = 'inline-block'; } else { image.removeAttribute('src'); image.style.display = 'none'; }
                const link = document.getElementById('pixLink');
                if(data.ticketUrl) { link.href = data.ticketUrl; link.style.display = 'block'; } else { link.removeAttribute('href'); link.style.display = 'none'; }
                new bootstrap.Modal(document.getElementById('modalPix')).show();
            } catch(error) {
                console.error(error);
                showToast('Não foi possível gerar o Pix. Confirme se as funções seguras já foram publicadas.', 'error', 6000);
            }
        };
        window.copiarPix = async () => {
            const code = document.getElementById('pixCopiaCola').value;
            if(!code) { showToast('O código Pix não está disponível.', 'warning'); return; }
            try { await navigator.clipboard.writeText(code); showToast('Código Pix copiado.', 'success'); }
            catch { showToast('Não foi possível copiar o código Pix.', 'error'); }
        };

        window.salvarConviteAcesso = async () => {
            const alunoId = document.getElementById('inviteAluno')?.value;
            const email = String(document.getElementById('inviteEmail')?.value || '').trim().toLowerCase();
            const role = document.getElementById('inviteRole')?.value || 'responsavel';
            const status = document.getElementById('inviteStatus');
            if(!alunoId || !email || !email.includes('@')) { showToast('Selecione o aluno e informe um e-mail válido.', 'warning'); return; }
            const aluno = alunos.find(a => a.id === alunoId);
            try {
                await runTransaction(db, async tx => {
                    const ref = doc(db, 'convites', email);
                    tx.set(ref, { email, alunoId, alunoNome: aluno?.nome || '', role, organizationId: currentOrgId(), ativo:true, createdBy:usuarioAtual.uid, createdAt:nowLocalISO(), updatedAt:nowLocalISO() });
                });
                if(status) status.innerHTML = `<span class="text-success"><i class="fas fa-check-circle me-1"></i>Acesso liberado para ${escapeHtml(email)} como ${escapeHtml(role)}.</span>`;
                registrarAuditoria('convite.liberar', { tipo: 'aluno', id: alunoId }, { papel: role });
                showToast('Acesso ao portal liberado.', 'success');
            } catch(error) {
                console.error(error);
                showToast(error?.code === 'permission-denied' ? 'Este e-mail já está vinculado a outro professor ou o aluno não pertence à sua conta.' : 'Não foi possível liberar o acesso.', 'error', 6000);
            }
        };
        window.resolverSolicitacao = async (id, novoStatus) => {
            try { await updateDoc(doc(db,'solicitacoes',id), { status:novoStatus, resolvedAt:nowLocalISO(), resolvedBy:usuarioAtual.uid }); showToast('Solicitação atualizada.', 'success'); }
            catch(error){ console.error(error); showToast('Falha ao atualizar solicitação.', 'error'); }
        };
        window.v4CreateLead = async (data) => { const payload={ organizationId:currentOrgId(), nome:String(data.nome||'').trim(), tel:String(data.tel||'').replace(/\D/g,''), interesse:String(data.interesse||'').trim(), origem:String(data.origem||'Outro'), etapa:String(data.etapa||'lead'), createdBy:usuarioAtual?.uid||'', createdAt:nowLocalISO(), updatedAt:nowLocalISO() }; const ref=await addDoc(collection(db,'leads'),payload); return ref.id; };
        window.v4UpdateLead = async (id, patch) => updateDoc(doc(db,'leads',id), { ...patch, organizationId:currentOrgId(), updatedAt:nowLocalISO() });
        window.v4DeleteLead = async (id) => deleteDoc(doc(db,'leads',id));
        // Utilitários de interface para os módulos V4/V5 carregados como scripts clássicos.
        window.pgToast = (msg, type = 'info', duration) => showToast(msg, type, duration);
        window.pgConfirm = (title, msg, onConfirm, type) => showConfirm(title, msg, onConfirm, type);
        window.v4ConvertLead = async (id) => {
            const lead = leads.find(item => item.id === id);
            if(!lead) throw new Error('Lead não encontrado.');
            if(lead.alunoId) return lead.alunoId;
            const batch = writeBatch(db);
            const alunoRef = doc(collection(db, 'alunos'));
            batch.set(alunoRef, { nome: String(lead.nome || '').trim() || 'Novo aluno', tel: String(lead.tel || '').replace(/\D/g, ''), materia: String(lead.interesse || '').trim(), origem: lead.origem || '', leadId: id, organizationId: currentOrgId(), createdAt: nowLocalISO(), updatedAt: nowLocalISO() });
            batch.update(doc(db, 'leads', id), { etapa: 'convertido', alunoId: alunoRef.id, convertidoEm: nowLocalISO(), updatedAt: nowLocalISO() });
            await batch.commit();
            return alunoRef.id;
        };
        window.v4UpdateLesson = async (id, patch) => updateDoc(doc(db,'aulas',id), { ...patch, organizationId:currentOrgId(), updatedAt:nowLocalISO() });
        window.v4OpenLesson = (id) => { const a=eventos.find(x=>x.id===id); if(!a) return; const ev={id:a.id,start:parseLocalISO(a.start),end:parseLocalISO(a.end),extendedProps:{...a}}; window.abrirModalEvento?.(ev); };
        window.v4GoPedagogico = (id) => { const a=eventos.find(x=>x.id===id); window.showSection?.('pedagogico'); setTimeout(()=>{ const aluno=document.getElementById('pedAlunoFiltro'); if(aluno&&a){ aluno.value=a.alunoId; aluno.dispatchEvent(new Event('change')); } const aula=document.getElementById('pedAula'); if(aula){ aula.value=id; aula.dispatchEvent(new Event('change')); } },120); };
        // ============================
        // V5 — PLATAFORMA, CONTA, ASSINATURA, LGPD E AUDITORIA
        // ============================
        async function carregarPlataforma() {
            try {
                const snap = await getDoc(doc(db, 'platformConfig', 'public'));
                if(snap.exists()) {
                    const d = snap.data();
                    plataforma = { selfSignupOpen: d.selfSignupOpen === true, billingEnabled: d.billingEnabled === true, pixAulaEnabled: d.pixAulaEnabled === true };
                }
            } catch(error) { console.warn('Configuração pública da plataforma indisponível.', error?.code || error); }
            const pedido = new URLSearchParams(location.search).get('cadastro');
            if(pedido === 'professor' && !auth.currentUser) {
                window.setAuthPersona('professor');
                if(plataforma.selfSignupOpen) { modoCadastro = true; }
                else showLoginMessage('O cadastro de novos professores ainda não está aberto. Volte em breve.');
            }
            atualizarModoAuth();
            if(typeof renderFinanceiro === 'function' && usuarioAtual) renderFinanceiro();
            document.dispatchEvent(new Event('profgestor:data'));
        }

        async function criarOrganizacaoPropria(user) {
            let pendente = null;
            try { pendente = JSON.parse(localStorage.getItem(SIGNUP_KEY) || 'null'); } catch(e) {}
            const email = String(user.email || '').toLowerCase();
            const nome = (user.displayName || pendente?.nome || email.split('@')[0]).slice(0, 120);
            const escola = ((pendente?.email === email && pendente.escola) || `Aulas de ${nome}`).slice(0, 120);
            const orgId = `org_${user.uid}`;
            const batch = writeBatch(db);
            batch.set(doc(db, 'organizations', orgId), { nome: escola, ownerUid: user.uid, createdAt: serverTimestamp(), timezone: GOOGLE_CALENDAR_TIMEZONE });
            batch.set(doc(db, 'usuarios', user.uid), { email, nome, role: 'admin', organizationId: orgId, ativo: true, createdAt: nowLocalISO(), updatedAt: nowLocalISO() });
            await batch.commit();
            try { localStorage.removeItem(SIGNUP_KEY); setConfig({ ...getConfig(), professor: nome, escola }); } catch(e) {}
        }

        function acompanharOrganizacao() {
            if(organizacaoUnsub) organizacaoUnsub();
            const orgId = currentOrgId();
            organizacaoUnsub = onSnapshot(doc(db, 'organizations', orgId), snap => {
                const d = snap.exists() ? snap.data() : null;
                const ms = v => (v && typeof v.toMillis === 'function') ? v.toMillis() : (Number(v) || 0);
                organizacaoAtual = d ? {
                    id: orgId, nome: d.nome || '', billingExempt: d.billingExempt === true, createdAtMs: ms(d.createdAt),
                    settings: { faltaCobradaConsomeCredito: d.settings?.faltaCobradaConsomeCredito === true },
                    entitlement: d.entitlement ? { status: d.entitlement.status || '', plan: d.entitlement.plan || null, accessUntilMs: ms(d.entitlement.accessUntil), cancelAtPeriodEnd: !!d.entitlement.cancelAtPeriodEnd, temCliente: !!d.entitlement.customerId } : null
                } : null;
                document.dispatchEvent(new Event('profgestor:data'));
            }, error => { console.warn('Organização indisponível.', error?.code || error); organizacaoAtual = null; });
        }

        // Trilha de auditoria: somente inserção, sem dados pessoais nos detalhes.
        async function registrarAuditoria(action, alvo = {}, detalhes = {}) {
            if(!usuarioAtual) return;
            try {
                await addDoc(collection(db, 'auditLogs'), { organizationId: currentOrgId(), actorUid: usuarioAtual.uid, at: serverTimestamp(), action, alvo, detalhes });
            } catch(error) { console.warn('Falha ao registrar auditoria.', error?.code || error); }
        }
        window.v5SalvarRegraCredito = async (consome) => {
            await updateDoc(doc(db, 'organizations', currentOrgId()), { 'settings.faltaCobradaConsomeCredito': !!consome, updatedAt: nowLocalISO() });
            registrarAuditoria('regra.credito', { tipo: 'organizacao', id: currentOrgId() }, { faltaCobradaConsome: !!consome });
        };
        window.v5ListarAuditoria = async () => {
            const snap = await getDocs(query(collection(db, 'auditLogs'), where('organizationId', '==', currentOrgId()), orderBy('at', 'desc'), limit(30)));
            return snap.docs.map(d => { const x = d.data(); return { id: d.id, action: x.action, actorUid: x.actorUid, alvo: x.alvo || {}, detalhes: x.detalhes || {}, at: x.at?.toMillis ? x.at.toMillis() : null }; });
        };

        // Portabilidade (LGPD): exporta os dados do tenant em JSON estruturado.
        window.v5ExportarDados = async () => {
            const orgId = currentOrgId();
            let convites = [];
            try { convites = (await getDocs(query(collection(db, 'convites'), where('organizationId', '==', orgId)))).docs.map(d => ({ id: d.id, ...d.data() })); }
            catch(error) { console.warn('Convites não exportados.', error?.code || error); }
            const colecoes = { alunos, aulas: eventos, pacotes, despesas, leads, solicitacoes, convites };
            const contagens = Object.fromEntries(Object.entries(colecoes).map(([k, v]) => [k, v.length]));
            const pacote = { formato: 'profgestor-export/1', exportadoEm: new Date().toISOString(), organizationId: orgId, organizacao: organizacaoAtual ? { nome: organizacaoAtual.nome } : null, contagens, dados: colecoes };
            const blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `profgestor-export-${orgId}-${ymdLocal(new Date())}.json`;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            registrarAuditoria('dados.exportar', { tipo: 'organizacao', id: orgId }, contagens);
            return contagens;
        };

        // Assinatura: preço e plano são decididos no servidor; o cliente envia só o identificador.
        const functionsBR = getFunctions(app, 'southamerica-east1');
        if(USE_EMULATORS) connectFunctionsEmulator(functionsBR, '127.0.0.1', 5001);
        window.v5Assinar = async (planId) => {
            if(!plataforma.billingEnabled) throw new Error('Assinaturas ainda não estão abertas.');
            const r = await httpsCallable(functionsBR, 'criarCheckoutAssinatura')({ planId });
            location.assign(r.data.url);
        };
        window.v5GerenciarAssinatura = async () => {
            if(!plataforma.billingEnabled) throw new Error('Assinaturas ainda não estão abertas.');
            const r = await httpsCallable(functionsBR, 'abrirPortalAssinatura')({});
            location.assign(r.data.url);
        };

        window.__gestaoV4 = { getState: () => ({ alunos:[...alunos], eventos:[...eventos], despesas:[...despesas], pacotes:[...pacotes], solicitacoes:[...solicitacoes], leads:[...leads], perfil:perfilAtual, usuario:usuarioAtual, organizationId:currentOrgId(), organizacao: organizacaoAtual, plataforma: { ...plataforma }, config: (() => { const c = getConfig(); return { professor: c.professor, escola: c.escola, contatoConfigurado: !!(c.whatsapp || c.email || c.pix) }; })() }) };
        window.renderCalendario = renderCalendario;
        window.renderFinanceiro = renderFinanceiro;
        window.renderAlunos = renderAlunos;
