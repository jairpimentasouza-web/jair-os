# Operação IROS — Relatório de intervenção (14/10/2026)

**Executor:** Claude Code (sessão cloud) · **Contrato mestre:** `iros_master_contract` v3.0 · **Execução IROS:** `cb2c244f-3085-4272-aea6-4d3151712937`
**Ledger final:** `release_change_ledger` `20c8f6b6-2169-4fad-887d-4a2671d8d076` · **Aprovação de finalização pendente:** `approval_requests` `9a5ef0b6-11f4-42a7-9903-101d39f17fc0`

> **O sistema NÃO está plenamente recuperado.** Há bloqueios críticos dependentes de privilégio de plataforma, de plano pago, de identidade do proprietário e de permissão da escola (seção 12).

Uma sessão ChatGPT/Codex trabalhou em paralelo no mesmo plano (migrações `iros_p0_*` entre 07:19 e 09:17 UTC e leituras do ActiveSoft entre 13:11 e 13:14 UTC). Este relatório separa o que **esta sessão** fez do que foi observado da outra. Não detectei sobreposição destrutiva: o md5 de `capture_service_slos_all()` antes da minha mudança era idêntico ao das 07:21.

Legenda de estado: `VERIFICADO` · `CORRIGIDO E TESTADO` · `EM HOMOLOGAÇÃO` · `BLOQUEADO` · `NÃO EXECUTADO`

---

## 1. Nota do IROS (estimada) e métricas comprovadas

**Nota estimada, não é uma medição.** Média simples de 5 dimensões (0–10), atribuída por julgamento a partir das evidências abaixo:

| Dimensão | Antes | Depois | Base |
|---|---:|---:|---|
| Confiabilidade/execução | 4,0 | 5,5 | Calendar 100% → 0% erro; jobs presos zerados; orquestrador 7d 74,6% |
| Segurança | 6,0 | 6,0 | Nenhuma vulnerabilidade remanescente corrigível com os meus privilégios; revisão feita |
| Governança/observabilidade | 8,0 | 8,5 | SLI transparente (classificação), reconciliador, evidências no ledger |
| Integrações escolares | 3,0 | 3,5 | Leitura do ActiveSoft funcionando e verificada no código; escrita bloqueada |
| Agentes | 3,0 | 3,0 | 0 certificados; bloqueio estrutural por volume |
| **Média** | **4,8** | **5,3** | |

**Métricas comprovadas (medidas no banco):** seção 5.

## 2. Componentes corrigidos por esta sessão

| Componente | Problema (causa-raiz) | Estado |
|---|---|---|
| Edge `jair-os-google-calendar` | `conn()` pegava a conexão Google ativa mais recente; desde 12/10 21:54 era a conexão `classroom_isolated` (sem escopo de calendário) → **82/82 respostas HTTP 500 em 24h**. O bug também se autorreforçava: o Calendar renovava o token do Classroom a cada 30 min e o mantinha como "mais recente". | **CORRIGIDO E TESTADO**: 21×200 / 0×500 entre 07:33 e 13:00; conexão `b37741d2` renovando |
| Action Bus — jobs órfãos | Reapers encerravam execuções mas deixavam `action_jobs` filhos pendurados (`dispatched` desde 13/10; `queued` desde 09/10) | **CORRIGIDO E TESTADO**: `jos_reconcile_orphan_action_jobs` + cron 103; 2 reconciliados de forma honesta; 0 em trânsito |
| Metodologia de SLO | SLI contava bloqueio de política/gate de qualidade como indisponibilidade; SLI "database" media a suíte de contratos | **CORRIGIDO E TESTADO**: `jos_classify_failure` + detalhamento nos metadados; `availability_pct`/`status` brutos **idênticos** à v1 |
| Reaper de execuções | Cast `::boolean` inseguro (mesma classe que derrubou o job de SLO em 13/10) | **CORRIGIDO E TESTADO**: 3 execuções do cron 72 sem erro após a mudança |

