create or replace function public.retry_failed_notification_event(p_job_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.notification_event_jobs
  set status = 'retrying', next_attempt_at = now(), locked_at = null, last_error = null
  where id = p_job_id and status = 'failed';
  return found;
end;
$$;

revoke all on function public.retry_failed_notification_event(uuid) from public, anon, authenticated;
grant execute on function public.retry_failed_notification_event(uuid) to service_role;
