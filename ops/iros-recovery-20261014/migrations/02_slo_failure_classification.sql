-- IROS recovery 2026-10-14 — SLO methodology v2 (transparent failure classification).
-- Nothing is reclassified in source tables: executions/action_jobs keep their status.
-- availability_pct and status stay RAW (unchanged semantics, alerts unchanged).
-- metadata gains: failure_breakdown, service_availability_pct (excludes governance
-- outcomes: policy/approval blocks, quality-gate rejections, rejected inputs),
-- eligible_service_requests and a rule-of-three sample sufficiency flag.
-- Rollback: the exact previous definitions of capture_service_slos_all() and
-- jos_reap_stale_executions(integer) are stored server-side in
-- jair_os.release_change_ledger id f31027be-fde3-4666-a8a9-760ef669f03e
-- (evidence->>'rollback_sql_capture_service_slos_all' / '..._jos_reap_stale_executions'):
--   do $$ begin execute (select evidence->>'rollback_sql_capture_service_slos_all'
--     from jair_os.release_change_ledger where id='f31027be-fde3-4666-a8a9-760ef669f03e'); end $$;
-- then: drop function jair_os.jos_classify_failure(text);

create or replace function jair_os.jos_classify_failure(p_error text)
returns text
language sql
immutable
set search_path to 'pg_catalog'
as $function$
  select case
    when p_error is null or btrim(p_error) = '' then 'unclassified'
    when p_error ~* '(rejected by auditor|quality[_ ]gate)' then 'quality_gate_rejected'
    when p_error ~* '(JOS_FINALIZATION_REQUIRES_VERIFIED_APPROVAL|not approved|did not approve|confirmation cancelled|denied by tool security policy|no permission bypass|fora das pastas autorizadas|nao autorizado|não autorizado|blocked by railway confirmation|GOVERNED_ACTION)' then 'policy_or_approval_block'
    when p_error ~* '(contract_violation|invalid_payload)' then 'input_rejected'
    when p_error ~* '(No heartbeat/lease|never reported|expired_read_lease|completion unverified)' then 'lease_timeout_unverified'
    when p_error ~* '(desktop_unavailable|TRANSPORT_UNAVAILABLE|offline|Connection refused|PROVISIONING_CONNECTION|tentativa de conex|missing_cloud_host)' then 'dependency_unavailable'
    else 'execution_error'
  end
$function$;

comment on function jair_os.jos_classify_failure(text) is
  'IROS SLO methodology v2 (2026-10-14): deterministic failure class from error text. Governance outcomes (policy_or_approval_block, quality_gate_rejected, input_rejected) are reported but excluded from service availability; everything else counts as a service failure.';

-- capture_service_slos_all v2: raw computation block is byte-for-byte the v1 logic;
-- a second block adds the classified breakdown for execution/action-job based SLIs.
create or replace function jair_os.capture_service_slos_all()
 returns integer
 language plpgsql
 security definer
 set search_path to 'pg_catalog', 'jair_os', 'public'
as $function$
declare
  s record;
  ws timestamptz;
  we timestamptz:=now();
  req bigint;
  fail bigint;
  p95 numeric;
  avail numeric;
  err numeric;
  budget numeric;
  st text;
  inserted_count int:=0;
  v_breakdown jsonb;
  v_gov_fail bigint;
  v_svc_fail bigint;
  v_eligible bigint;
  v_svc_avail numeric;
  v_min_sample bigint;
  v_sli_def text;