Causa-raiz das 156 falhas do orquestrador (30d): **131 vêm do WF-005** (111 numa rajada do *autopilot* local llama.cpp em 18–19/09 e 20 rejeições do auditor). A causa já tinha sido contida em 08/10 (WF-005 desabilitado, cron 67 inativo, ER-004/ER-005 sem WF-005). A janela de 30d só se limpa em ~19/10. Não reclassifiquei nenhum status para "melhorar" o número.

## 3. Arquivos, funções, serviços e configurações modificados

- Edge Function `jair-os-google-calendar` v6 → v7 (fontes antes/depois em `edge-functions/`)
- `jair_os.jos_reconcile_orphan_action_jobs(integer, boolean)` (nova) + `cron.job` 103 `jos-action-job-reconciler-15m`
- `jair_os.jos_classify_failure(text)` (nova)
- `jair_os.capture_service_slos_all()` (v2; definição anterior exata no ledger `f31027be…`)
- `jair_os.jos_reap_stale_executions(integer)` (cast seguro; definição anterior no ledger `f31027be…`)
- Dados: 2 `action_jobs` reconciliados (`7fed8f35` → cancelled; `83003b8a` → failed + readback exigido); 1 execução de teste sintético (`66608467`, marcada `test=true`, cancelled); alerta `stale_execution:cb2c244f…` resolvido
- Migrações: `migrations/01_action_jobs_orphan_reconciler.sql`, `migrations/02_slo_failure_classification.sql`

**Não alterado de propósito:** grants das funções `SECURITY DEFINER`, GraphQL, pg_net, adaptador ActiveSoft, registros `manual_bridge`, dispositivos, agentes, alertas originais.

## 4. Testes executados

| Teste | Resultado |
|---|---|
| Calendar: GET de saúde / POST sem credencial | 3.1.1 no ar / **401** (teste negativo ok) |
| Calendar: tráfego real após o deploy | 21×200, 0×500 |
| Reconciliador: dry-run → execução → readback | Exatamente os 2 órfãos; `blocked` e `running` ativos intocados (negativo ok); auditoria + alerta gerados |
| Gate de contrato do Action Bus | Bloqueou corretamente entrada sem `profile` (2 jobs, 06:16) |
| SLO v2 vs v1 | Blocos de cálculo bruto e de status idênticos (verificado no servidor); números iguais aos da v1 das 13:06 |
| Roteamento central E2E (`jair_os_rotear`) | Execução persistida + trace + auditoria; custo US$ 0 |
| Suítes de contrato (13:23 UTC) | finalização **12/12**, RAG **11/11**, segurança **4/5**, invariantes de produção **9/11** |
| Security Advisor / Performance Advisor | Ver seções 7 e 5 |

## 5. Indicadores

| Indicador | Auditoria (14/10) | Agora (13:24 UTC) |
|---|---:|---:|
| Orquestrador 30d (bruto) | 29,73% | 30,09% |
| Orquestrador 30d (serviço, exclui política/gate) | — | 34,00% |
| Orquestrador 7d / 24h | — | **74,55%** / 86,67% (n=15, amostra insuficiente) |
| Action Bus 30d / 7d / 24h | 88,17% | 91,08% / 93,60% / **98,88%** |
| Action Bus — jobs em trânsito/presos | 2 órfãos + 1 fila parada | **0** |
| Desktop Bridge 30d | 87,13% | 91,41% (serviço 92,22%) |
| Google Workspace 30d | 92,00% | 92,00% (serviço 100%: as 2 falhas eram política; n=23) |
| Edge Calendar, taxa de erro | 100% (82/82) | **0%** (0/21) |
| Superfície desktop do orquestrador | 37,04% | 34,71% |
| Pontes manuais (`manual_bridge`) | 4 | 9 (+5 criadas hoje pela sessão ChatGPT/Codex) |
| SECURITY DEFINER executáveis por authenticated | 54 | 48 (redução feita pela outra sessão) |
| FKs sem índice | 5 | 0 (corrigido pela outra sessão) |
| Agentes habilitados sem manifesto | 1 | 0 (corrigido pela outra sessão) |
| RAG recall@5 / nDCG@10 / MRR (101 casos, 7d) | — | 0,990 / 0,986 / 0,985 (p95 497 ms) |
| RAG respostas aprovadas (critério v2) | "0" (campo legado) | 186/202 (92,1%) |

