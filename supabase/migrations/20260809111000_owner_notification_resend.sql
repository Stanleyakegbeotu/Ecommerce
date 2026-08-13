-- An owner may deliberately resend an already delivered operational email for
-- verification or recovery. Automatic delivery remains idempotent per record.
create or replace function public.requeue_sent_notification_event(p_job_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.notification_event_jobs
  set status = 'queued',
      sent_at = null,
      locked_at = null,
      next_attempt_at = now(),
      last_error = 'owner_manual_resend_requested'
  where id = p_job_id and status = 'sent' and attempt_count < 5;
  return found;
end;
$$;

revoke all on function public.requeue_sent_notification_event(uuid) from public, anon, authenticated;
grant execute on function public.requeue_sent_notification_event(uuid) to service_role;
