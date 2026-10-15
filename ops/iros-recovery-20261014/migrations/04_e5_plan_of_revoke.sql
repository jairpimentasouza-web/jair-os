-- IROS recovery 2026-10-15 — e5_plan_of: remove direct RPC access (approved: "Aprovo tudo").
-- e5_plan_of(uuid) returned the plan of ANY workspace by UUID without a membership check.
-- All 6 callers (e5_guard_child, e5_guard_company, e5_invite_member, e5_my_overview,
-- e5_admin_overview, e5_admin_list_workspaces) are SECURITY DEFINER owned by postgres,
-- so they keep working. E5 had 0 workspaces and 0 RPC calls since 2026-08-31.
-- Rollback: grant execute on function public.e5_plan_of(uuid) to authenticated;
revoke execute on function public.e5_plan_of(uuid) from public, anon, authenticated;
