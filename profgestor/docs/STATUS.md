# Status da entrega V5 — 09/11/2026

Classificação exigida: **Verificado em produção · Verificado em homologação · Implementado,
aguardando teste · Pendente · Bloqueado.** Não existe ambiente de homologação ainda: tudo que
foi testado rodou em **emulador local** (Firebase Emulator + Chromium). Por isso nada abaixo
está como "verificado em homologação".

## Entregas

| Item | Estado | Evidência |
|---|---|---|
| Baseline V4 versionado | Implementado | `web/PROVENANCE.md` (SHA-256 da captura) |
| Correção do painel/CRM/Sala da aula (`v4-features.js`) | Implementado, aguardando teste | E2E: indicadores reais, CRM com conversão em aluno |
| Correções `exists()`, datas locais, fuso Google | Implementado, aguardando teste | unitários + E2E sem erros de JavaScript |
| Consumo/estorno de crédito transacional | Implementado, aguardando teste | E2E com cliques concorrentes: 1 crédito; estorno ao mudar para falta |
| Portal da família com e-mail verificado | Implementado, aguardando teste | E2E de ativação + 6 testes de regra |
| Regras multitenant Firestore/Storage | Implementado, aguardando teste | 48 testes; mutação: regras abertas falham 38, fechadas 22 |
| Migração com backup/rollback | Implementado, aguardando teste | 9 testes (adulteração, dry-run, idempotência, 2 rollbacks) |
| Backend de assinaturas (Stripe + MP) | Implementado, aguardando teste | 27 testes; **não publicado** |
| CI (unitário + emulador + E2E) | Implementado, aguardando teste | `.github/workflows/profgestor-ci.yml` (primeira execução ocorrerá no PR) |
| Regras atuais de produção | **Bloqueado** | sem credenciais do projeto |
| Publicação em produção de qualquer item | **Bloqueado** | sem credenciais; exige autorização |
| Projeto de homologação | Pendente | criar projeto Firebase separado |
| Google Calendar com OAuth no servidor | Pendente | estado "reconexão necessária" já indicado |
| Pix de aula (`criarCobrancaPix`) | Pendente | função inexistente em produção (404) |
| UI de assinatura no app, onboarding, landing comercial | Pendente | — |
| Cadastro self-service de professor | Implementado nas regras (flag desligada); UI pendente | 4 testes de regra |
| Paginação/cache de leituras | Pendente | ver CUSTOS.md |
| Relatórios PDF, recorrência com exceções, assistente IA, automações, métricas MRR | Pendente | não alterados nesta entrega |
| Integração IROS/Jair OS | Pendente | conexão e contrato não verificados; não conectado |

## Matriz de testes obrigatória (seção 15)

| Caso | Resultado | Teste |
|---|---|---|
| Professor A não acessa dados de B | ✅ aprovado (emulador) | `firestore.rules.test.js` › Isolamento + E2E "professor B vê apenas o próprio tenant" |
| B não altera registros de A | ✅ | Isolamento › "B não altera nem exclui" |
| Responsável acessa só o autorizado | ✅ | Portal da família (5 testes) |
| Usuário sem assinatura não obtém acesso | ✅ | Direito de uso (5 testes) + E2E teste vencido |
| APIs e arquivos com as mesmas permissões | ✅ | `storage.rules.test.js` (6) |
| Novo assinante, renovação, falha, cancelamento, reativação, troca de plano | ✅ | `billing.test.js` › ciclo de vida |
| Webhook duplicado / atrasado | ✅ | `billing.test.js` › segurança |
| Estorno | ✅ (cancelamento imediato) | idem |
| Manipulação de preço no frontend | ✅ | Checkout no servidor (5 testes) |
| Criação de aluno, lançamento de aula, presença, consumo de pacote, pagamento | ✅ parcial | E2E (aluno via CRM, presença/consumo); lançamento de aula pelo formulário não automatizado |
| Consulta por responsável | ✅ | E2E portal |
| Restauração de backup | ✅ (emulador) | `migration.test.js` › rollback total |
| Aulas sobrepostas, recorrência, exceção, fuso, reagendamento, falha/reconexão Google, evento duplicado | ⏳ não testado | lógica V4 preservada, sem testes ainda |
| Relatório PDF | ⏳ não testado | — |
| Concorrência, latência, carga, limites externos | ⏳ não testado | só estimativa (CUSTOS.md) |

Comando: `npm test` (unitário + emulador) e `npm run test:e2e` em `profgestor/`.
Última execução local: **7 + 84 + 8 = 99 testes, 0 falhas**.

## Critérios de prontidão comercial (seção 17)

| Critério | Atende? |
|---|---|
| Multiusuário funcionando | Parcial — regras prontas; não publicado |
| Isolamento de tenants aprovado | Sim, no emulador |
| Migração validada | Não — falta ensaio com dados reais em homologação |
| Cobrança recorrente em ambiente de teste | Não — código testado com SDK oficial, sem conta Stripe de teste conectada |
| Webhooks seguros e idempotentes | Sim, no emulador |
| Agenda sem conflitos indevidos | Não verificado |
| Integrações anunciadas operacionais | Não — Google Calendar instável; Pix de aula inexistente |
| Onboarding de professor externo concluído | Não |
| Cadastro de alunos e aulas | Sim (E2E parcial) |
| Financeiro consistente | Parcial — indicadores do painel corrigidos e testados |
| Relatórios corretos | Não verificado |
| Backup e restauração testados | Sim, no emulador |
| Testes automatizados passando | Sim |
| Monitoramento de falhas | Não |
| Privacidade/contratos para revisão | Parcial — LGPD.md; termos e DPA não redigidos |
| Sem vulnerabilidade crítica/alta conhecida sem mitigação | **Não** — A4 (regras de produção não verificadas) |
| Custos compatíveis com o preço | Sim, por estimativa |
| Aprovação do responsável | Pendente |

## Recomendação

**Não está pronto para comercialização.** Próximos passos, em ordem:

1. Conceder acesso de leitura ao projeto `gestao-aulas-jair` (ou exportar as regras atuais) para fechar o achado A4.
2. Criar o projeto de homologação; publicar regras + hosting deste branch lá e ensaiar a migração com cópia dos dados.
3. Publicar em produção (migração → regras → hosting), com o agente de agenda do Jair OS pausado.
4. Conta Stripe em modo de teste; publicar as Functions em homologação; rodar a matriz com test clocks.
5. Fase 4: UI de assinatura, onboarding, landing page; ocultar o botão de Pix de aula até existir backend.
6. Piloto com 10–20 professores com a flag `selfSignupOpen` ligada apenas em homologação.
