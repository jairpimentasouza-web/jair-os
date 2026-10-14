-- IROS recovery 2026-10-14 — pg_net privilege remediation (FOR ADMINISTRATIVE REVIEW).
-- Must run as supabase_admin (owner/grantor of schema net and its functions);
-- postgres has USAGE without grant option, so it cannot revoke these grants.
--
-- Finding: schema net (pg_net) grants USAGE to PUBLIC/anon/authenticated and its
-- 12 functions grant EXECUTE to PUBLIC (grantor supabase_admin). Any path that
-- runs SQL as anon/authenticated could issue outbound HTTP (SSRF class risk).
--
-- Dependency analysis (2026-10-14, Claude Code session): every call site of
-- net.http_get/http_post/http_delete in non-system schemas is either a
-- SECURITY DEFINER function or a pg_cron job running as postgres. No
-- SECURITY INVOKER function and no trigger executed as an API role calls pg_net.
-- => revoking from PUBLIC/anon/authenticated does not break IROS jobs.
--
-- Rollback: grant usage on schema net to public;
--           grant execute on all functions in schema net to public;

begin;
revoke execute on all functions in schema net from public, anon, authenticated;
revoke usage on schema net from public, anon, authenticated;
-- keep the roles that legitimately call pg_net
grant usage on schema net to postgres, service_role, supabase_functions_admin;
grant execute on all functions in schema net to postgres, service_role, supabase_functions_admin;
commit;

-- Verification (expect false/false for anon and authenticated):
-- select r, has_schema_privilege(r,'net','USAGE'), has_function_privilege(r,'net.http_post(text,jsonb,jsonb,jsonb,integer)','EXECUTE')
-- from unnest(array['anon','authenticated','service_role','postgres']) r;
-- Then: select jair_os.run_security_hardening_contract_tests_v2();  -- pg_net_client_executable_functions should pass

-- pg_net in schema public (lint 0014): pg_net does not support ALTER EXTENSION ... SET SCHEMA;
-- moving it means drop/recreate (in-flight requests lost, cron jobs fail during the window).
-- Recommended only in a maintenance window, after the revoke above, following Supabase guidance.
