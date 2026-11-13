# Status da entrega V5 — 12/11/2026

Classificação exigida: **Verificado em produção · Verificado em homologação · Implementado,
aguardando teste · Pendente · Bloqueado.** Ainda não existe ambiente de homologação e esta
sessão não tem credenciais de produção. Tudo o que foi testado rodou em **emulador local**
(Firebase Emulator + Chromium), por isso nenhum item aparece como "verificado em homologação"
ou "em produção".

**Testes automatizados: 116, todos aprovados** — 9 unitários, 85 no emulador (43 regras do
Firestore, 6 do Storage, 9 de migração, 27 de cobrança) e 22 E2E no Chromium.

## Homologação real — 13/11/2026 (gestao-pro-b85bf)

Projeto antigo sem uso reaproveitado, com aprovação do proprietário: conteúdo anterior salvo em
backup no Asus e removido. Executado a partir do Asus com o login do proprietário.

| Etapa | Resultado |
|---|---|
| Backup de produção (somente leitura) | 379 documentos, SHA-256 `436c7db8…`, idêntico em duas coletas |
| Cópia para a homologação | 379 documentos, mesmo SHA-256 |
| Migração (plano → aplicação → verificação) | 1 operação: `billingExempt`, `ownerUid` e `nome` em `org_jair`; verificação sem problemas |
| Publicação das regras V5 e do app | Concluída — https://gestao-pro-b85bf.web.app |
| Proprietário lê e grava com as regras V5 | ✅ 23 alunos, 349 aulas, 1 pacote, 1 despesa; gravação e exclusão de aula de teste |
| Conta nova tenta virar admin / ler alunos / recriar `sistema` | ✅ 403 em todas |
| App no navegador (sem login) | ✅ carrega, sem erros de JavaScript, aviso de homologação visível |

## Correção emergencial em produção — 12/11/2026

Brecha crítica A23 (autocadastro de administrador) mitigada criando `sistema/configuracao`
com o uid do proprietário. Nenhum outro dado de produção foi alterado.

## Entregas

| Item | Estado | Evidência |
|---|---|---|
| Baseline V4 versionado | Implementado | `web/PROVENANCE.md` (SHA-256 da captura) |
| Painel com indicadores reais, CRM e Sala da aula (`v4-features.js` ausente em produção) | Implementado, aguardando teste | E2E: indicadores, CRM com matrícula |
| Correções `exists()`, datas locais, fuso, menu duplicado | Implementado, aguardando teste | unitários + E2E sem erros de JavaScript |
| Créditos de pacote transacionais (consumo e estorno) | Implementado, aguardando teste | E2E com cliques concorrentes |
| Portal da família com e-mail verificado | Implementado, aguardando teste | E2E + 6 testes de regra |
| Regras multitenant (Firestore e Storage) | Implementado, aguardando teste | 49 testes; mutação: regras abertas falham 38/48 |
| Migração com backup, dry-run, verificação e rollback | Implementado, aguardando teste | 9 testes |
| Backend de assinaturas (Stripe principal, Mercado Pago alternativo) | Implementado, aguardando teste | 27 testes; **não publicado** |
| Conta e plano no app (status, planos, assinar, gerenciar, somente leitura) | Implementado, aguardando teste | E2E (flags, isenta, teste, vencida) |
| Cadastro self-service de professor (flag no servidor) | Implementado, aguardando teste | E2E: verificação → organização em teste; convite tem prioridade |
| Onboarding em 8 passos | Implementado, aguardando teste | unitário + E2E |
| Exportação de dados (LGPD) | Implementado, aguardando teste | E2E com conferência de contagens |
| Trilha de auditoria (pagamentos, valores, exclusões, créditos, convites) | Implementado, aguardando teste | E2E + teste de regra da consulta |
| Pix de aula oculto até existir backend | Implementado, aguardando teste | E2E |
| Regra "falta cobrada consome crédito" configurável por conta (padrão: desligada, como no V4) | Implementado, aguardando teste | E2E com o interruptor ligado |
| Site comercial | Implementado, aguardando publicação | `site/index.html`; capturas reais com dados fictícios |
| Minutas de termos, privacidade e contrato de operador | Pendente de revisão jurídica | `docs/legal/` |
| CI | Implementado, aguardando primeira execução | `.github/workflows/profgestor-ci.yml` |
| Regras atuais de produção | Analisadas | `docs/evidencias/`; brecha A23 mitigada |
| Publicação de qualquer item em produção | **Bloqueado** | sem credenciais; exige sua autorização |
| Projeto de homologação | **Verificado em homologação** | gestao-pro-b85bf (ver seção acima) |
| Google Agenda com OAuth no servidor | Pendente | app indica "reconexão necessária" |
| Cobrança Pix das aulas | Pendente | função não existe em produção |
| Paginação/cache de leituras | Pendente | ver CUSTOS.md |
| Limites por plano (ex.: 25 alunos no Essencial) | Pendente | exige contador no backend |
| Acesso excepcional de suporte com registro | Pendente | hoje simplesmente não há acesso da plataforma ao conteúdo |
| Assistente com IA, automações e lembretes, métricas MRR/churn, plano Equipe | Pendente | não iniciados |
| Integração IROS/Jair OS | Pendente | conexão e contrato não verificados |

