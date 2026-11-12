# Auditoria inicial — ProfGestor V4 (09/11/2026)

## Escopo e acessos efetivamente verificados

| Ambiente | Acesso nesta sessão | Como foi verificado |
|---|---|---|
| Repositório do ProfGestor | **Nenhum** | Só existem `jair-os` (portfólio) e `exam-weaver` acessíveis; nenhum contém o ProfGestor |
| Hosting de produção | Leitura pública | Download do bundle de `gestao-aulas-jair.web.app` (sem etapa de build: é o próprio código) |
| Firestore de produção | Sondagem anônima, somente nomes | `GET` REST com `mask=__name__` em 12 coleções → **403 em todas** (leitura anônima bloqueada) |
| Firestore Rules, índices, Storage Rules | Leitura (12/11/2026, login do proprietário no Asus) | Regras de produção publicadas em 07/09/2026 copiadas para `docs/evidencias/`; Storage sem regras publicadas |
| Cloud Functions | Sondagem `GET` | `criarCobrancaPix` → **404** em `us-central1` e `southamerica-east1` |
| Firebase Auth | Não testado | Criar conta de teste em produção seria escrita em produção; não foi feito |
| Jair OS | Leitura de contexto | Há execução do agente de agenda **em andamento (risco alto)** alterando o ProfGestor para 09–15/11 |

Nenhum dado de aluno foi lido. Nenhuma escrita foi feita em produção.

## Achados

Severidade: impacto para o uso atual e para o SaaS. Probabilidade: chance de ocorrer no uso normal.

