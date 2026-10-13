# IROS — Implantação de disponibilidade: execução de 13/10/2026

> Registro operacional versionado. Dados sensíveis e segredos não foram incluídos.
> As evidências primárias estão nas migrations Supabase, cron.job_run_details, Railway e GitHub Actions.

## Aplicado e confirmado

- Supabase principal zfbcvoaxgswjsgbavobp: ACTIVE_HEALTHY.
- Supabase migration iros_external_availability_probe_20261013_v2:
  - Tabela privada jair_os.iros_public_uptime_samples, com RLS habilitado e sem leitura por anon/authenticated.
  - Função SECURITY INVOKER, sem EXECUTE público, que valida HTTP 200 e JSON ok=true no endpoint HTTPS público de autenticação do IROS.
  - pg_cron iros-public-entrypoint-probe-5m em */5 * * * *; falha em 2 verificações consecutivas cria alerta via jair_os.set_platform_alert; 2 sucessos consecutivos resolvem.
  - Evidência: 2 cron runs SUCCESS, 3 amostras ready=true, HTTP 200.
- Supabase migration iros_slo_safe_flag_cast_20261013: retirados 10 casts inseguros de metadata textual para booleano na captura de SLO. A falha anterior era: invalid input syntax for type boolean: "deterministic_math_and_visual_review". Verificação: 7 linhas de medição criadas; novo cron job succeeded.
- Schedules corrigidos: health_watch a cada 5 min; snapshot a cada 5 min; SLO measure a cada 15 min (6,21,36,51); incident sync a cada 15 min (8,23,38,53).
- Supabase migration iros_cron_reliability_watch_20261013: watchdog dos cinco jobs críticos a cada 15 min, com alerta para falha ou execução vencida. Teste direto retornou unhealthy_jobs=0.
- IROS governance: SRE-003 criado como controle mensurável, evidência registrada; BCP-001 recebeu evidência de restauração lógica isolada.
- Railway: 5 serviços ONLINE, 0 failures na janela de uma hora, quando auditados.
- GitHub/main: workflow de uptime HTTPS externo agendado a cada 15 minutos, primeira execução SUCCESS; CodeQL SAST semanal instalado e primeira execução SUCCESS.
- GitHub PR #1: monitor sintético read-only e testes CI; dois runs de teste aprovados (não implantado como serviço independente por limite de recursos do plano Railway).

## Backup offsite e restauração lógica isolada

O snapshot armazenado em Google Drive de 13/10/2026 foi obtido em sete partes NDJSON/gzip. Teste independente realizado em memória isolada:
- 7/7 hashes SHA-256 de conteúdo descomprimido iguais aos manifestos;
- 432/432 coleções presentes;
- 101.566/101.566 linhas JSON reconstruídas;
- 0 divergências de contagem;
- arquivos brutos transitórios eliminados do ambiente de testes.

Escopo: restauração **lógica de linhas**, não rebuild Postgres. Ainda não há evidência de restauração em um cluster Postgres isolado com DDL, índices, constraints, RLS, credenciais, funções, ou de failover operacional. RTO/RPO e SLA 99,9% **não estão certificados**.

## Riscos que não devem ser marcados como concluídos

1. Supabase security advisor mantém 54 avisos de funções SECURITY DEFINER acessíveis a authenticated e 12 avisos GraphQL. Cada RPC deve ser auditada quanto a auth.uid, grants e casos de uso. Não revogar permissões em massa.
2. Proteção de senha vazada no Auth indisponível para alteração pela API de ferramentas atual; exige acesso à configuração administrativa do Supabase.
3. Extensão pg_net sinalizada em public. Não mover sem avaliar dependências dos 100+ jobs e scripts existentes.
4. Alta disponibilidade multirregional e redundância com volumes Railway não foram instaladas; tentativa de nova Function falhou por limite de provisionamento no plano Free.
5. Monitoração interna de n8n: Railway mostra Online e média ~0,44GB/limite 0,75GB nas últimas 6h, mas pico histórico de ~0,72GB/0,75GB foi observado. Otimização exige observar carga e não sobrescrever variáveis atuais com valores redigidos no conector.
6. Os alertas operacionais antigos e SLO breaches históricos permanecem; não fechá-los sem evidência de correção.

## Procedimento de reversão (executar somente com autorização no incidente)

Em caso de regressão dos três agendamentos originais:
```sql
select cron.alter_job(job_id:=21,schedule:='6-59/15 * * * *');
select cron.alter_job(job_id:=38,schedule:='26 * * * *');
select cron.alter_job(job_id:=43,schedule:='1 * * * *');
```

Para suspender os novos monitores, usar cron.alter_job(job_id := <id_atual>, active := false) após descobrir os jobid por nome, preservando os dados de auditoria. Não excluir evidências ou fazer rollback de tabelas enquanto houver incidentes abertos. Antes de qualquer recuperação de banco, restaurar backup em ambiente isolado, homologar e só então executar ações consequenciais por IROS Policy/Action Bus/Approval.
