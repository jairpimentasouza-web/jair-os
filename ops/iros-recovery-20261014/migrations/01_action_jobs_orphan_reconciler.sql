-- IROS recovery 2026-10-14 — Action Bus orphan/stale job reconciler.
-- Gap: executions can be closed (cancelled/failed/succeeded) by the execution
-- reapers while child action_jobs stay queued/dispatched/running forever.
-- This reconciler never marks anything as succeeded:
--   * never-dispatched jobs  -> cancelled (no external effect was possible)
--   * dispatched/running jobs -> failed + completion_unverified + readback alert
-- Jobs in 'blocked' (awaiting human approval), with a pending approval request
-- or with metadata.manual_hold=true are never touched.
-- Rollback: select cron.unschedule('jos-action-job-reconciler-15m');
--           drop function jair_os.jos_reconcile_orphan_action_jobs(integer,boolean);
--           (reconciled rows keep reconciled_from_status in metadata for audit)

create or replace function jair_os.jos_reconcile_orphan_action_jobs(p_limit integer default 50, p_dry_run boolean default true)
returns jsonb
language plpgsql
set search_path to 'pg_catalog', 'jair_os', 'public'
as $function$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 200));
  v_count integer := 0;
  v_ids jsonb := '[]'::jsonb;
begin
  if coalesce(p_dry_run, true) then
    select count(*), coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'status', c.status, 'reason', c.reason)), '[]'::jsonb)
      into v_count, v_ids
    from (
      select j.id, j.status,
             case
               when e.id is not null and e.status in ('cancelled', 'failed', 'succeeded') then 'parent_execution_terminal:' || e.status
               when j.status = 'queued' then 'expired_in_queue_72h'
               when j.status = 'dispatched' then 'stale_dispatch_48h'
               else 'stale_running_48h'
             end as reason
      from jair_os.action_jobs j
      left join jair_os.executions e on e.id = j.execution_id
      where j.status in ('queued', 'dispatched', 'running')
        and coalesce(j.metadata->>'manual_hold', 'false') <> 'true'
        and not exists (select 1 from jair_os.approval_requests a where a.id = j.approval_request_id and a.status = 'pending')
        and (
          (e.id is not null and e.status in ('cancelled', 'failed', 'succeeded') and coalesce(e.finished_at, e.updated_at) < now() - interval '1 hour' and j.updated_at < now() - interval '1 hour')
          or (j.status = 'queued' and j.dispatched_at is null and j.created_at < now() - interval '72 hours')
          or (j.status = 'dispatched' and j.started_at is null and coalesce(j.dispatched_at, j.created_at) < now() - interval '48 hours')
          or (j.status = 'running' and coalesce(j.started_at, j.created_at) < now() - interval '48 hours' and j.updated_at < now() - interval '48 hours')
        )
      order by j.created_at
      limit v_limit
    ) c;
    return jsonb_build_object('ok', true, 'dry_run', true, 'candidates', v_count, 'jobs', v_ids, 'evaluated_at', now());
  end if;

  with stale as (
    select j.id, j.status as prev_status, (j.dispatched_at is null and j.started_at is null) as never_dispatched,
           case
             when e.id is not null and e.status in ('cancelled', 'failed', 'succeeded') then 'parent_execution_terminal:' || e.status
             when j.status = 'queued' then 'expired_in_queue_72h'
             when j.status = 'dispatched' then 'stale_dispatch_48h'
             else 'stale_running_48h'
           end as reason
    from jair_os.action_jobs j
    left join jair_os.executions e on e.id = j.execution_id
    where j.status in ('queued', 'dispatched', 'running')
      and coalesce(j.metadata->>'manual_hold', 'false') <> 'true'
      and not exists (select 1 from jair_os.approval_requests a where a.id = j.approval_request_id and a.status = 'pending')
      and (
        (e.id is not null and e.status in ('cancelled', 'failed', 'succeeded') and coalesce(e.finished_at, e.updated_at) < now() - interval '1 hour' and j.updated_at < now() - interval '1 hour')
        or (j.status = 'queued' and j.dispatched_at is null and j.created_at < now() - interval '72 hours')
        or (j.status = 'dispatched' and j.started_at is null and coalesce(j.dispatched_at, j.created_at) < now() - interval '48 hours')
        or (j.status = 'running' and coalesce(j.started_at, j.created_at) < now() - interval '48 hours' and j.updated_at < now() - interval '48 hours')
      )
    order by j.created_at
    limit v_limit
    for update of j skip locked
  ),
  repaired as (
    update jair_os.action_jobs j
       set status = case when s.never_dispatched then 'cancelled' else 'failed' end,
           finished_at = coalesce(j.finished_at, now()),
           error = coalesce(nullif(j.error, ''),
                     case when s.never_dispatched
                          then 'reconciled: ' || s.reason || ' (never dispatched; no external effect possible)'
                          else 'reconciled: ' || s.reason || ' (completion unverified; check destination before retry)' end),
           metadata = coalesce(j.metadata, '{}'::jsonb) || jsonb_build_object(
             'reconciled_from_status', s.prev_status,
             'reconcile_reason', s.reason,
             'reconciled_at', now(),
             'reconciler', 'jos_reconcile_orphan_action_jobs',
             'completion_unverified', not s.never_dispatched,
             'destination_readback_required', not s.never_dispatched,
             'automatic_retry_blocked', true),
           updated_at = now()
      from stale s
     where j.id = s.id and j.status = s.prev_status
    returning j.id, j.owner_id, j.execution_id, j.connector, j.action_key, s.prev_status, s.reason, s.never_dispatched
  ),
  audit as (
    insert into jair_os.audit_events(owner_id, execution_id, event_type, severity, message, payload)
    select r.owner_id, r.execution_id, 'orphan_action_job_reconciled',
           case when r.never_dispatched then 'info' else 'warning' end,
           case when r.never_dispatched then 'Never-dispatched action job cancelled by reconciler'
                else 'Stale action job marked failed, NOT verified at external destination' end,
           jsonb_build_object('action_job_id', r.id, 'connector', r.connector, 'action_key', r.action_key,
                              'previous_status', r.prev_status, 'reason', r.reason,
                              'requires_destination_readback', not r.never_dispatched)
    from repaired r
    returning (payload->>'action_job_id')::uuid as id
  ),
  alerts as (
    insert into jair_os.observability_alerts(owner_id, alert_key, severity, status, entity_type, entity_id, message, details, detected_at)
    select r.owner_id, 'action_job_readback_required:' || r.id::text, 'warning', 'open', 'action_job', r.id,
           'Action job closed as unverified; external readback required before retry',
           jsonb_build_object('connector', r.connector, 'action_key', r.action_key, 'previous_status', r.prev_status,
                              'reason', r.reason, 'external_side_effects_unknown', true, 'automatic_retry_blocked', true),
           now()
    from repaired r
    where not r.never_dispatched
    on conflict (owner_id, alert_key, status)
    do update set severity = excluded.severity, message = excluded.message, details = excluded.details, detected_at = excluded.detected_at
    returning id
  )
  select count(*), coalesce(jsonb_agg(a.id), '[]'::jsonb) into v_count, v_ids from audit a;
  return jsonb_build_object('ok', true, 'dry_run', false, 'reconciled', v_count, 'action_job_ids', v_ids, 'at', now());
end;
$function$;

revoke all on function jair_os.jos_reconcile_orphan_action_jobs(integer, boolean) from public, anon, authenticated;

comment on function jair_os.jos_reconcile_orphan_action_jobs(integer, boolean) is
  'IROS recovery 2026-10-14: closes orphan/stale action_jobs honestly (cancelled if never dispatched, failed+unverified otherwise). Never marks success. Dry-run by default.';

-- Scheduled (cron job 103):
-- select cron.schedule('jos-action-job-reconciler-15m', '13,28,43,58 * * * *', $$select jair_os.jos_reconcile_orphan_action_jobs(100, false);$$);