A meta de 99,5% **não é demonstrável** com o volume atual: pela regra de três, são necessárias ≥ 600 requisições elegíveis por janela, e o orquestrador tem 200.

## 6. Alertas eliminados por correção comprovada

**Nenhum dos 16 alertas originais foi fechado por esta sessão.** O painel não foi "esverdeado". A falha do Calendar não tinha alerta: foi achada nos logs. O único alerta resolvido foi `stale_execution:cb2c244f…`, que pertencia a esta própria execução (inatividade causada pelo reinício do worker). Foi aberto o alerta `action_job_readback_required:83003b8a…`, que segue aberto como deve.

## 7. Vulnerabilidades remanescentes

| Item | Situação | Estado |
|---|---|---|
| pg_net: `net.*` executável por PUBLIC/anon/authenticated (12 funções) | Concedido por `supabase_admin`; `postgres` não tem *grant option*. Dependências analisadas: nenhuma função INVOKER ou gatilho de papel de API usa `net.http_*`, então a revogação é segura. Script pronto: `security/pg_net_revoke_for_supabase_admin.sql` | **BLOQUEADO** (privilégio de plataforma) |
| pg_net no schema `public` | Mover exige *drop/recreate* (janela de manutenção) | **BLOQUEADO** |
| Proteção contra senha vazada | Recurso do plano Pro+ (docs Supabase); organização no plano free | **BLOQUEADO** (decisão financeira) |
| 48 RPCs SECURITY DEFINER (ProfGestor/E5/JurídicoOS) | Revisadas uma a uma: 48/48 com `search_path` fixo, 0 executáveis por anon, 47 com guarda ou vínculo `auth.uid()`. São a API das apps, por isso mantidas | **VERIFICADO** (risco aceito com justificativa) |
| `e5_plan_of` sem guarda | Plano de qualquer workspace por UUID; UUIDs alheios não são enumeráveis (RLS). Revogar é seguro para os chamadores internos, mas o cliente E5 não pôde ser testado | Pendente de confirmação |
| `e5_claim_admin` / `e5_accept_invites` | Dependem de "Confirm email" ativo no Auth (evidência indireta: existe usuário não confirmado). Admin já reivindicado e confirmado, então não explorável hoje | **VERIFICADO** |
| GraphQL: 10 objetos para authenticated, 2 para anon | 0 requisições GraphQL em 24h, mas o app E5 também teve 0 tráfego. Dados sob RLS; exposição é de metadados. `admin_email` **não** é exposto | Pendente de confirmação |
| 8 tabelas com RLS sem política | Negação total para papéis de API (seguro por padrão) | **VERIFICADO** |

## 8. Agentes certificados

**0.** 75 habilitados, 67 registros de certificação, todos `candidate`. Só 6 agentes estão no escopo de produção, e os 6 *canaries* das últimas 24h deram `insufficient_evidence`. A política exige ≥ 50 execuções e ≥ 30 auditorias por agente em 7 dias, e o sistema inteiro faz cerca de 15 execuções terminais por dia. As 37 do orquestrador foram cancelamentos administrativos do backlog do WF-005, que o *canary* conta como falha (atribuição a corrigir; não mudaria o resultado). Os 12 agentes `legal.*` têm registros desatualizados desde 11/09, fora do escopo de recertificação. **Não rebaixei limiares nem forcei certificações.**

## 9. ActiveSoft (Legacy Barra) — estado real

