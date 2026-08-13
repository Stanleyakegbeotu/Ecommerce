-- Tighten function execution and make trigger search paths explicit.

alter function public.set_customer_feedback_updated_at() set search_path = public;
alter function public.set_updated_at() set search_path = public;

revoke execute on function public.record_customer_feedback_activity() from public, anon, authenticated;
grant execute on function public.record_customer_feedback_activity() to service_role;

-- This project-level event-trigger helper runs as part of database DDL. It is
-- not an application RPC and must not be callable by browser roles.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