| # | Achado | Sev. | Prob. | Impacto | Dependência | Situação |
|---|---|---|---|---|---|---|
| A1 | `src/v4-features.js` **não existe em produção**; o rewrite SPA devolve `index.html` no lugar. Painel mostra **zeros fixos** em "Aulas hoje", "Em atraso", "Despesas", "Resultado", "Relatórios pendentes"; CRM e "Sala da aula" não funcionam (`renderCRM`/`renderAulasOperacao` indefinidos) | Alta | Certa | Decisões com dados errados (R$ 0 a receber) | — | Corrigido no código; E2E aprovado; **não publicado** |
| A2 | `DocumentSnapshot.exists` usado como propriedade (é método no SDK modular): 4 ocorrências, sempre verdadeiro | Média | Certa | Mensagens erradas; aluno vinculado inexistente não detectado | — | Corrigido |
| A3 | Ativação do portal da família **sem verificação de e-mail**: quem souber o e-mail convidado cria a conta antes do responsável e passa a ver dados do aluno (menor) | Alta | Baixa | Exposição de dados de menor | Regras + cliente | Corrigido (regra exige `email_verified`; fluxo envia link) |
| A23 | **Brecha crítica ativa em produção**: a regra de `usuarios` permitia criar perfil `admin` enquanto `sistema/configuracao` não existisse, e o documento **não existia**. Com o cadastro por e-mail aberto, qualquer pessoa podia virar administradora e ler/alterar/apagar alunos (inclusive menores), aulas e financeiro | Crítica | Alta (exploração trivial com a chave pública do app) | Vazamento e destruição de dados | — | **Mitigado em produção em 12/11/2026**: criado `sistema/configuracao` com `adminUid` do proprietário (1 documento, reversível). Prova nas regras reais: `tests/emulator/producao-legada.test.js`. Verificação: 1 único perfil admin (o do proprietário), sem sinal de exploração. Correção definitiva: regras V5 |
| A4 | Regras de produção desconhecidas (até 12/11). Leitura anônima bloqueada (verificado), mas o cadastro por e-mail é público (usado pelo portal) e não foi possível testar o que **qualquer usuário autenticado** consegue ler/gravar | Alta até verificar | Desconhecida | Possível acesso indevido | Acesso ao projeto | Resolvido em 12/11: regras obtidas e analisadas (ver A23) |
| A5 | Consumo de crédito de pacote não transacional: duas gravações separadas, leitura do cache local | Média | Média | Crédito consumido 2× (duas abas/duplo clique) ou perdido; sem estorno ao corrigir presença | — | Corrigido (transação única + estorno) |
| A6 | Convite do portal com ID = e-mail (global) | Alta (SaaS) | Média | Professor B sobrescreveria convite do professor A | Regras | Mitigado nas regras; limitação: um e-mail só pode estar em um tenant |
| A7 | `currentOrgId()` cai em `org_jair` para **qualquer** perfil sem tenant | Crítica (SaaS) | Certa em SaaS | Dados de outros professores gravados na conta do proprietário | — | Corrigido (fallback só para o admin legado) |
| A8 | Google Calendar "desconectado": token do Google Identity Services só em memória (cai a cada recarga); Client ID no `localStorage` do navegador; escopo `calendar.events` é **sensível** (verificação do app OAuth pelo Google é exigida para uso comercial) | Média | Certa | Sincronização interrompida; inviável comercialmente como está | OAuth no servidor | Parcial: estado "reconexão necessária". Correção definitiva **pendente** |
| A9 | Botão "Gerar Pix" chama `criarCobrancaPix`, que não está publicada (404) | Média | Certa | Recurso aparente que sempre falha | Functions | Corrigido: botão oculto até `pixAulaEnabled`; backend pendente |
| A10 | Listeners carregam **coleções inteiras** do tenant a cada abertura, sem paginação nem cache persistente | Média | Certa | Leituras crescem com o histórico (custo e lentidão) | — | Pendente (ver CUSTOS.md) |
| A11 | Data "hoje" calculada em UTC no `v4.js` | Baixa | Certa após 21h | Indicador do dia errado à noite | — | Corrigido |
| A12 | Rewrite catch-all do Hosting responde 200 com HTML para arquivos ausentes | Média | — | Mascarou A1 | — | Corrigido no `firebase.json` proposto |
| A13 | Observações privadas do professor (`obs`, notas) ficam no mesmo documento que a família pode ler (regras não filtram campos) | Média | Média | Privacidade | Modelo de dados | Pendente (separar notas privadas) |
| A14 | Código-fonte fora de controle de versão (o `v4-features.js` se perdeu) | Alta | — | Perda de trabalho, sem rollback | — | Corrigido: baseline com SHA-256 |
| A15 | Sem testes automatizados nem CI | Alta | — | Regressões invisíveis | — | Corrigido: 99 testes + workflow |
| A16 | Bootstrap legado grava `sistema/configuracao` (código morto) | Baixa | — | Superfície desnecessária | — | Removido |
| A17 | Bloqueios de agenda ("horários presos") só no `localStorage` | Média | Certa | Não sincronizam entre dispositivos | — | Pendente |
| A18 | Scripts de CDN sem SRI; Firebase SDK 9.22 (2023) | Média | Baixa | Cadeia de suprimentos | — | Pendente |
| A19 | Agente externo (Jair OS) grava em produção pelo Admin SDK; documentos sem `organizationId` ficam invisíveis no app | Info | — | Registros "fantasmas" | — | Inventário da migração detecta |
| A20 | `jair-os` é **público**: ao mesclar, o código do SaaS fica público | Decisão | — | Exposição de propriedade intelectual (não há segredos no código) | Proprietário | Decisão pendente |
| A22 | Rótulos do menu lateral **duplicados** em todos os grupos (o `v4.js` inseria rótulos sobre os já existentes no HTML); marca "ProfGestorV4" colada | Baixa | Certa | Aparência pouco profissional | — | Corrigido (encontrado nas capturas de tela) |
| A21 | Dependências das Functions: 6 vulnerabilidades **moderadas** em `rimraf→glob→minimatch` (ferramental interno do `google-gax`), sem caminho a partir do código da aplicação | Baixa | Baixa | — | Upstream | Aceito e monitorado (CI falha em alta/crítica) |

## Pontos fortes preservados

Escape de HTML consistente (`escapeHtml`), cabeçalhos de segurança no Hosting (HSTS, nosniff, Permissions-Policy), consultas já filtradas por `organizationId` (permitiu isolar tenants **sem reestruturar os dados**), prevenção de conflitos de agenda, bloqueio de exclusão de aluno com histórico.