- **Leitura: EM HOMOLOGAÇÃO.** Sessão docente server-side estabelecida (13:11 UTC). `recuperar_notas` das turmas 102/103/110, disciplina 11, fases 508/521/534 → HTTP 200. `turma_aluno_avaliacao` → 403; `bloco_avaliacoes/crud` → 500.
- **Adaptador:** somente leitura verificado no código (operações restritas, `GET` fixo, allowlist de caminho, denylist de verbos de escrita, auditoria sem dados de alunos nem credenciais).
- **Defeito encontrado:** novo login forçado em todo HTTP 403 (15 logins hoje, ~9 provocados por 403), com risco de bloqueio da conta. Patch pronto em `pending/`; **não aplicado** porque a sessão ChatGPT estava usando o adaptador.
- **Escrita da AV2: BLOQUEADO.** Gradebook com 403, exige aprovação específica e notas-fonte confirmadas. **Nenhuma nota foi lançada.**
- Relatado pela sessão ChatGPT (09:18 UTC) e **não verificado por esta sessão:** 31 alunos, 28 correspondências preliminares, 3 ambíguas, 6 sem nota, e-mail de escalonamento à escola enviado.
- Esta sessão **não autenticou** no ActiveSoft, para não abrir sessão paralela.

## 10. Disponibilidade cloud

- **Supabase:** `ACTIVE_HEALTHY`; crons críticos rodando (reaper, SLO, reconciliador, radar Legacy às 10:05).
- **n8n-staging (Railway):** implantado, 1 réplica, sem crash, ~0,44/0,75 GB. **Sem prova de disponibilidade contínua:** 0 HTTP em 25h, workflow não publicado, runner Python ausente, `N8N_RUNNERS_MODE=internal` depreciado. Executou 5 jobs com sucesso em 13/10; nenhum desde então. **EM HOMOLOGAÇÃO.**
- Teste E2E Action Bus → n8n: **BLOQUEADO.** Exige sessão do proprietário ou token do worker; inserir job direto no banco burlaria a governança.
- O alerta `n8n_executor_health` refere-se ao n8n **local antigo** (Windows, `127.0.0.1:5682`). Pela política cloud-first, não deve ser religado.
- **Acesso remoto:** só o iMac está online (Desktop Commander e heartbeat). Lenovo offline há 62 h (IROS) / 123 h (DC); ASUS há 125 h. Há um registro duplicado do Lenovo e o `CEJA - L1CAMYM` habilitados e nunca vistos. Tailscale e MeshCentral **NÃO EXECUTADO** (sem ferramenta nesta sessão).

## 11. Evidências persistidas no IROS

`release_change_ledger`: `2488b9bf` (plano Calendar), `10d49253` (Calendar verificado), `f31027be` (rollback exato SLO/reaper), `1b39c672` (segurança), `3ee07278` (ActiveSoft), `20c8f6b6` (final). Também: `audit_events` (reconciliação), `observability_alerts` (readback), memória `engineering/iros_recovery_20261014_claude`, tarefa `aee8ff6a`, aprovação `9a5ef0b6`, commit `74ac241` em `claude/bold-hopper-lox1ly`.

## 12. Pendências e bloqueios legítimos (prioridade)

1. Aprovar a finalização da execução `cb2c244f` (`9a5ef0b6`); a sessão não se autoaprova.
2. pg_net: executar o script como `supabase_admin` (chamado no suporte Supabase).
3. ActiveSoft: aplicar o patch "não relogar em 403" com o adaptador ocioso; manter a escrita da AV2 bloqueada até haver permissão no gradebook e aprovação específica.
4. n8n Railway: publicar workflows, criar sonda sintética contínua e emitir token de worker para o E2E governado.
5. Senha vazada: plano Pro, ou política de senha mais forte no painel Auth (sem custo).
6. Confirmar o não uso de GraphQL para revogar `graphql_public` (zera 12 avisos).
7. Retirar os 5 `manual_bridge` do Railway ao fim da migração; reduzir a superfície desktop (34,71% contra a meta de 20%).
8. Agentes: decidir entre manter a certificação por volume de produção ou criar uma trilha de avaliação offline; corrigir a atribuição de cancelamentos administrativos no *canary*; incluir ou arquivar os 12 `legal.*` desatualizados.
9. RAG: 45 fontes sem chunks (39 páginas web nunca buscadas, 4 itens do Drive, 1 coleção autenticada, 1 "indexed" sem chunks); trocar o resumo de qualidade para `passed_v2`; ampliar o conjunto de avaliação para material didático.
10. Higiene de dispositivos: registro duplicado do Lenovo e CEJA nunca visto.