## Matriz de testes obrigatória (seção 15)

| Caso | Resultado | Onde |
|---|---|---|
| Professor A não acessa dados de B; B não altera A | ✅ emulador | regras › Isolamento; E2E "professor B vê apenas o próprio tenant" |
| Responsável vê só o autorizado | ✅ | regras › Portal da família; E2E portal |
| Usuário sem assinatura não obtém acesso | ✅ | regras › Direito de uso; E2E teste vencido |
| APIs e arquivos com as mesmas permissões | ✅ | `storage.rules.test.js` |
| Novo assinante, renovação, falha, cancelamento, reativação, troca de plano | ✅ | `billing.test.js` › ciclo de vida |
| Webhook duplicado / atrasado / replay | ✅ | `billing.test.js` › segurança |
| Estorno | ✅ (cancelamento imediato) | idem |
| Manipulação de preço no frontend | ✅ | checkout no servidor |
| Aulas sobrepostas | ✅ | E2E Agenda |
| Recorrência (e conflito dentro dela) | ✅ | E2E Agenda |
| Reagendamento e cancelamento | ✅ | E2E Agenda |
| Fuso horário | ✅ (Manaus × São Paulo) | E2E Agenda |
| Exceção em evento recorrente | ✅ parcial | cada ocorrência é um documento independente; editar uma não altera as demais |
| Falha temporária do Google, reconexão, evento duplicado no Google | ⏳ não testado | exige conta Google de teste |
| Criação de aluno, lançamento de aula, presença, consumo de pacote, pagamento | ✅ | E2E |
| Relatório PDF | ✅ | E2E (download e assinatura `%PDF-`) |
| Consulta por responsável | ✅ | E2E |
| Restauração de backup | ✅ emulador | migração › rollback total |
| Concorrência, latência, carga, limites externos | ⏳ não testado | só estimativa (CUSTOS.md) |

Comandos em `profgestor/`: `npm test` (unitário + emulador) e `npm run test:e2e`.

## Critérios de prontidão comercial (seção 17)

| Critério | Atende? |
|---|---|
| Multiusuário funcionando | Parcial — pronto e testado; não publicado |
| Isolamento de tenants aprovado | Sim, no emulador |
| Migração validada | Sim — ensaio com cópia real em homologação |
| Cobrança recorrente em ambiente de teste | Não — código testado com SDK oficial; falta conta Stripe de teste |
| Webhooks seguros e idempotentes | Sim, no emulador |
| Agenda sem conflitos indevidos | Sim, no emulador (sem Google) |
| Integrações anunciadas operacionais | Sim — o site só anuncia o que funciona; Google e Pix aparecem como "em breve" |
| Onboarding de professor externo concluído | Não — fluxo pronto; falta um professor real |
| Cadastro de alunos e aulas | Sim |
| Financeiro consistente | Sim, no emulador |
| Relatórios corretos | Parcial — PDF gerado; conteúdo não conferido por pessoa |
| Backup e restauração testados | Sim, no emulador |
| Testes automatizados passando | Sim (116) |
| Monitoramento de falhas | Não |
| Privacidade/contratos para revisão | Sim — minutas prontas para o advogado |
| Sem vulnerabilidade crítica/alta conhecida sem mitigação | Sim — A23 mitigada; correção definitiva com a publicação das regras V5 |
| Custos compatíveis com o preço | Sim, por estimativa |
| Aprovação do responsável | Pendente |

## Recomendação

**Ainda não está pronto para comercialização.** O código das Fases 0 a 4 está completo e
testado; o que falta depende de acesso e decisões suas:

1. Conceder acesso de leitura ao projeto `gestao-aulas-jair` (ou exportar as regras atuais) para fechar o achado A4.
2. Criar o projeto de homologação; publicar este branch lá e ensaiar a migração com cópia dos dados (MIGRACAO.md).
3. Publicar em produção, nesta ordem: pausar o agente de agenda do Jair OS → migrar → regras → app.
4. Abrir conta Stripe em modo de teste e publicar as Functions em homologação (PAGAMENTOS.md).
5. Revisão jurídica das minutas; publicar termos e privacidade.
6. Piloto com 10 a 20 professores: ligar `selfSignupOpen` e, quando a cobrança de teste estiver validada, `billingEnabled`.