begin
  for s in select * from jair_os.service_slos where enabled loop
    ws:=we-make_interval(hours=>greatest(1,s.evaluation_window_hours));
    req:=0; fail:=0; p95:=null;
    v_breakdown:=null; v_gov_fail:=null; v_svc_fail:=null; v_eligible:=null; v_svc_avail:=null; v_sli_def:=null;

    if s.service_key='orchestrator' then
      select count(*),
             count(*) filter(where status='failed'),
             percentile_cont(.95) within group(order by latency_ms) filter(where status='succeeded' and latency_ms is not null)
        into req,fail,p95
      from jair_os.executions
      where owner_id=s.owner_id and created_at>=ws
        and status in ('succeeded','failed')
        and lower(btrim(coalesce(metadata->>'benchmark','false'))) not in ('true','t','1','yes','on')
        and lower(btrim(coalesce(metadata->>'internal_e2e','false'))) not in ('true','t','1','yes','on')
        and lower(btrim(coalesce(metadata->>'validation','false'))) not in ('true','t','1','yes','on')
        and lower(btrim(coalesce(metadata->>'test','false'))) not in ('true','t','1','yes','on');

    elsif s.service_key='action_bus' then
      select count(*),
             count(*) filter(where status='failed'),
             percentile_cont(.95) within group(order by extract(epoch from(finished_at-coalesce(started_at,dispatched_at,created_at)))*1000)
               filter(where status='succeeded' and finished_at is not null)
        into req,fail,p95
      from jair_os.action_jobs
      where owner_id=s.owner_id and created_at>=ws
        and status in ('succeeded','failed')
        and lower(btrim(coalesce(metadata->>'validation','false'))) not in ('true','t','1','yes','on')
        and lower(btrim(coalesce(metadata->>'test','false'))) not in ('true','t','1','yes','on');

    elsif s.service_key='agent_executor' then
      select count(*),
             count(*) filter(where status='failed'),
             percentile_cont(.95) within group(order by latency_ms) filter(where status='succeeded' and latency_ms is not null)
        into req,fail,p95
      from jair_os.model_usage_ledger
      where owner_id=s.owner_id and occurred_at>=ws
        and request_kind in ('agent_execution','council_candidate','council_audit');

    elsif s.service_key='desktop_bridge' then
      select count(*),
             count(*) filter(where status='failed'),
             percentile_cont(.95) within group(order by extract(epoch from(finished_at-coalesce(started_at,dispatched_at,created_at)))*1000)
               filter(where status='succeeded' and finished_at is not null)
        into req,fail,p95
      from jair_os.action_jobs
      where owner_id=s.owner_id and connector='desktop_agent' and created_at>=ws
        and status in ('succeeded','failed')
        and lower(btrim(coalesce(metadata->>'validation','false'))) not in ('true','t','1','yes','on')
        and lower(btrim(coalesce(metadata->>'test','false'))) not in ('true','t','1','yes','on');

    elsif s.service_key='telegram' then
      select count(*),
             count(*) filter(where status='failed'),
             percentile_cont(.95) within group(order by extract(epoch from(processed_at-received_at))*1000)
               filter(where status='processed' and processed_at is not null)
        into req,fail,p95
      from jair_os.telegram_updates
      where owner_id=s.owner_id and received_at>=ws;

    elsif s.service_key='google_workspace' then
      select count(*),
             count(*) filter(where status='failed'),
             percentile_cont(.95) within group(order by extract(epoch from(finished_at-coalesce(started_at,dispatched_at,created_at)))*1000)
               filter(where status='succeeded' and finished_at is not null)
        into req,fail,p95
      from jair_os.action_jobs
      where owner_id=s.owner_id
        and connector in ('google_workspace','google_calendar','gmail','google_classroom')
        and created_at>=ws and status in ('succeeded','failed')
        and lower(btrim(coalesce(metadata->>'validation','false'))) not in ('true','t','1','yes','on')
        and lower(btrim(coalesce(metadata->>'test','false'))) not in ('true','t','1','yes','on');

    elsif s.service_key='database' then
      select count(*),count(*) filter(where not passed),null::numeric
        into req,fail,p95
      from jair_os.system_contract_test_runs
      where owner_id=s.owner_id and executed_at>=ws;
    end if;

    -- v2 (2026-10-14): classified failure breakdown, same population as above.
    if s.service_key='orchestrator' then
      select coalesce(jsonb_object_agg(cls,n),'{}'::jsonb) into v_breakdown from (
        select jair_os.jos_classify_failure(error) cls, count(*) n
        from jair_os.executions
        where owner_id=s.owner_id and created_at>=ws and status='failed'
          and lower(btrim(coalesce(metadata->>'benchmark','false'))) not in ('true','t','1','yes','on')
          and lower(btrim(coalesce(metadata->>'internal_e2e','false'))) not in ('true','t','1','yes','on')
          and lower(btrim(coalesce(metadata->>'validation','false'))) not in ('true','t','1','yes','on')
          and lower(btrim(coalesce(metadata->>'test','false'))) not in ('true','t','1','yes','on')
        group by 1) t;
      v_sli_def:='executions (succeeded+failed, non-test) outcome; failures classified by jos_classify_failure';
    elsif s.service_key in ('action_bus','desktop_bridge','google_workspace') then
      select coalesce(jsonb_object_agg(cls,n),'{}'::jsonb) into v_breakdown from (
        select jair_os.jos_classify_failure(error) cls, count(*) n
        from jair_os.action_jobs
        where owner_id=s.owner_id and created_at>=ws and status='failed'
          and (s.service_key='action_bus'
               or (s.service_key='desktop_bridge' and connector='desktop_agent')
               or (s.service_key='google_workspace' and connector in ('google_workspace','google_calendar','gmail','google_classroom')))
          and lower(btrim(coalesce(metadata->>'validation','false'))) not in ('true','t','1','yes','on')
          and lower(btrim(coalesce(metadata->>'test','false'))) not in ('true','t','1','yes','on')
        group by 1) t;
      v_sli_def:='action_jobs (succeeded+failed, non-test) outcome; failures classified by jos_classify_failure';
    elsif s.service_key='database' then
      v_sli_def:='system_contract_test_runs pass rate (contract-suite health; NOT database availability/latency)';
    elsif s.service_key='agent_executor' then
      v_sli_def:='model_usage_ledger agent_execution/council calls';
    elsif s.service_key='telegram' then
      v_sli_def:='telegram_updates processed vs failed';
    end if;

    if v_breakdown is not null then
      v_gov_fail:=coalesce((v_breakdown->>'policy_or_approval_block')::bigint,0)
                 +coalesce((v_breakdown->>'quality_gate_rejected')::bigint,0)
                 +coalesce((v_breakdown->>'input_rejected')::bigint,0);
      v_svc_fail:=fail-v_gov_fail;
      v_eligible:=req-v_gov_fail;
      v_svc_avail:=case when v_eligible>0 then round(100*(v_eligible-v_svc_fail)::numeric/v_eligible,4) end;
    end if;
    v_min_sample:=case when s.max_error_rate_pct>0 then ceil(3/(s.max_error_rate_pct/100))::bigint end;

    if req=0 then
      avail:=null; err:=null; budget:=null; st:='no_data';
    else
      err:=round((fail::numeric/req)*100,4);
      avail:=round(100-err,4);
      if s.max_error_rate_pct<=0 then budget:=case when fail=0 then 100 else 0 end;
      else budget:=round(greatest(0,100-(err/s.max_error_rate_pct)*100),4); end if;
      st:=case when err>s.max_error_rate_pct then 'breached' when budget<30 then 'at_risk' else 'healthy' end;
    end if;

    insert into jair_os.service_slo_measurements(
      owner_id,service_key,window_start,window_end,request_count,failure_count,
      availability_pct,error_rate_pct,p95_latency_ms,error_budget_remaining_pct,status,metadata)
    values(
      s.owner_id,s.service_key,ws,we,req,fail,avail,err,p95,budget,st,
      jsonb_build_object(
        'target_availability_pct',s.target_availability_pct,
        'max_error_rate_pct',s.max_error_rate_pct,
        'target_p95_latency_ms',s.target_p95_latency_ms,
        'trace_id_convention','execution_id',
        'scope','production_only',
        'excluded_statuses',jsonb_build_array('cancelled'),
        'excluded_metadata_flags',jsonb_build_array('benchmark','internal_e2e','validation','test')
      ) || jsonb_strip_nulls(jsonb_build_object(
        'methodology_version','v2_classified_20261014',
        'headline_semantics','availability_pct/status = raw outcome (all failures count)',
        'sli_definition',v_sli_def,
        'failure_breakdown',v_breakdown,
        'governance_outcomes_excluded',v_gov_fail,
        'service_failures',v_svc_fail,
        'eligible_service_requests',v_eligible,
        'service_availability_pct',v_svc_avail,
        'min_sample_for_target_rule_of_three',v_min_sample,
        'sample_sufficient_for_target',case when v_min_sample is null then null else coalesce(v_eligible,req)>=v_min_sample end
      )));
    inserted_count:=inserted_count+1;
  end loop;
  return inserted_count;
end
$function$;

-- Reaper hardening: unsafe ::boolean casts replaced by tolerant text comparison
-- (same failure class that broke jair-os-slo-measure-every-15m on 2026-10-13).
-- Applied via replace() over the live definition so nothing else changes.
do $do$
declare d text; n text;
begin
  d := pg_get_functiondef('jair_os.jos_reap_stale_executions(integer)'::regprocedure);
  n := replace(replace(d,
        $a$coalesce((metadata->>'internal_e2e')::boolean,false)$a$,
        $b$lower(btrim(coalesce(metadata->>'internal_e2e','false'))) in ('true','t','1','yes','on')$b$),
        $a$coalesce((metadata->>'benchmark')::boolean,false)$a$,
        $b$lower(btrim(coalesce(metadata->>'benchmark','false'))) in ('true','t','1','yes','on')$b$);
  if n = d then raise exception 'reaper hardening: pattern not found, aborting'; end if;
  execute n;
end
$do$;