---

## Adendo — 15/10/2026: execução das aprovações ("Aprovo tudo")

| Item | Resultado | Estado |
|---|---|---|
| ActiveSoft: não relogar em 403 (`migrations/03_…`) | As 2 condições trocadas; leitura de teste com 403 sem novo login; uso real depois: 30 leituras / 3 logins (22:29–00:07 UTC); md5 preservado em 15/10 | **CORRIGIDO E TESTADO** |
| `e5_plan_of` sem acesso direto (`migrations/04_…`) | `authenticated` → `permission denied`; os 6 chamadores `SECURITY DEFINER` do `postgres` não foram afetados | **CORRIGIDO E TESTADO** |
| Resumo de qualidade do RAG no critério v2 (`migrations/05_…`) | 186/202 aprovadas; legado (0/202) mantido em coluna própria; `security_invoker` preservado | **CORRIGIDO E TESTADO** |
| pg_net | Canal de migração também roda como `postgres` (sonda abortou sem registro) | **BLOQUEADO** (suporte Supabase) |
| Desativar `pg_graphql` | 0 chamadas a `graphql.resolve` desde 31/08; sem dependências; o comando ficou retido aguardando confirmação interativa (2 tentativas, nada aplicado); revogar `graphql.resolve` não é possível (dono `supabase_admin`) | **BLOQUEADO** (sua confirmação) |
| Higiene de dispositivos | `UPDATE` retido pela ferramenta antes de chegar ao banco (nada aplicado) | **BLOQUEADO** (sua confirmação) |
| Finalização da execução `cb2c244f` | Aprovação `9a5ef0b6` registrada (`approved`); o `UPDATE` de status ficou retido pela ferramenta (o observador não viu a instrução no banco) | **EM HOMOLOGAÇÃO** (sua confirmação) |
| Senha vazada / E2E n8n / `manual_bridge` | Plano Pro; identidade do proprietário; condicionado ao fim da migração Railway | **BLOQUEADO** / **NÃO EXECUTADO** |

**Novo alerta crítico (`aaba79d1`).** A função `jair_os.iros_as_grade_write`, criada pela sessão ChatGPT em 14/10 às 22:33, escolhe a coluna da AV2 por `nome ILIKE '%AV2%' OR valor_maximo = 10`. Sem coluna AV2, qualquer avaliação com máximo 10 (por exemplo AV1/`nota_01`) seria usada, ficando com a última correspondência. A função também não exige aprovação registrada. Exposição atual baixa: só o `postgres` executa, o módulo de notas retorna 403 e **nenhuma escrita foi feita** (`write_executed=false`). Não alterei a função porque estava em desenvolvimento ativo por outra sessão. Correção necessária antes de qualquer lançamento real: casar só o nome explícito da AV2, abortar se houver mais de uma correspondência, exigir `approval_request` aprovado quando `p_dry_run=false` e fazer *readback* valor a valor.

**SQL pronto para você rodar no SQL Editor:**
```sql
-- 1) finalizar a execução (aprovação 9a5ef0b6 já registrada)
update jair_os.executions set status='succeeded', finished_at=now()
 where id='cb2c244f-3085-4272-aea6-4d3151712937' and status='running';
-- 2) higiene de dispositivos (registros nunca conectados)
update public.jairo_desktop_devices set enabled=false
 where id in ('b0307ed0-5d10-4986-b96f-ddd194127ce7','592ff3a5-de99-4f84-b9e6-93631b3f9799') and last_seen_at is null;
-- 3) GraphQL sem uso (reverter: create extension pg_graphql with schema graphql;)
drop extension pg_graphql;
```

Evidências no ledger: `947685bc`/`34dc524b` (ActiveSoft), `64d976f5`/`89c5cf74` (GraphQL), `723e6acb` (consolidado de 15/10).
