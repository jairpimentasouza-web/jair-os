-- IROS recovery 2026-10-14 — PENDING (not applied): ActiveSoft adapter re-login storm on HTTP 403.
-- Status: prepared by the Claude Code session; NOT applied because a concurrent ChatGPT
-- session was actively exercising jair_os.iros_activesoft_exec at 13:11–13:14 UTC.
-- Apply only when no other session is using the ActiveSoft adapter.
--
-- Defect: iros_activesoft_exec forces a fresh teacher login (iros_as_session(true)) on every
-- 401 OR 403. A 403 on a specific endpoint (e.g. fields/select/turma_aluno_avaliacao) is a
-- permission denial, not an expired session. Evidence (audit_events 2026-10-14): 15 logins,
-- ~9 triggered by 403s (08h 5/4, 10h 3/2, 13h 4/3). Repeated logins on the school portal
-- risk account lockout / security flags at the school.
-- DRF SessionAuthentication can also answer 403 for an expired session, so on 403 we first
-- probe the known-good endpoint with the current cookie and only re-login if that probe fails.
--
-- Rollback: re-apply the previous definition (pg_get_functiondef captured before applying).

do $do$
declare d text; n text;
  old_block text := $o$IF coalesce((v_a->>'status')::int,0) IN (401,403) THEN
    v_cookie := jair_os.iros_as_session(true);
    v_a := jair_os.iros_as_api(v_cookie,'GET',v_path);
  END IF;$o$;
  new_block text := $n$IF coalesce((v_a->>'status')::int,0) = 401
     OR (coalesce((v_a->>'status')::int,0) = 403
         AND coalesce((jair_os.iros_as_api(v_cookie,'GET','/api/v1/fields/select/periodo/')->>'status')::int,0) <> 200) THEN
    v_cookie := jair_os.iros_as_session(true);
    v_a := jair_os.iros_as_api(v_cookie,'GET',v_path);
  END IF;$n$;
begin
  d := pg_get_functiondef('jair_os.iros_activesoft_exec(text,jsonb,uuid)'::regprocedure);
  if position(old_block in d) = 0 then raise exception 'pattern not found; function changed since 2026-10-14 review'; end if;
  n := replace(d, old_block, new_block);
  execute n;
end
$do$;

-- Verification after applying (read-only, uses existing cached session):
--   select jair_os.iros_activesoft_exec('api.read', jsonb_build_object('path','/api/v1/fields/select/turma_aluno_avaliacao/?turma=102&disciplina=11&fase_nota=508'));
--   -> expect http 403 and NO new 'iros.activesoft.session.login' audit event.
