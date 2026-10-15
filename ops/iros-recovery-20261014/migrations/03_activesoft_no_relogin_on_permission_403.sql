-- IROS recovery 2026-10-14 — ActiveSoft adapter: no forced re-login on permission 403.
-- Approved by the owner ("Aprovo tudo", Claude Code chat, 2026-10-14). Applied while the
-- adapter was idle (last iros.activesoft.* activity 13:20:26Z).
--
-- Defect: jair_os.iros_activesoft_exec forced a fresh teacher login (iros_as_session(true))
-- on every 401 OR 403, in two places (generic api.read path and classes.read turmas path).
-- A 403 on a specific endpoint is a permission denial, not an expired session: 15 logins on
-- 2026-10-14, ~9 triggered by 403s → lockout risk on the school portal.
-- DRF SessionAuthentication can also answer 403 for an expired session, so on 403 we probe
-- the known-good endpoint with the current cookie and only re-login if that probe fails.
-- 401 keeps re-logging in as before.
--
-- Rollback (exact previous definition stored server-side):
--   do $$ begin execute (select evidence->>'rollback_sql' from jair_os.release_change_ledger
--     where id='947685bc-f7c6-442d-a10a-1ed4638231f0'); end $$;

do $do$
declare d text; n text;
  old_cond text := $o$IF coalesce((v_a->>'status')::int,0) IN (401,403) THEN$o$;
  new_cond text := $n$IF coalesce((v_a->>'status')::int,0) = 401 OR (coalesce((v_a->>'status')::int,0) = 403 AND coalesce((jair_os.iros_as_api(v_cookie,'GET','/api/v1/fields/select/periodo/')->>'status')::int,0) <> 200) THEN$n$;
  occurrences int;
begin
  d := pg_get_functiondef('jair_os.iros_activesoft_exec(text,jsonb,uuid)'::regprocedure);
  occurrences := (length(d) - length(replace(d, old_cond, ''))) / length(old_cond);
  if occurrences <> 2 then
    raise exception 'expected 2 re-login conditions, found %; function changed since review — aborting', occurrences;
  end if;
  n := replace(d, old_cond, new_cond);
  execute n;
end
$do$;
